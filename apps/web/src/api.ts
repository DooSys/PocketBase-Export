export type Collection = {
  columns: number;
  id: string;
  name: string;
  system: boolean;
  type: string;
};

export type CollectionStats = {
  lastUpdated: string | null;
  totalItems: number;
};

export type LoginResponse = {
  authCollection: string;
  authMode: AuthMode;
  pbUrl: string;
  record: {
    email: string;
    id: string;
  };
  token: string;
};

export type AuthMode = "superuser" | "apiUser";

export type ExportOptions = {
  collection: string;
  expand: string;
  fields: string;
  filter: string;
  format: "json" | "csv" | "xlsx";
  perPage: number;
  sort: string;
  zip: boolean;
};

export async function login(
  pbUrl: string,
  authMode: AuthMode,
  authCollection: string,
  identity: string,
  password: string
): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/api/auth/login", {
    body: JSON.stringify({ authCollection, authMode, identity, password, pbUrl }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
}

export async function fetchCollections(token: string, pbUrl: string): Promise<Collection[]> {
  return requestJson<Collection[]>("/api/collections", {
    headers: authHeaders(token, pbUrl)
  });
}

export async function fetchCollectionStats(token: string, pbUrl: string, collection: string): Promise<CollectionStats> {
  return requestJson<CollectionStats>(`/api/collections/${encodeURIComponent(collection)}/stats`, {
    headers: authHeaders(token, pbUrl)
  });
}

export async function downloadExport(token: string, pbUrl: string, options: ExportOptions): Promise<void> {
  const params = new URLSearchParams({
    format: options.format,
    perPage: String(options.perPage),
    zip: String(options.zip)
  });

  for (const key of ["expand", "fields", "filter", "sort"] as const) {
    if (options[key]) {
      params.set(key, options[key]);
    }
  }

  const response = await fetch(`/api/export/${encodeURIComponent(options.collection)}?${params}`, {
    headers: authHeaders(token, pbUrl)
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getDownloadFilename(response, options);
  anchor.click();
  URL.revokeObjectURL(url);
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json() as Promise<T>;
}

function authHeaders(token: string, pbUrl: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "X-PocketBase-Url": pbUrl
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function getDownloadFilename(response: Response, options: ExportOptions): string {
  const contentDisposition = response.headers.get("Content-Disposition");
  const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1];

  if (filename) {
    return filename;
  }

  return options.zip ? `${options.collection}_${options.format}.zip` : `${options.collection}.${options.format}`;
}
