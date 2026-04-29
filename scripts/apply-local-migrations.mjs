import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import { DatabaseSync } from "node:sqlite";

const projectRoot = cwd();
const migrationsDir = join(projectRoot, "server", "db", "migrations");
const databasePath = join(projectRoot, ".data", "hereit.sqlite");

mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);

database.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )
`);

const migrationFiles = readdirSync(migrationsDir)
  .filter((entry) => entry.endsWith(".sql"))
  .sort();

for (const migrationFile of migrationFiles) {
  const alreadyApplied = database
    .prepare(
      `
        SELECT name
        FROM schema_migrations
        WHERE name = ?
      `,
    )
    .get(migrationFile);

  if (alreadyApplied) {
    console.log(`skipped ${migrationFile}`);
    continue;
  }

  const sql = readFileSync(join(migrationsDir, migrationFile), "utf8");
  const appliedAt = new Date().toISOString();

  database.exec("BEGIN");

  try {
    database.exec(sql);
    database
      .prepare(
        `
          INSERT INTO schema_migrations (name, applied_at)
          VALUES (?, ?)
        `,
      )
      .run(migrationFile, appliedAt);
    database.exec("COMMIT");
    console.log(`applied ${migrationFile}`);
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

database.close();

console.log(`local sqlite ready at ${databasePath}`);
