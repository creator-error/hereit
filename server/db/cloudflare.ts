import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SqlDatabase, SqlValue } from "./runtime";

export type D1StatementLike = {
  bind(...values: unknown[]): D1StatementLike;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};

export type D1DatabaseLike = {
  prepare(query: string): D1StatementLike;
};

type CloudflareEnvWithDb = {
  DB?: D1DatabaseLike;
};

export function getAuthDatabase(): SqlDatabase | null {
  const { env } = getCloudflareContext();
  const db = (env as CloudflareEnvWithDb).DB;

  if (!db) {
    return null;
  }

  return {
    async exec(sql: string) {
      await db.prepare(sql).run();
    },
    async first<T>(sql: string, params: SqlValue[] = []) {
      return db.prepare(sql).bind(...params).first<T>();
    },
    async all<T>(sql: string, params: SqlValue[] = []) {
      const result = await db.prepare(sql).bind(...params).all<T>();
      return result.results ?? [];
    },
    async run(sql: string, params: SqlValue[] = []) {
      await db.prepare(sql).bind(...params).run();
    },
  };
}
