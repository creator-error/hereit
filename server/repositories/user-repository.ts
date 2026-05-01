import { getPrimaryRole, normalizeRole, sortRoles } from "@/features/admin/roles";
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
};

export type AppUserDirectoryEntry = AppUser & {
  organizations: AppUserOrganizationMembership[];
};

export type AppSceneSummary = {
  id: string;
  organizationId: string;
  organizationName?: string;
  organizationLogoUrl?: string | null;
  name: string;
  description: string | null;
  shared: boolean;
  roomPlyUrl: string | null;
  roomGlbUrl: string | null;
  initialView: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    target: {
      x: number;
      y: number;
      z: number;
    };
  } | null;
};

export type AppSceneAudioPlacement = {
  id: string;
  sceneId: string;
  kind: "audio";
  url: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  gain: number;
  loop: boolean;
};

export type AppSceneTag = {
  id: string;
  sceneId: string;
  kind: "tag";
  title: string;
  description: string;
  linkUrl: string | null;
  position: {
    x: number;
    y: number;
    z: number;
  };
};

export type AppScenePlacement = AppSceneAudioPlacement | AppSceneTag;

export type AppOrganizationSummary = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
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
  logoUrl: string | null;
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
    logo_url TEXT,
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
    initial_camera_x REAL,
    initial_camera_y REAL,
    initial_camera_z REAL,
    initial_target_x REAL,
    initial_target_y REAL,
    initial_target_z REAL,
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

const createSceneAudioPlacementsTableSql = `
  CREATE TABLE IF NOT EXISTS scene_audio_placements (
    id TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL,
    url TEXT NOT NULL,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    position_z REAL NOT NULL,
    gain REAL NOT NULL DEFAULT 1,
    loop_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
  )
`;

const createSceneAudioPlacementsSceneIndexSql = `
  CREATE INDEX IF NOT EXISTS scene_audio_placements_scene_idx
  ON scene_audio_placements (scene_id)
`;

const createSceneTagsTableSql = `
  CREATE TABLE IF NOT EXISTS scene_tags (
    id TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    link_url TEXT,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    position_z REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
  )
`;

const createSceneTagsSceneIndexSql = `
  CREATE INDEX IF NOT EXISTS scene_tags_scene_idx
  ON scene_tags (scene_id)
`;

type UserRoleRow = {
  user_id?: string;
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
};

type SceneAudioPlacementRow = {
  id: string;
  scene_id: string;
  url: string;
  position_x: number;
  position_y: number;
  position_z: number;
  gain: number;
  loop_enabled: number;
};

type SceneTagRow = {
  id: string;
  scene_id: string;
  title: string;
  description: string;
  link_url: string | null;
  position_x: number;
  position_y: number;
  position_z: number;
};

type OrganizationSummaryRow = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  members_count: number;
};

type SceneSummaryRow = {
  id: string;
  organization_id: string;
  organization_name?: string;
  organization_logo_url?: string | null;
  name: string;
  description: string | null;
  shared: number;
  room_ply_url: string | null;
  room_glb_url: string | null;
  initial_camera_x: number | null;
  initial_camera_y: number | null;
  initial_camera_z: number | null;
  initial_target_x: number | null;
  initial_target_y: number | null;
  initial_target_z: number | null;
};

function mapSceneInitialView(row: SceneSummaryRow) {
  if (
    row.initial_camera_x === null ||
    row.initial_camera_y === null ||
    row.initial_camera_z === null ||
    row.initial_target_x === null ||
    row.initial_target_y === null ||
    row.initial_target_z === null
  ) {
    return null;
  }

  return {
    position: {
      x: row.initial_camera_x,
      y: row.initial_camera_y,
      z: row.initial_camera_z,
    },
    target: {
      x: row.initial_target_x,
      y: row.initial_target_y,
      z: row.initial_target_z,
    },
  };
}

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
  await db.exec(createSceneAudioPlacementsTableSql);
  await db.exec(createSceneAudioPlacementsSceneIndexSql);
  await db.exec(createSceneTagsTableSql);
  await db.exec(createSceneTagsSceneIndexSql);
  await ensureColumnExists("organization_memberships", "role", "TEXT NOT NULL DEFAULT 'viewer'");
  await ensureColumnExists("scenes", "shared", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumnExists("scenes", "initial_camera_x", "REAL");
  await ensureColumnExists("scenes", "initial_camera_y", "REAL");
  await ensureColumnExists("scenes", "initial_camera_z", "REAL");
  await ensureColumnExists("scenes", "initial_target_x", "REAL");
  await ensureColumnExists("scenes", "initial_target_y", "REAL");
  await ensureColumnExists("scenes", "initial_target_z", "REAL");
  await ensureColumnExists("organizations", "logo_url", "TEXT");
  await ensureColumnExists("scene_tags", "title", "TEXT NOT NULL DEFAULT ''");
  await ensureColumnExists("scene_tags", "link_url", "TEXT");
  await db.run("UPDATE organization_memberships SET role = 'viewer' WHERE role IS NULL");
  await db.run("UPDATE scenes SET shared = 0 WHERE shared IS NULL");
  await normalizeLegacyUserRoles();

  return db;
}

function createShortId(length = DEFAULT_SHORT_ID_LENGTH): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(randomBytes, (byte) => SHORT_ID_ALPHABET[byte % SHORT_ID_ALPHABET.length]).join(
    "",
  );
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

  const existingUser = await db.first<UserRow>(
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

async function syncOrganizationMembershipRolesForUser(userId: string, roles: string[]) {
  const primaryRole = getPrimaryRole(roles) ?? "viewer";
  const db = await ensureAuthSchema();
  await db.run("UPDATE organization_memberships SET role = ? WHERE user_id = ?", [
    primaryRole,
    userId,
  ]);
}

async function normalizeLegacyUserRoles() {
  const db = await getRuntimeDatabase();
  const rows = await db.all<UserRoleRow>(
    `
      SELECT user_id, role
      FROM user_roles
      ORDER BY user_id ASC, role ASC
    `,
  );
  const rolesByUserId = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.user_id) {
      continue;
    }

    const current = rolesByUserId.get(row.user_id) ?? [];
    current.push(row.role);
    rolesByUserId.set(row.user_id, current);
  }

  for (const [userId, roles] of rolesByUserId) {
    const primaryRole = getPrimaryRole(roles);

    if (!primaryRole) {
      continue;
    }

    const normalizedRoles = sortRoles(roles);

    if (normalizedRoles.length > 1 || normalizedRoles[0] !== primaryRole) {
      await db.run("DELETE FROM user_roles WHERE user_id = ?", [userId]);
      await db.run(
        `
          INSERT INTO user_roles (user_id, role, created_at)
          VALUES (?, ?, ?)
        `,
        [userId, primaryRole, new Date().toISOString()],
      );
    }

    await db.run("UPDATE organization_memberships SET role = ? WHERE user_id = ?", [
      primaryRole,
      userId,
    ]);
  }
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
            g.name AS organization_name
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

  const normalizedRoles = (() => {
    const primaryRole = getPrimaryRole(
      roles.map((role) => normalizeRole(role.trim())).filter(Boolean),
    );
    return primaryRole ? [primaryRole] : [];
  })();
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

  await syncOrganizationMembershipRolesForUser(userId, normalizedRoles);

  return normalizeUser(user, normalizedRoles);
}

export async function listOrganizationsWithScenesForUser(input: {
  userId: string;
  roles: string[];
}): Promise<AppOrganizationSummary[]> {
  const db = await ensureAuthSchema();
  const actorRoles = sortRoles(input.roles);

  const visibleOrganizationIds = actorRoles.includes("admin")
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
        g.logo_url,
        COUNT(DISTINCT gm.user_id) AS members_count
      FROM organizations g
      LEFT JOIN organization_memberships gm
        ON gm.organization_id = g.id
      ${groupFilterSql}
      GROUP BY g.id, g.name, g.description, g.logo_url
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
        s.room_glb_url,
        s.initial_camera_x,
        s.initial_camera_y,
        s.initial_camera_z,
        s.initial_target_x,
        s.initial_target_y,
        s.initial_target_z
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
      initialView: mapSceneInitialView(row),
    });
    scenesByOrganizationId.set(row.organization_id, current);
  }

  return groupRows.map((row) => {
    const scenes = scenesByOrganizationId.get(row.id) ?? [];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      logoUrl: row.logo_url,
      membersCount: row.members_count,
      removable: row.members_count === 0 && scenes.length === 0,
      scenes,
    };
  });
}

async function listAccessibleOrganizationIdsForActor(
  actor: SceneAccessActor,
): Promise<string[] | null> {
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

export async function listVisibleScenesForActor(
  actor: SceneAccessActor,
): Promise<AppSceneSummary[]> {
  const db = await ensureAuthSchema();
  const accessibleOrganizationIds = await listAccessibleOrganizationIdsForActor(actor);

  if (accessibleOrganizationIds && accessibleOrganizationIds.length === 0) {
    const publicRows = await db.all<SceneSummaryRow & { organization_name: string }>(
      `
        SELECT
          s.id,
          s.organization_id,
          g.name AS organization_name,
          g.logo_url AS organization_logo_url,
          s.name,
          s.description,
          s.shared,
          s.room_ply_url,
          s.room_glb_url,
          s.initial_camera_x,
          s.initial_camera_y,
          s.initial_camera_z,
          s.initial_target_x,
          s.initial_target_y,
          s.initial_target_z
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
      organizationLogoUrl: row.organization_logo_url,
      name: row.name,
      description: row.description,
      shared: row.shared === 1,
      roomPlyUrl: row.room_ply_url,
      roomGlbUrl: row.room_glb_url,
      initialView: mapSceneInitialView(row),
    }));
  }

  const whereClause =
    accessibleOrganizationIds === null
      ? ""
      : `WHERE s.shared = 1 OR s.organization_id IN (${accessibleOrganizationIds.map(() => "?").join(", ")})`;

  const rows = await db.all<SceneSummaryRow & { organization_name: string }>(
    `
      SELECT
        s.id,
        s.organization_id,
        g.name AS organization_name,
        g.logo_url AS organization_logo_url,
        s.name,
        s.description,
        s.shared,
        s.room_ply_url,
        s.room_glb_url,
        s.initial_camera_x,
        s.initial_camera_y,
        s.initial_camera_z,
        s.initial_target_x,
        s.initial_target_y,
        s.initial_target_z
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
    organizationLogoUrl: row.organization_logo_url,
    name: row.name,
    description: row.description,
    shared: row.shared === 1,
    roomPlyUrl: row.room_ply_url,
    roomGlbUrl: row.room_glb_url,
    initialView: mapSceneInitialView(row),
  }));
}

export async function getVisibleSceneByIdForActor(
  sceneId: string,
  actor: SceneAccessActor,
): Promise<AppSceneSummary | null> {
  const db = await ensureAuthSchema();
  const accessibleOrganizationIds = await listAccessibleOrganizationIdsForActor(actor);

  if (accessibleOrganizationIds && accessibleOrganizationIds.length === 0) {
    const row = await db.first<SceneSummaryRow & { organization_name: string }>(
      `
        SELECT
          s.id,
          s.organization_id,
          g.name AS organization_name,
          g.logo_url AS organization_logo_url,
          s.name,
          s.description,
          s.shared,
          s.room_ply_url,
          s.room_glb_url,
          s.initial_camera_x,
          s.initial_camera_y,
          s.initial_camera_z,
          s.initial_target_x,
          s.initial_target_y,
          s.initial_target_z
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
      organizationLogoUrl: row.organization_logo_url,
      name: row.name,
      description: row.description,
      shared: row.shared === 1,
      roomPlyUrl: row.room_ply_url,
      roomGlbUrl: row.room_glb_url,
      initialView: mapSceneInitialView(row),
    };
  }

  const whereClause =
    accessibleOrganizationIds === null
      ? "WHERE s.id = ?"
      : `WHERE s.id = ? AND (s.shared = 1 OR s.organization_id IN (${accessibleOrganizationIds.map(() => "?").join(", ")}))`;
  const params =
    accessibleOrganizationIds === null ? [sceneId] : [sceneId, ...accessibleOrganizationIds];
  const row = await db.first<SceneSummaryRow & { organization_name: string }>(
    `
      SELECT
        s.id,
        s.organization_id,
        g.name AS organization_name,
        g.logo_url AS organization_logo_url,
        s.name,
        s.description,
        s.shared,
        s.room_ply_url,
        s.room_glb_url,
        s.initial_camera_x,
        s.initial_camera_y,
        s.initial_camera_z,
        s.initial_target_x,
        s.initial_target_y,
        s.initial_target_z
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
    organizationLogoUrl: row.organization_logo_url,
    name: row.name,
    description: row.description,
    shared: row.shared === 1,
    roomPlyUrl: row.room_ply_url,
    roomGlbUrl: row.room_glb_url,
    initialView: mapSceneInitialView(row),
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

function mapSceneAudioPlacementRow(row: SceneAudioPlacementRow): AppSceneAudioPlacement {
  return {
    id: row.id,
    sceneId: row.scene_id,
    kind: "audio",
    url: row.url,
    position: {
      x: row.position_x,
      y: row.position_y,
      z: row.position_z,
    },
    gain: row.gain,
    loop: row.loop_enabled === 1,
  };
}

function mapSceneTagRow(row: SceneTagRow): AppSceneTag {
  return {
    id: row.id,
    sceneId: row.scene_id,
    kind: "tag",
    title: row.title,
    description: row.description,
    linkUrl: row.link_url,
    position: {
      x: row.position_x,
      y: row.position_y,
      z: row.position_z,
    },
  };
}

export async function listScenePlacementsForSceneIdActor(
  sceneId: string,
  actor: SceneAccessActor,
): Promise<AppScenePlacement[] | null> {
  const scene = await getVisibleSceneByIdForActor(sceneId, actor);

  if (!scene) {
    return null;
  }

  const db = await ensureAuthSchema();
  const audioRows = await db.all<SceneAudioPlacementRow>(
    `
      SELECT
        id,
        scene_id,
        url,
        position_x,
        position_y,
        position_z,
        gain,
        loop_enabled
      FROM scene_audio_placements
      WHERE scene_id = ?
      ORDER BY id ASC
    `,
    [scene.id],
  );
  const tagRows = await db.all<SceneTagRow>(
    `
      SELECT
        id,
        scene_id,
        title,
        description,
        link_url,
        position_x,
        position_y,
        position_z
      FROM scene_tags
      WHERE scene_id = ?
      ORDER BY id ASC
    `,
    [scene.id],
  );

  return [...audioRows.map(mapSceneAudioPlacementRow), ...tagRows.map(mapSceneTagRow)].sort(
    (left, right) => left.id.localeCompare(right.id),
  );
}

export async function replaceScenePlacementsForSceneId(input: {
  sceneId: string;
  actorUserId: string;
  actorRoles: string[];
  placements: Array<{
    kind: "audio" | "tag";
    position: {
      x: number;
      y: number;
      z: number;
    };
    url?: string | null;
    gain?: number;
    loop?: boolean;
    title?: string | null;
    description?: string | null;
    linkUrl?: string | null;
  }>;
}): Promise<AppScenePlacement[]> {
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
      kind: placement.kind,
      position: {
        x: Number(placement.position.x),
        y: Number(placement.position.y),
        z: Number(placement.position.z),
      },
      url: typeof placement.url === "string" ? placement.url.trim() : "",
      gain: typeof placement.gain === "number" ? Number(placement.gain) : 1,
      loop: placement.loop === true,
      linkUrl: typeof placement.linkUrl === "string" ? placement.linkUrl.trim() : "",
      title: typeof placement.title === "string" ? placement.title.trim() : "",
      description: typeof placement.description === "string" ? placement.description.trim() : "",
    }))
    .filter(
      (placement) =>
        (placement.kind === "audio" || placement.kind === "tag") &&
        Number.isFinite(placement.position.x) &&
        Number.isFinite(placement.position.y) &&
        Number.isFinite(placement.position.z),
    )
    .filter((placement) =>
      placement.kind === "audio"
        ? placement.url.length > 0 && Number.isFinite(placement.gain)
        : placement.title.length > 0 && placement.description.length > 0,
    );

  for (const placement of normalizedPlacements) {
    if (placement.kind !== "audio") {
      continue;
    }

    validateAssetInput({
      kind: "audio",
      urlOrFilename: placement.url,
      mimeType: null,
      byteSize: null,
    });
  }

  await db.run("DELETE FROM scene_audio_placements WHERE scene_id = ?", [scene.id]);
  await db.run("DELETE FROM scene_tags WHERE scene_id = ?", [scene.id]);

  for (const placement of normalizedPlacements) {
    if (placement.kind === "audio") {
      console.log("Inserting audio placement", placement, scene.id);
      await db.run(
        `
          INSERT INTO scene_audio_placements (
            id,
            scene_id,
            url,
            position_x,
            position_y,
            position_z,
            gain,
            loop_enabled,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          crypto.randomUUID(),
          scene.id,
          placement.url,
          placement.position.x,
          placement.position.y,
          placement.position.z,
          placement.gain,
          placement.loop ? 1 : 0,
          now,
          now,
        ],
      );
      continue;
    } else if (placement.kind === "tag") {
      console.log("Inserting tag placement", placement, scene.id);
      await db.run(
        `
        INSERT INTO scene_tags (
          id,
          scene_id,
          title,
          description,
          link_url,
          position_x,
          position_y,
          position_z,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          crypto.randomUUID(),
          scene.id,
          placement.title,
          placement.description,
          placement.linkUrl || null,
          placement.position.x,
          placement.position.y,
          placement.position.z,
          now,
          now,
        ],
      );
    }
  }

  return (
    (await listScenePlacementsForSceneIdActor(input.sceneId, {
      userId: input.actorUserId,
      roles: input.actorRoles,
    })) ?? []
  );
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
      ORDER BY g.name ASC
    `,
    [input.userId],
  );
}

export async function listAllOrganizations(): Promise<OrganizationCatalogEntry[]> {
  const db = await ensureAuthSchema();
  return db.all<OrganizationCatalogEntry>(
    `
      SELECT id, name, description, logo_url AS logoUrl
      FROM organizations
      ORDER BY name ASC
    `,
  );
}

export async function getSceneForEdit(sceneId: string): Promise<{
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  shared: boolean;
  roomPlyUrl: string | null;
  roomGlbUrl: string | null;
  initialView: AppSceneSummary["initialView"];
} | null> {
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
        room_glb_url,
        initial_camera_x,
        initial_camera_y,
        initial_camera_z,
        initial_target_x,
        initial_target_y,
        initial_target_z
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
    initialView: mapSceneInitialView(row),
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
      LIMIT 1
    `,
    [input.userId, input.organizationId],
  );

  return match?.present === 1;
}

export async function createOrganization(input: {
  name: string;
  description: string | null;
  logoUrl: string | null;
  createdByUserId: string;
  actorRoles: string[];
}): Promise<string> {
  const creatorRole = getPrimaryRole(input.actorRoles);

  if (!creatorRole || (creatorRole !== "admin" && creatorRole !== "editor")) {
    throw new Error("Only admins or editors can create organizations");
  }

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
        logo_url,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [organizationId, input.name.trim(), input.description, input.logoUrl, now, now],
  );

  await db.run(
    `
      INSERT INTO organization_memberships (user_id, organization_id, role, created_at)
      VALUES (?, ?, ?, ?)
    `,
    [input.createdByUserId, organizationId, creatorRole, now],
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

export async function updateSceneShared(input: {
  sceneId: string;
  shared: boolean;
  actorUserId: string;
  actorRoles: string[];
}): Promise<void> {
  const db = await ensureAuthSchema();
  const scene = await db.first<{ organization_id: string }>(
    `
      SELECT organization_id
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

  await db.run(
    `
      UPDATE scenes
      SET
        shared = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [input.shared ? 1 : 0, new Date().toISOString(), input.sceneId],
  );
}

export async function updateSceneInitialView(input: {
  sceneId: string;
  actorUserId: string;
  actorRoles: string[];
  initialView: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    target: {
      x: number;
      y: number;
      z: number;
    };
  };
}): Promise<void> {
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

  const { position, target } = input.initialView;
  const values = [position.x, position.y, position.z, target.x, target.y, target.z];

  if (!values.every((value) => Number.isFinite(value))) {
    throw new Error("Invalid initial view");
  }

  await db.run(
    `
      UPDATE scenes
      SET
        initial_camera_x = ?,
        initial_camera_y = ?,
        initial_camera_z = ?,
        initial_target_x = ?,
        initial_target_y = ?,
        initial_target_z = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      new Date().toISOString(),
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
  organizationIds: string[];
}): Promise<AppUserDirectoryEntry | null> {
  const db = await ensureAuthSchema();
  const user = await getUserRowById(input.userId);

  if (!user) {
    return null;
  }

  const userRoles = await listUserRoles(input.userId);
  const inheritedRole = getPrimaryRole(userRoles) ?? "viewer";
  const now = new Date().toISOString();
  const dedupedMemberships = Array.from(
    new Map(
      input.organizationIds
        .map((organizationId) => organizationId.trim())
        .filter((organizationId) => organizationId.length > 0)
        .map((organizationId) => [organizationId, organizationId]),
    ).values(),
  );

  await db.run("DELETE FROM organization_memberships WHERE user_id = ?", [input.userId]);

  for (const organizationId of dedupedMemberships) {
    await db.run(
      `
        INSERT INTO organization_memberships (user_id, organization_id, role, created_at)
        VALUES (?, ?, ?, ?)
      `,
      [input.userId, organizationId, inheritedRole, now],
    );
  }

  const [updatedUser] = await Promise.all([getUserWithRoles(input.userId)]);
  const membershipRows = await db.all<OrganizationMembershipRow>(
    `
      SELECT
        gm.user_id,
        gm.organization_id,
        g.name AS organization_name
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
      [input.email, input.displayName ?? null, input.avatarUrl ?? null, now, existingUser.id],
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
      [crypto.randomUUID(), existingUser.id, provider, input.googleSub, input.email, now, now],
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
