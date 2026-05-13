export type AppConfig = {
  connectTimeoutMs: number;
  corsOrigin: string;
  isProduction: boolean;
  pbUrl: string;
  port: number;
  requestTimeoutMs: number;
};

export function loadConfig(): AppConfig {
  return {
    connectTimeoutMs: Number(process.env.PB_CONNECT_TIMEOUT_MS ?? 30000),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://127.0.0.1:5173",
    isProduction: process.env.NODE_ENV === "production",
    pbUrl: process.env.PB_URL ?? "http://127.0.0.1:8090",
    port: Number(process.env.API_PORT ?? process.env.PORT ?? 3000),
    requestTimeoutMs: Number(process.env.PB_REQUEST_TIMEOUT_MS ?? 45000)
  };
}
