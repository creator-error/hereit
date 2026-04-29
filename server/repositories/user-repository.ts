import { normalizeRole, sortRoles } from "@/features/admin/roles";
import { getRuntimeDatabase } from "@/server/db/runtime";
import { validateAssetInput } from "@/server/uploads/validation";

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AppUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

export type AppUserOrganizationMembership = {
  organizationId: string;
  organizationName: string;
  role: string;
};

export type AppUserDirectoryEntry = AppUser & {
  organizations: AppUserOrganizationMembership[];
};

export type AppSceneSummary = {
  id: string;
  organizationId: string;
  organizationName?: string;
  name: string;
  description: string | null;
  shared: boolean;
  roomPlyUrl: string | null;
  roomGlbUrl: string | null;
};

export type AppAudioPlacement = {
  id: string;
  sceneId: string;
  audioFileId: string;
  name: string | null;
  url: string;
  originalFilename: string | null;
  mimeType: string | null;
  byteSize: number | null;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  gain: number;
  loop: boolean;
};

export type AppOrganizationSummary = {
  id: string;
  name: string;
  description: string | null;
  membersCount: number;
  removable: boolean;
  scenes: AppSceneSummary[];
};

export type SceneAccessActor = {
  userId: string;
  roles: string[];
} | null;

export type SceneAccessHint = {
  exists: boolean;
  shared: boolean;
};

export type ManageableOrganizationOption = {
  id: string;
  name: string;
};

export type OrganizationCatalogEntry = {
  id: string;
  name: string;
  description: string | null;
};

type UpsertGoogleUserInput = {
  googleSub: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

const SHORT_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DEFAULT_SHORT_ID_LENGTH = 12;

const createUsersTableSql = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const createUsersEmailIndexSql = `
  CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON users (lower(email))
  WHERE email IS NOT NULL
`;

const createAuthIdentitiesTableSql = `
  CREATE TABLE IF NOT EXISTS auth_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_email TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

const createAuthIdentitiesUniqueIndexSql = `
  CREATE UNIQUE INDEX IF NOT EXISTS auth_identities_provider_subject_unique_idx
  ON auth_identities (provider, provider_user_id)
`;

const createUserRolesTableSql = `
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, role),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

const createOrganizationsTableSql = `
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const createOrganizationMembershipsTableSql = `
  CREATE TABLE IF NOT EXISTS organization_memberships (
    user_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, organization_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  )
`;

const createScenesTableSql = `
  CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    shared INTEGER NOT NULL DEFAULT 0,
    room_ply_url TEXT,
    room_glb_url TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`;

const createScenesOrganizationIndexSql = `
  CREATE INDEX IF NOT EXISTS scenes_organization_id_idx
  ON scenes (organization_id)
`;

const createAssetsTableSql = `
  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    url TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT,
    byte_size INTEGER,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`;

const createAssetsSceneKindIndexSql = `
  CREATE INDEX IF NOT EXISTS assets_scene_kind_idx
  ON assets (scene_id, kind)
`;

const createAudioFilesTableSql = `
  CREATE TABLE IF NOT EXISTS audio_files (
    id TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL,
    url TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT,
    byte_size INTEGER,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`;

const createAudioFilesSceneIndexSql = `
  CREATE INDEX IF NOT EXISTS audio_files_scene_idx
  ON audio_files (scene_id)
`;

const createAudioPlacementsTableSql = `
  CREATE TABLE IF NOT EXISTS audio_placements (
    id TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL,
    audio_file_id TEXT NOT NULL,
    name TEXT,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    position_z REAL NOT NULL,
    rotation_x REAL NOT NULL DEFAULT 0,
    rotation_y REAL NOT NULL DEFAULT 0,
    rotation_z REAL NOT NULL DEFAULT 0,
    gain REAL NOT NULL DEFAULT 1,
    loop_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (audio_file_id) REFERENCES audio_files(id) ON DELETE CASCADE
  )
`;

const createAudioPlacementsSceneIndexSql = `
  CREATE INDEX IF NOT EXISTS audio_placements_scene_idx
  ON audio_placements (scene_id)
`;

type UserRoleRow = {
  role: string;
};

type TableColumnRow = {
  name: string;
};

type UserListRow = UserRow & {
  roles: string | null;
};

type OrganizationMembershipRow = {
  user_id: string;
  organization_id: string;
  organization_name: string;
  role: string | null;
};

type AudioPlacementRow = {
  id: string;
  scene_id: string;
  audio_file_id: string;
  name: string | null;
  url: string;
  original_filename: string | null;
  mime_type: string | null;
  byte_size: number | null;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  gain: number;
  loop_enabled: number;
};

type OrganizationSummaryRow = {
  id: string;
  name: string;
  description: string | null;
  members_count: number;
};

type SceneSummaryRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  shared: number;
  room_ply_url: string | null;
  room_glb_url: string | null;
};

function normalizeUser(row: UserRow, roles: string[]): AppUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    roles: sortRoles(roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureColumnExists(tableName: string, columnName: string, definition: string) {
  const db = await getRuntimeDatabase();
  const columns = await db.all<TableColumnRow>(`PRAGMA table_info(${tableName})`);

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function ensureAuthSchema() {
  const db = await getRuntimeDatabase();
  await db.exec(createUsersTableSql);
  await db.exec(createUsersEmailIndexSql);
  await db.exec(createAuthIdentitiesTableSql);
  await db.exec(createAuthIdentitiesUniqueIndexSql);
  await db.exec(createUserRolesTableSql);
  await db.exec(createOrganizationsTableSql);
  await db.exec(createOrganizationMembershipsTableSql);
  await db.exec(createScenesTableSql);
  await db.exec(createScenesOrganizationIndexSql);
  await db.exec(createAssetsTableSql);
  await db.exec(createAssetsSceneKindIndexSql);
  await db.exec(createAudioFilesTableSql);
  await db.exec(createAudioFilesSceneIndexSql);
  await db.exec(createAudioPlacementsTableSql);
  await db.exec(createAudioPlacementsSceneIndexSql);
  await ensureColumnExists("organization_memberships", "role", "TEXT NOT NULL DEFAULT 'viewer'");
  await ensureColumnExists("scenes", "shared", "INTEGER NOT NULL DEFAULT 0");
  await db.run("UPDATE organization_memberships SET role = 'viewer' WHERE role IS NULL");
  await db.run("UPDATE scenes SET shared = 0 WHERE shared IS NULL");

  return db;
}

function createShortId(length = DEFAULT_SHORT_ID_LENGTH): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(randomBytes, (byte) => SHORT_ID_ALPHABET[byte % SHORT_ID_ALPHABET.length]).join("");
}

async function generateUniqueShortId(
  exists: (candidate: string) => Promise<boolean>,
  length = DEFAULT_SHORT_ID_LENGTH,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = createShortId(length);

    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  throw new Error("Could not allocate unique short id");
}

export function generateShortId(length = DEFAULT_SHORT_ID_LENGTH): string {
  return createShortId(length);
}

export async function createUniqueSceneId(): Promise<string> {
  const db = await ensureAuthSchema();
  return generateUniqueShortId(async (candidate) => {
    const existing = await db.first<{ id: string }>(
      `
        SELECT id
        FROM scenes
        WHERE id = ?
        LIMIT 1
      `,
      [candidate],
    );

    return Boolean(existing);
  });
}

async function getUserRowById(userId: string): Promise<UserRow | null> {
  const db = await ensureAuthSchema();
  return db.first<UserRow>(
    `
      SELECT id, email, display_name, avatar_url, created_at, updated_at
      FROM users
      WHERE id = ?
    `,
    [userId],
  );
}

async function findExistingUser(
  provider: string,
  googleSub: string,
  email: string,
): Promise<UserRow | null> {
  const db = await ensureAuthSchema();

  const existingUser = await db
    .first<UserRow>(
      `
        SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at, u.updated_at
        FROM users u
        LEFT JOIN auth_identities ai
          ON ai.user_id = u.id
        WHERE (ai.provider = ? AND ai.provider_user_id = ?)
          OR lower(u.email) = lower(?)
        LIMIT 1
      `,
      [provider, googleSub, email],
    );

  return existingUser;
}

async function listUserRoles(userId: string): Promise<string[]> {
  const db = await ensureAuthSchema();
  const rows = await db.all<UserRoleRow>(
    `
      SELECT role
      FROM user_roles
      WHERE user_id = ?
      ORDER BY role ASC
    `,
    [userId],
  );

  return sortRoles(rows.map((row) => normalizeRole(row.role)));
}

export async function listUsersWithRoles(): Promise<AppUser[]> {
  const db = await ensureAuthSchema();
  const rows = await db.all<UserListRow>(
    `
      SELECT
        u.id,
        u.email,
        u.display_name,
        u.avatar_url,
        u.created_at,
        u.updated_at,
        GROUP_CONCAT(ur.role, ',') AS roles
      FROM users u
      LEFT JOIN user_roles ur
        ON ur.user_id = u.id
      GROUP BY
        u.id,
        u.email,
        u.display_name,
        u.avatar_url,
        u.created_at,
        u.updated_at
      ORDER BY
        COALESCE(u.display_name, u.email, u.id) ASC
    `,
  );

  return rows.map((row) =>
    normalizeUser(
      row,
      row.roles
        ? row.roles
            .split(",")
            .map((role) => normalizeRole(role.trim()))
            .filter(Boolean)
        : [],
    ),
  );
}

export async function listUsersWithMemberships(): Promise<AppUserDirectoryEntry[]> {
  const [users, membershipRows] = await Promise.all([
    listUsersWithRoles(),
    (async () => {
      const db = await ensureAuthSchema();
      return db.all<OrganizationMembershipRow>(
        `
          SELECT
            gm.user_id,
            gm.organization_id,
            g.name AS organization_name,
            gm.role
          FROM organization_memberships gm
          INNER JOIN organizations g
            ON g.id = gm.organization_id
          ORDER BY g.name ASC
        `,
      );
    })(),
  ]);

  const membershipsByUserId = new Map<string, AppUserOrganizationMembership[]>();

  for (const row of membershipRows) {
    const current = membershipsByUserId.get(row.user_id) ?? [];
    current.push({
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      role: normalizeRole(row.role ?? "viewer"),
    });
    membershipsByUserId.set(row.user_id, current);
  }

  return users.map((user) => ({
    ...user,
    organizations: membershipsByUserId.get(user.id) ?? [],
  }));
}

export async function getUserWithRoles(userId: string): Promise<AppUser | null> {
  const user = await getUserRowById(userId);

  if (!user) {
    return null;
  }

  const roles = await listUserRoles(userId);
  return normalizeUser(user, roles);
}

export async function hasAnyRole(role: string): Promise<boolean> {
  const db = await ensureAuthSchema();
  const candidates = (() => {
    switch (normalizeRole(role)) {
      case "admin":
        return ["admin", "superuser", "manager"];
      case "editor":
        return ["editor", "scene_editor"];
      case "viewer":
        return ["viewer", "scene_viewer"];
      default:
        return [role];
    }
  })();
  const placeholders = candidates.map(() => "?").join(", ");
  const match = await db.first<{ present: number }>(
    `
      SELECT 1 AS present
      FROM user_roles
      WHERE role IN (${placeholders})
      LIMIT 1
    `,
    candidates,
  );

  return match?.present === 1;
}

export async function replaceUserRoles(userId: string, roles: string[]): Promise<AppUser | null> {
  const db = await ensureAuthSchema();
  const user = await getUserRowById(userId);

  if (!user) {
    return null;
  }

  const normalizedRoles = sortRoles(roles.map((role) => normalizeRole(role.trim())).filter(Boolean));
  const now = new Date().toISOString();

  await db.run("DELETE FROM user_roles WHERE user_id = ?", [userId]);

  for (const role of normalizedRoles) {
    await db.run(
      `
        INSERT INTO user_roles (user_id, role, created_at)
        VALUES (?, ?, ?)
      `,
      [userId, role, now],
    );
  }

  return normalizeUser(user, normalizedRoles);
}

export async function listOrganizationsWithScenesForUser(input: {
  userId: string;
  roles: string[];
}): Promise<AppOrganizationSummary[]> {
  const db = await ensureAuthSchema();
  const actorRoles = sortRoles(input.roles);

  const visibleOrganizationIds =
    actorRoles.includes("admin")
      ? null
      : (
          await db.all<{ organization_id: string }>(
            `
              SELECT organization_id
              FROM organization_memberships
              WHERE user_id = ?
              ORDER BY organization_id ASC
            `,
            [input.userId],
          )
        ).map((row) => row.organization_id);

  if (visibleOrganizationIds && visibleOrganizationIds.length === 0) {
    return [];
  }

  const groupFilterSql = visibleOrganizationIds
    ? `WHERE g.id IN (${visibleOrganizationIds.map(() => "?").join(", ")})`
    : "";
  const groupRows = await db.all<OrganizationSummaryRow>(
    `
      SELECT
        g.id,
        g.name,
        g.description,
        COUNT(DISTINCT gm.user_id) AS members_count
      FROM organizations g
      LEFT JOIN organization_memberships gm
        ON gm.organization_id = g.id
      ${groupFilterSql}
      GROUP BY g.id, g.name, g.description
      ORDER BY g.name ASC
    `,
    visibleOrganizationIds ?? [],
  );

  const sceneFilterSql = visibleOrganizationIds
    ? `WHERE s.organization_id IN (${visibleOrganizationIds.map(() => "?").join(", ")})`
    : "";
  const sceneRows = await db.all<SceneSummaryRow>(
    `
      SELECT
        s.id,
        s.organization_id,
        s.name,
        s.description,
        s.shared,
        s.room_ply_url,
        s.room_glb_url
      FROM scenes s
      ${sceneFilterSql}
      ORDER BY s.name ASC
    `,
    visibleOrganizationIds ?? [],
  );

  const scenesByOrganizationId = new Map<string, AppSceneSummary[]>();

  for (const row of sceneRows) {
    const current = scenesByOrganizationId.get(row.organization_id) ?? [];
    current.push({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      shared: row.shared === 1,
      roomPlyUrl: row.room_ply_url,
      roomGlbUrl: row.room_glb_url,
    });
    scenesByOrganizationId.set(row.organization_id, current);
  }

  return groupRows.map((row) => {
    const scenes = scenesByOrganizationId.get(row.id) ?? [];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      membersCount: row.members_count,
      removable: row.members_count === 0 && scenes.length === 0,
      scenes,
    };
  });
}

async function listAccessibleOrganizationIdsForActor(actor: SceneAccessActor): Promise<string[] | null> {
  if (!actor) {
    return [];
  }

  const normalizedRoles = sortRoles(actor.roles);

  if (normalizedRoles.includes("admin")) {
    return null;
  }

  const db = await ensureAuthSchema();
  const rows = await db.all<{ organization_id: string }>(
    `
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = ?
      ORDER BY organization_id ASC
    `,
    [actor.userId],
  );

  return rows.map((row) => row.organization_id);
}

export async function listVisibleScenesForActor(actor: SceneAccessActor): Promise<AppSceneSummary[]> {
  const db = await ensureAuthSchema();
  const accessibleOrganizationIds = await listAccessibleOrganizationIdsForActor(actor);

  if (accessibleOrganizationIds && accessibleOrganizationIds.length === 0) {
    const publicRows = await db.all<(SceneSummaryRow & { organization_name: string })>(
      `
        SELECT
          s.id,
          s.organization_id,
          g.name AS organization_name,
          s.name,
          s.description,
          s.shared,
          s.room_ply_url,
          s.room_glb_url
        FROM scenes s
        INNER JOIN organizations g
          ON g.id = s.organization_id
        WHERE s.shared = 1
        ORDER BY g.name ASC, s.name ASC
      `,
    );

    return publicRows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      name: row.name,
      description: row.description,
      shared: row.shared === 1,
      roomPlyUrl: row.room_ply_url,
      roomGlbUrl: row.room_glb_url,
    }));
  }

  const whereClause =
    accessibleOrganizationIds === null
      ? ""
      : `WHERE s.shared = 1 OR s.organization_id IN (${accessibleOrganizationIds.map(() => "?").join(", ")})`;

  const rows = await db.all<(SceneSummaryRow & { organization_name: string })>(
    `
      SELECT
        s.id,
        s.organization_id,
        g.name AS organization_name,
        s.name,
        s.description,
        s.shared,
        s.room_ply_url,
        s.room_glb_url
      FROM scenes s
      INNER JOIN organizations g
        ON g.id = s.organization_id
      ${whereClause}
      ORDER BY g.name ASC, s.name ASC
    `,
    accessibleOrganizationIds ?? [],
  );

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    name: row.name,
    description: row.description,
    shared: row.shared === 1,
    roomPlyUrl: row.room_ply_url,
    roomGlbUrl: row.room_glb_url,
  }));
}

export async function getVisibleSceneByIdForActor(
  sceneId: string,
  actor: SceneAccessActor,
): Promise<AppSceneSummary | null> {
  const db = await ensureAuthSchema();
  const accessibleOrganizationIds = await listAccessibleOrganizationIdsForActor(actor);

  if (accessibleOrganizationIds && accessibleOrganizationIds.length === 0) {
    const row = await db.first<(SceneSummaryRow & { organization_name: string })>(
      `
        SELECT
          s.id,
          s.organization_id,
          g.name AS organization_name,
          s.name,
          s.description,
          s.shared,
          s.room_ply_url,
          s.room_glb_url
        FROM scenes s
        INNER JOIN organizations g
          ON g.id = s.organization_id
        WHERE s.id = ?
          AND s.shared = 1
        LIMIT 1
      `,
      [sceneId],
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      name: row.name,
      description: row.description,
      shared: row.shared === 1,
      roomPlyUrl: row.room_ply_url,
      roomGlbUrl: row.room_glb_url,
    };
  }

  const whereClause =
    accessibleOrganizationIds === null
      ? "WHERE s.id = ?"
      : `WHERE s.id = ? AND (s.shared = 1 OR s.organization_id IN (${accessibleOrganizationIds.map(() => "?").join(", ")}))`;
  const params = accessibleOrganizationIds === null ? [sceneId] : [sceneId, ...accessibleOrganizationIds];
  const row = await db.first<(SceneSummaryRow & { organization_name: string })>(
    `
      SELECT
        s.id,
        s.organization_id,
        g.name AS organization_name,
        s.name,
        s.description,
        s.shared,
        s.room_ply_url,
        s.room_glb_url
      FROM scenes s
      INNER JOIN organizations g
        ON g.id = s.organization_id
      ${whereClause}
      LIMIT 1
    `,
    params,
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    name: row.name,
    description: row.description,
    shared: row.shared === 1,
    roomPlyUrl: row.room_ply_url,
    roomGlbUrl: row.room_glb_url,
  };
}

export async function getSceneAccessHintById(sceneId: string): Promise<SceneAccessHint> {
  const db = await ensureAuthSchema();
  const row = await db.first<{ shared: number }>(
    `
      SELECT shared
      FROM scenes
      WHERE id = ?
      LIMIT 1
    `,
    [sceneId],
  );

  if (!row) {
    return {
      exists: false,
      shared: false,
    };
  }

  return {
    exists: true,
    shared: row.shared === 1,
  };
}

function mapAudioPlacementRow(row: AudioPlacementRow): AppAudioPlacement {
  return {
    id: row.id,
    sceneId: row.scene_id,
    audioFileId: row.audio_file_id,
    name: row.name,
    url: row.url,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    position: {
      x: row.position_x,
      y: row.position_y,
      z: row.position_z,
    },
    rotation: {
      x: row.rotation_x,
      y: row.rotation_y,
      z: row.rotation_z,
    },
    gain: row.gain,
    loop: row.loop_enabled === 1,
  };
}

export async function listAudioPlacementsForSceneIdActor(
  sceneId: string,
  actor: SceneAccessActor,
): Promise<AppAudioPlacement[] | null> {
  const scene = await getVisibleSceneByIdForActor(sceneId, actor);

  if (!scene) {
    return null;
  }

  const db = await ensureAuthSchema();
  const rows = await db.all<AudioPlacementRow>(
    `
      SELECT
        ap.id,
        ap.scene_id,
        ap.audio_file_id,
        ap.name,
        af.url,
        af.original_filename,
        af.mime_type,
        af.byte_size,
        ap.position_x,
        ap.position_y,
        ap.position_z,
        ap.rotation_x,
        ap.rotation_y,
        ap.rotation_z,
        ap.gain,
        ap.loop_enabled
      FROM audio_placements ap
      INNER JOIN audio_files af
        ON af.id = ap.audio_file_id
      WHERE ap.scene_id = ?
      ORDER BY COALESCE(ap.name, af.original_filename, af.url) ASC, ap.id ASC
    `,
    [scene.id],
  );

  return rows.map(mapAudioPlacementRow);
}

export async function replaceAudioPlacementsForSceneId(input: {
  sceneId: string;
  actorUserId: string;
  actorRoles: string[];
  placements: Array<{
    name: string | null;
    url: string;
    originalFilename: string | null;
    mimeType: string | null;
    byteSize: number | null;
    position: {
      x: number;
      y: number;
      z: number;
    };
    rotation: {
      x: number;
      y: number;
      z: number;
    };
    gain: number;
    loop: boolean;
  }>;
}): Promise<AppAudioPlacement[]> {
  const db = await ensureAuthSchema();
  const scene = await db.first<{ id: string; organization_id: string }>(
    `
      SELECT id, organization_id
      FROM scenes
      WHERE id = ?
      LIMIT 1
    `,
    [input.sceneId],
  );

  if (!scene) {
    throw new Error("Scene not found");
  }

  const allowed = await canManageOrganization({
    userId: input.actorUserId,
    roles: input.actorRoles,
    organizationId: scene.organization_id,
  });

  if (!allowed) {
    throw new Error("Forbidden");
  }

  const now = new Date().toISOString();
  const normalizedPlacements = input.placements
    .map((placement) => ({
      name: placement.name?.trim() || null,
      url: placement.url.trim(),
      originalFilename: placement.originalFilename?.trim() || null,
      mimeType: placement.mimeType?.trim() || null,
      byteSize:
        typeof placement.byteSize === "number" && Number.isFinite(placement.byteSize)
          ? Math.max(0, Math.round(placement.byteSize))
          : null,
      position: {
        x: Number(placement.position.x),
        y: Number(placement.position.y),
        z: Number(placement.position.z),
      },
      rotation: {
        x: Number(placement.rotation.x),
        y: Number(placement.rotation.y),
        z: Number(placement.rotation.z),
      },
      gain: Number(placement.gain),
      loop: placement.loop,
    }))
    .filter((placement) => placement.url.length > 0)
    .filter(
      (placement) =>
        Number.isFinite(placement.position.x) &&
        Number.isFinite(placement.position.y) &&
        Number.isFinite(placement.position.z) &&
        Number.isFinite(placement.rotation.x) &&
        Number.isFinite(placement.rotation.y) &&
        Number.isFinite(placement.rotation.z) &&
        Number.isFinite(placement.gain),
    );

  for (const placement of normalizedPlacements) {
    validateAssetInput({
      kind: "audio",
      urlOrFilename: placement.url,
      mimeType: placement.mimeType,
      byteSize: placement.byteSize,
    });
  }

  await db.run("DELETE FROM audio_placements WHERE scene_id = ?", [scene.id]);
  await db.run("DELETE FROM audio_files WHERE scene_id = ?", [scene.id]);

  const fileIdsByKey = new Map<string, string>();

  for (const placement of normalizedPlacements) {
    const fileKey = [
      placement.url,
      placement.originalFilename ?? "",
      placement.mimeType ?? "",
      placement.byteSize ?? "",
    ].join("::");

    let audioFileId = fileIdsByKey.get(fileKey);

    if (!audioFileId) {
      audioFileId = crypto.randomUUID();
      fileIdsByKey.set(fileKey, audioFileId);
      await db.run(
        `
          INSERT INTO audio_files (
            id,
            scene_id,
            url,
            original_filename,
            mime_type,
            byte_size,
            created_by_user_id,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          audioFileId,
          scene.id,
          placement.url,
          placement.originalFilename,
          placement.mimeType,
          placement.byteSize,
          input.actorUserId,
          now,
          now,
        ],
      );
    }

    await db.run(
      `
        INSERT INTO audio_placements (
          id,
          scene_id,
          audio_file_id,
          name,
          position_x,
          position_y,
          position_z,
          rotation_x,
          rotation_y,
          rotation_z,
          gain,
          loop_enabled,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        crypto.randomUUID(),
        scene.id,
        audioFileId,
        placement.name,
        placement.position.x,
        placement.position.y,
        placement.position.z,
        placement.rotation.x,
        placement.rotation.y,
        placement.rotation.z,
        placement.gain,
        placement.loop ? 1 : 0,
        now,
        now,
      ],
    );
  }

  const rows = await db.all<AudioPlacementRow>(
    `
      SELECT
        ap.id,
        ap.scene_id,
        ap.audio_file_id,
        ap.name,
        af.url,
        af.original_filename,
        af.mime_type,
        af.byte_size,
        ap.position_x,
        ap.position_y,
        ap.position_z,
        ap.rotation_x,
        ap.rotation_y,
        ap.rotation_z,
        ap.gain,
        ap.loop_enabled
      FROM audio_placements ap
      INNER JOIN audio_files af
        ON af.id = ap.audio_file_id
      WHERE ap.scene_id = ?
      ORDER BY COALESCE(ap.name, af.original_filename, af.url) ASC, ap.id ASC
    `,
    [scene.id],
  );

  return rows.map(mapAudioPlacementRow);
}

export async function listManageableOrganizationsForUser(input: {
  userId: string;
  roles: string[];
}): Promise<ManageableOrganizationOption[]> {
  const db = await ensureAuthSchema();
  const actorRoles = sortRoles(input.roles);

  if (actorRoles.includes("admin")) {
    return db.all<ManageableOrganizationOption>(
      `
        SELECT id, name
        FROM organizations
        ORDER BY name ASC
      `,
    );
  }

  if (!actorRoles.includes("editor")) {
    return [];
  }

  return db.all<ManageableOrganizationOption>(
    `
      SELECT g.id, g.name
      FROM organization_memberships gm
      INNER JOIN organizations g
        ON g.id = gm.organization_id
      WHERE gm.user_id = ?
        AND gm.role IN ('admin', 'editor')
      ORDER BY g.name ASC
    `,
    [input.userId],
  );
}

export async function listAllOrganizations(): Promise<OrganizationCatalogEntry[]> {
  const db = await ensureAuthSchema();
  return db.all<OrganizationCatalogEntry>(
    `
      SELECT id, name, description
      FROM organizations
      ORDER BY name ASC
    `,
  );
}

export async function getSceneForEdit(sceneId: string): Promise<
  | {
      id: string;
      organizationId: string;
      name: string;
      description: string | null;
      shared: boolean;
      roomPlyUrl: string | null;
      roomGlbUrl: string | null;
    }
  | null
> {
  const db = await ensureAuthSchema();
  const row = await db.first<SceneSummaryRow>(
    `
      SELECT
        id,
        organization_id,
        name,
        description,
        shared,
        room_ply_url,
        room_glb_url
      FROM scenes
      WHERE id = ?
    `,
    [sceneId],
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    shared: row.shared === 1,
    roomPlyUrl: row.room_ply_url,
    roomGlbUrl: row.room_glb_url,
  };
}

async function canManageOrganization(input: {
  userId: string;
  roles: string[];
  organizationId: string;
}): Promise<boolean> {
  const actorRoles = sortRoles(input.roles);

  if (actorRoles.includes("admin")) {
    return true;
  }

  if (!actorRoles.includes("editor")) {
    return false;
  }

  const db = await ensureAuthSchema();
  const match = await db.first<{ present: number }>(
    `
      SELECT 1 AS present
      FROM organization_memberships
      WHERE user_id = ?
        AND organization_id = ?
        AND role IN ('admin', 'editor')
      LIMIT 1
    `,
    [input.userId, input.organizationId],
  );

  return match?.present === 1;
}

export async function createOrganization(input: {
  name: string;
  description: string | null;
  createdByUserId: string;
}): Promise<string> {
  const db = await ensureAuthSchema();
  const now = new Date().toISOString();
  const organizationId = await generateUniqueShortId(async (candidate) => {
    const existing = await db.first<{ id: string }>(
      `
        SELECT id
        FROM organizations
        WHERE id = ?
        LIMIT 1
      `,
      [candidate],
    );

    return Boolean(existing);
  });

  await db.run(
    `
      INSERT INTO organizations (
        id,
        name,
        description,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
    [organizationId, input.name.trim(), input.description, now, now],
  );

  await db.run(
    `
      INSERT INTO organization_memberships (user_id, organization_id, role, created_at)
      VALUES (?, ?, 'admin', ?)
    `,
    [input.createdByUserId, organizationId, now],
  );

  return organizationId;
}

export async function deleteOrganization(input: {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
}): Promise<void> {
  if (!sortRoles(input.actorRoles).includes("admin")) {
    throw new Error("Only admins can delete organizations");
  }

  const db = await ensureAuthSchema();
  const counts = await db.first<{ members_count: number; scenes_count: number }>(
    `
      SELECT
        (SELECT COUNT(*) FROM organization_memberships WHERE organization_id = ?) AS members_count,
        (SELECT COUNT(*) FROM scenes WHERE organization_id = ?) AS scenes_count
    `,
    [input.organizationId, input.organizationId],
  );

  if (!counts) {
    throw new Error("Organization not found");
  }

  if (counts.members_count > 0 || counts.scenes_count > 0) {
    throw new Error("Organization with members or scenes cannot be deleted");
  }

  await db.run("DELETE FROM organizations WHERE id = ?", [input.organizationId]);
}

export async function createScene(input: {
  sceneId?: string;
  organizationId: string;
  name: string;
  description: string | null;
  shared: boolean;
  roomPlyUrl: string | null;
  roomGlbUrl: string | null;
  actorUserId: string;
  actorRoles: string[];
}): Promise<string> {
  const allowed = await canManageOrganization({
    userId: input.actorUserId,
    roles: input.actorRoles,
    organizationId: input.organizationId,
  });

  if (!allowed) {
    throw new Error("Forbidden");
  }

  const db = await ensureAuthSchema();
  const now = new Date().toISOString();
  const sceneId =
    input.sceneId ??
    (await generateUniqueShortId(async (candidate) => {
      const existing = await db.first<{ id: string }>(
        `
          SELECT id
          FROM scenes
          WHERE id = ?
          LIMIT 1
        `,
        [candidate],
      );

      return Boolean(existing);
    }));

  await db.run(
    `
      INSERT INTO scenes (
        id,
        organization_id,
        name,
        description,
        shared,
        room_ply_url,
        room_glb_url,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sceneId,
      input.organizationId,
      input.name.trim(),
      input.description,
      input.shared ? 1 : 0,
      input.roomPlyUrl,
      input.roomGlbUrl,
      input.actorUserId,
      now,
      now,
    ],
  );

  return sceneId;
}

export async function updateScene(input: {
  sceneId: string;
  organizationId: string;
  name: string;
  description: string | null;
  shared: boolean;
  roomPlyUrl: string | null;
  roomGlbUrl: string | null;
  actorUserId: string;
  actorRoles: string[];
}): Promise<void> {
  const allowed = await canManageOrganization({
    userId: input.actorUserId,
    roles: input.actorRoles,
    organizationId: input.organizationId,
  });

  if (!allowed) {
    throw new Error("Forbidden");
  }

  const db = await ensureAuthSchema();
  const now = new Date().toISOString();

  await db.run(
    `
      UPDATE scenes
      SET
        organization_id = ?,
        name = ?,
        description = ?,
        shared = ?,
        room_ply_url = ?,
        room_glb_url = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      input.organizationId,
      input.name.trim(),
      input.description,
      input.shared ? 1 : 0,
      input.roomPlyUrl,
      input.roomGlbUrl,
      now,
      input.sceneId,
    ],
  );
}

export async function deleteScene(input: {
  sceneId: string;
  actorUserId: string;
  actorRoles: string[];
}): Promise<void> {
  if (!sortRoles(input.actorRoles).includes("admin")) {
    throw new Error("Only admins can delete scenes");
  }

  const db = await ensureAuthSchema();
  await db.run("DELETE FROM scenes WHERE id = ?", [input.sceneId]);
}

export async function replaceUserOrganizationMemberships(input: {
  userId: string;
  memberships: {
    organizationId: string;
    role: string;
  }[];
}): Promise<AppUserDirectoryEntry | null> {
  const db = await ensureAuthSchema();
  const user = await getUserRowById(input.userId);

  if (!user) {
    return null;
  }

  const now = new Date().toISOString();
  const dedupedMemberships = Array.from(
    new Map(
      input.memberships
        .map((membership) => ({
          organizationId: membership.organizationId,
          role: normalizeRole(membership.role),
        }))
        .filter(
          (membership) =>
            membership.organizationId.trim().length > 0 &&
            ["admin", "editor", "viewer"].includes(membership.role),
        )
        .map((membership) => [membership.organizationId, membership]),
    ).values(),
  );

  await db.run("DELETE FROM organization_memberships WHERE user_id = ?", [input.userId]);

  for (const membership of dedupedMemberships) {
    await db.run(
      `
        INSERT INTO organization_memberships (user_id, organization_id, role, created_at)
        VALUES (?, ?, ?, ?)
      `,
      [input.userId, membership.organizationId, membership.role, now],
    );
  }

  const [updatedUser] = await Promise.all([getUserWithRoles(input.userId)]);
  const membershipRows = await db.all<OrganizationMembershipRow>(
    `
      SELECT
        gm.user_id,
        gm.organization_id,
        g.name AS organization_name,
        gm.role
      FROM organization_memberships gm
      INNER JOIN organizations g
        ON g.id = gm.organization_id
      WHERE gm.user_id = ?
      ORDER BY g.name ASC
    `,
    [input.userId],
  );

  if (!updatedUser) {
    return null;
  }

  return {
    ...updatedUser,
    organizations: membershipRows.map((row) => ({
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      role: normalizeRole(row.role ?? "viewer"),
    })),
  };
}

export async function upsertGoogleUser(input: UpsertGoogleUserInput): Promise<AppUser> {
  const db = await ensureAuthSchema();
  const provider = "google";
  const existingUser = await findExistingUser(provider, input.googleSub, input.email);
  const now = new Date().toISOString();

  if (existingUser) {
    await db.run(
      `
          UPDATE users
          SET email = ?, display_name = ?, avatar_url = ?, updated_at = ?
          WHERE id = ?
        `,
      [
        input.email,
        input.displayName ?? null,
        input.avatarUrl ?? null,
        now,
        existingUser.id,
      ],
    );

    await db.run(
      `
        INSERT INTO auth_identities (
          id,
          user_id,
          provider,
          provider_user_id,
          provider_email,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider, provider_user_id)
        DO UPDATE SET
          user_id = excluded.user_id,
          provider_email = excluded.provider_email,
          updated_at = excluded.updated_at
      `,
      [
        crypto.randomUUID(),
        existingUser.id,
        provider,
        input.googleSub,
        input.email,
        now,
        now,
      ],
    );

    const roles = await listUserRoles(existingUser.id);

    return {
      ...normalizeUser(existingUser, roles),
      email: input.email,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      updatedAt: now,
    };
  }

  const createdUser: AppUser = {
    id: crypto.randomUUID(),
    email: input.email,
    displayName: input.displayName ?? null,
    avatarUrl: input.avatarUrl ?? null,
    roles: [],
    createdAt: now,
    updatedAt: now,
  };

  await db.run(
    `
        INSERT INTO users (
          id,
          email,
          display_name,
          avatar_url,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
    [
      createdUser.id,
      createdUser.email,
      createdUser.displayName,
      createdUser.avatarUrl,
      createdUser.createdAt,
      createdUser.updatedAt,
    ],
  );

  await db.run(
    `
      INSERT INTO auth_identities (
        id,
        user_id,
        provider,
        provider_user_id,
        provider_email,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      crypto.randomUUID(),
      createdUser.id,
      provider,
      input.googleSub,
      input.email,
      createdUser.createdAt,
      createdUser.updatedAt,
    ],
  );

  return createdUser;
}
