import { getAuthDatabase as getCloudflareDatabase } from "./cloudflare";

export type SqlValue = string | number | null;

export type SqlDatabase = {
  exec(sql: string): Promise<void>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
};

export type DatabaseBackend = "cloudflare-d1" | "local-sqlite";

let localDatabasePromise: Promise<SqlDatabase> | null = null;

async function getLocalDatabase(): Promise<SqlDatabase> {
  if (!localDatabasePromise) {
    localDatabasePromise = import("./sqlite").then((mod) => mod.getLocalSqliteDatabase());
  }

  return localDatabasePromise;
}

export async function getRuntimeDatabase(): Promise<SqlDatabase> {
  const cloudflareDatabase = getCloudflareDatabase();

  if (cloudflareDatabase) {
    return cloudflareDatabase;
  }

  return getLocalDatabase();
}

export function getDatabaseBackend(): DatabaseBackend {
  return getCloudflareDatabase() ? "cloudflare-d1" : "local-sqlite";
}
