import { getDatabaseBackend, getRuntimeDatabase } from "@/server/db/runtime";

type HealthRow = {
  id: string;
  backend: string;
  created_at: string;
};

export async function GET() {
  const database = await getRuntimeDatabase();
  const probeId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const backend = getDatabaseBackend();

  await database.exec(`
    CREATE TABLE IF NOT EXISTS db_health_checks (
      id TEXT PRIMARY KEY,
      backend TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await database.run(
    `
      INSERT INTO db_health_checks (id, backend, created_at)
      VALUES (?, ?, ?)
    `,
    [probeId, backend, createdAt],
  );

  const probe = await database.first<HealthRow>(
    `
      SELECT id, backend, created_at
      FROM db_health_checks
      WHERE id = ?
    `,
    [probeId],
  );

  return Response.json({
    ok: probe?.id === probeId,
    backend,
    persisted: probe?.id === probeId,
    probe,
  });
}
