import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import { DatabaseSync } from "node:sqlite";
import type { SqlDatabase, SqlValue } from "./runtime";

const localDbPath = join(cwd(), ".data", "hereit.sqlite");

let sqliteDatabase: SqlDatabase | null = null;

function ensureDatabaseFile() {
  mkdirSync(dirname(localDbPath), { recursive: true });
}

export async function getLocalSqliteDatabase(): Promise<SqlDatabase> {
  if (sqliteDatabase) {
    return sqliteDatabase;
  }

  ensureDatabaseFile();

  const database = new DatabaseSync(localDbPath);

  sqliteDatabase = {
    async exec(sql: string) {
      database.exec(sql);
    },
    async first<T>(sql: string, params: SqlValue[] = []) {
      const statement = database.prepare(sql);
      const row = statement.get(...params);
      return (row as T | undefined) ?? null;
    },
    async all<T>(sql: string, params: SqlValue[] = []) {
      const statement = database.prepare(sql);
      return statement.all(...params) as T[];
    },
    async run(sql: string, params: SqlValue[] = []) {
      const statement = database.prepare(sql);
      statement.run(...params);
    },
  };

  return sqliteDatabase;
}
