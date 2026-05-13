import PocketBase from "pocketbase";
import { Agent, fetch as undiciFetch } from "undici";

const requestTimeoutMs = Number(process.env.PB_REQUEST_TIMEOUT_MS ?? 45000);
const connectTimeoutMs = Number(process.env.PB_CONNECT_TIMEOUT_MS ?? 30000);
const dispatcher = new Agent({
  bodyTimeout: requestTimeoutMs,
  connect: {
    timeout: connectTimeoutMs
  },
  headersTimeout: requestTimeoutMs
});

export function createPocketBaseClient(pbUrl: string, token?: string): PocketBase {
  const pb = new PocketBase(pbUrl);
  pb.autoCancellation(false);
  pb.beforeSend = (url, options) => ({
    options: {
      ...options,
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        undiciFetch(input as Parameters<typeof undiciFetch>[0], {
          ...(init as Parameters<typeof undiciFetch>[1]),
          dispatcher,
          signal: init?.signal ?? AbortSignal.timeout(requestTimeoutMs)
        }) as unknown as Promise<Response>
    },
    url
  });

  if (token) {
    pb.authStore.save(token, null);
  }

  return pb;
}

export function readBearerToken(authorizationHeader?: string): string | undefined {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

export function readPocketBaseUrl(headerValue: string | string[] | undefined, fallbackUrl: string): string {
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!value) {
    return fallbackUrl;
  }

  return normalizePocketBaseUrl(value);
}

export function normalizePocketBaseUrl(value: string): string {
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("PocketBase URL must use http or https.");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}
