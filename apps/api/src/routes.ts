import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { toCsv } from "./export/csv.js";
import { getAllRecords } from "./export/records.js";
import { toXlsx } from "./export/xlsx.js";
import { toZip } from "./export/zip.js";
import { createPocketBaseClient, normalizePocketBaseUrl, readBearerToken, readPocketBaseUrl } from "./pocketbase.js";

type ProxyError = Error & {
  data?: unknown;
  cause?: { message?: string };
  originalError?: {
    cause?: { message?: string };
    message?: string;
  };
  response?: {
    data?: unknown;
    message?: string;
  };
  status?: number;
  statusCode?: number;
  toJSON?: () => unknown;
};

const loginSchema = z.object({
  authCollection: z.string().min(1).optional(),
  authMode: z.enum(["superuser", "apiUser"]).default("superuser"),
  identity: z.string().min(1),
  password: z.string().min(1),
  pbUrl: z.string().url().optional()
});

const exportQuerySchema = z.object({
  expand: z.string().optional(),
  fields: z.string().optional(),
  filter: z.string().optional(),
  format: z.enum(["json", "csv", "xlsx"]).default("json"),
  perPage: z.coerce.number().int().min(1).max(500).default(200),
  sort: z.string().optional(),
  zip: z
    .preprocess((value) => {
      if (typeof value === "string") {
        return value.toLowerCase() === "true";
      }

      return value;
    }, z.boolean())
    .default(false)
});

export function registerRoutes(app: FastifyInstance, pbUrl: string): void {
  app.setErrorHandler((error, _request, reply) => {
    const proxyError = error as ProxyError;
    const message = getErrorMessage(proxyError);

    if (/fetch failed|timeout|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(message)) {
      return reply.code(502).send({
        message: `PocketBase unreachable: ${message}`
      });
    }

    return reply.code(proxyError.statusCode ?? 500).send({
      message
    });
  });

  app.get("/health", async () => ({
    ok: true,
    pbUrl
  }));

  app.post("/api/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const authCollection = body.authMode === "superuser" ? "_superusers" : body.authCollection;

    if (!authCollection) {
      return reply.code(400).send({ message: "Missing auth collection for API user mode" });
    }

    const targetPbUrl = body.pbUrl ? normalizePocketBaseUrl(body.pbUrl) : pbUrl;
    const pb = createPocketBaseClient(targetPbUrl);
    const auth = await pb.collection(authCollection).authWithPassword(body.identity, body.password);

    return reply.send({
      authCollection,
      authMode: body.authMode,
      pbUrl: targetPbUrl,
      record: {
        email: auth.record.email,
        id: auth.record.id
      },
      token: auth.token
    });
  });

  app.get("/api/collections", async (request, reply) => {
    const token = readBearerToken(request.headers.authorization);

    if (!token) {
      return reply.code(401).send({ message: "Missing bearer token" });
    }

    const targetPbUrl = readPocketBaseUrl(request.headers["x-pocketbase-url"], pbUrl);
    const pb = createPocketBaseClient(targetPbUrl, token);
    const collections = await pb.collections.getFullList({
      sort: "name"
    });

    return collections.map((collection) => ({
      columns: Array.isArray((collection as { fields?: unknown }).fields) ? (collection as { fields: unknown[] }).fields.length : 0,
      id: collection.id,
      name: collection.name,
      system: collection.system,
      type: collection.type
    }));
  });

  app.get("/api/collections/:collection/stats", async (request, reply) => {
    const token = readBearerToken(request.headers.authorization);

    if (!token) {
      return reply.code(401).send({ message: "Missing bearer token" });
    }

    const params = request.params as { collection: string };
    const targetPbUrl = readPocketBaseUrl(request.headers["x-pocketbase-url"], pbUrl);
    const pb = createPocketBaseClient(targetPbUrl, token);
    const records = await pb.collection(params.collection).getList(1, 1, {
      fields: "id,updated,created",
      sort: "-updated"
    });

    return {
      lastUpdated: records.items[0]?.updated ?? records.items[0]?.created ?? null,
      totalItems: records.totalItems
    };
  });

  app.get("/api/export/:collection", async (request, reply) => {
    const token = readBearerToken(request.headers.authorization);

    if (!token) {
      return reply.code(401).send({ message: "Missing bearer token" });
    }

    const params = request.params as { collection: string };
    const query = exportQuerySchema.parse(request.query);
    const targetPbUrl = readPocketBaseUrl(request.headers["x-pocketbase-url"], pbUrl);
    const pb = createPocketBaseClient(targetPbUrl, token);
    const records = await getAllRecords(pb, {
      collection: params.collection,
      expand: query.expand,
      fields: query.fields,
      filter: query.filter,
      perPage: query.perPage,
      sort: query.sort
    });

    const timestamp = createExportTimestamp();
    const filename = `${params.collection}_${timestamp}.${query.format}`;
    const outputFilename = query.zip ? `${params.collection}_${timestamp}_${query.format}.zip` : filename;
    reply.header("Content-Disposition", `attachment; filename="${outputFilename}"`);

    if (query.format === "csv") {
      const csv = toCsv(records);

      if (query.zip) {
        return reply.type("application/zip").send(await toZip(filename, csv));
      }

      return reply.type("text/csv; charset=utf-8").send(csv);
    }

    if (query.format === "xlsx") {
      const workbook = await toXlsx(records, params.collection);

      if (query.zip) {
        return reply.type("application/zip").send(await toZip(filename, workbook));
      }

      return reply
        .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .send(workbook);
    }

    const json = JSON.stringify(records, null, 2);

    if (query.zip) {
      return reply.type("application/zip").send(await toZip(filename, json));
    }

    return reply.type("application/json; charset=utf-8").send(json);
  });
}

function createExportTimestamp(): string {
  return new Date().toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}Z$/, "");
}

function getErrorMessage(error: ProxyError): string {
  const json = safeJson(error);
  const jsonMessage = findMessage(json);

  return (
    error.cause?.message ??
    error.originalError?.cause?.message ??
    error.originalError?.message ??
    error.response?.message ??
    jsonMessage ??
    error.message
  );
}

function safeJson(error: ProxyError): unknown {
  try {
    return error.toJSON?.();
  } catch {
    return undefined;
  }
}

function findMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const message = record.message;

  if (typeof message === "string" && message !== "Something went wrong while processing your request.") {
    return message;
  }

  for (const child of Object.values(record)) {
    const childMessage = findMessage(child);

    if (childMessage) {
      return childMessage;
    }
  }

  return typeof message === "string" ? message : undefined;
}
