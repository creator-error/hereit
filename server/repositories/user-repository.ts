import { normalizeRole, sortRoles } from "@/features/admin/roles";
import { getRuntimeDatabase } from "@/server/db/runtime";

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

export type AppUserGroupMembership = {
  groupId: string;
  groupName: string;
  role: string;
};

export type AppUserDirectoryEntry = AppUser & {
  groups: AppUserGroupMembership[];
};

export type AppSceneSummary = {
  id: string;
  uuid: string;
  groupId: string;
  groupName?: string;
  name: string;
  description: string | null;
  shared: boolean;
  roomPlyUrl: string | null;
  roomGlbUrl: string | null;
};

export type AppGroupSummary = {
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

export type ManageableGroupOption = {
  id: string;
  name: string;
};

export type GroupCatalogEntry = {
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

const createGroupsTableSql = `
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const createGroupMembershipsTableSql = `
  CREATE TABLE IF NOT EXISTS group_memberships (
    user_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
  )
`;

const createScenesTableSql = `
  CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    uuid TEXT NOT NULL UNIQUE,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    shared INTEGER NOT NULL DEFAULT 0,
    room_ply_url TEXT,
    room_glb_url TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`;

const createScenesGroupIndexSql = `
  CREATE INDEX IF NOT EXISTS scenes_group_id_idx
  ON scenes (group_id)
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

type GroupMembershipRow = {
  user_id: string;
  group_id: string;
  group_name: string;
  role: string | null;
};

type GroupSummaryRow = {
  id: string;
  name: string;
  description: string | null;
  members_count: number;
};

type SceneSummaryRow = {
  id: string;
  uuid: string;
  group_id: string;
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
  await db.exec(createGroupsTableSql);
  await db.exec(createGroupMembershipsTableSql);
  await db.exec(createScenesTableSql);
  await db.exec(createScenesGroupIndexSql);
  await db.exec(createAssetsTableSql);
  await db.exec(createAssetsSceneKindIndexSql);
  await db.exec(createAudioFilesTableSql);
  await db.exec(createAudioFilesSceneIndexSql);
  await db.exec(createAudioPlacementsTableSql);
  await db.exec(createAudioPlacementsSceneIndexSql);
  await ensureColumnExists("group_memberships", "role", "TEXT NOT NULL DEFAULT 'viewer'");
  await ensureColumnExists("scenes", "shared", "INTEGER NOT NULL DEFAULT 0");
  await db.run("UPDATE group_memberships SET role = 'viewer' WHERE role IS NULL");
  await db.run("UPDATE scenes SET shared = 0 WHERE shared IS NULL");

  return db;
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
      return db.all<GroupMembershipRow>(
        `
          SELECT
            gm.user_id,
            gm.group_id,
            g.name AS group_name,
            gm.role
          FROM group_memberships gm
          INNER JOIN groups g
            ON g.id = gm.group_id
          ORDER BY g.name ASC
        `,
      );
    })(),
  ]);

  const membershipsByUserId = new Map<string, AppUserGroupMembership[]>();

  for (const row of membershipRows) {
    const current = membershipsByUserId.get(row.user_id) ?? [];
    current.push({
      groupId: row.group_id,
      groupName: row.group_name,
      role: normalizeRole(row.role ?? "viewer"),
    });
    membershipsByUserId.set(row.user_id, current);
  }

  return users.map((user) => ({
    ...user,
    groups: membershipsByUserId.get(user.id) ?? [],
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

export async function listGroupsWithScenesForUser(input: {
  userId: string;
  roles: string[];
}): Promise<AppGroupSummary[]> {
  const db = await ensureAuthSchema();
  const actorRoles = sortRoles(input.roles);

  const visibleGroupIds =
    actorRoles.includes("admin")
      ? null
      : (
          await db.all<{ group_id: string }>(
            `
              SELECT group_id
              FROM group_memberships
              WHERE user_id = ?
              ORDER BY group_id ASC
            `,
            [input.userId],
          )
        ).map((row) => row.group_id);

  if (visibleGroupIds && visibleGroupIds.length === 0) {
    return [];
  }

  const groupFilterSql = visibleGroupIds
    ? `WHERE g.id IN (${visibleGroupIds.map(() => "?").join(", ")})`
    : "";
  const groupRows = await db.all<GroupSummaryRow>(
    `
      SELECT
        g.id,
        g.name,
        g.description,
        COUNT(DISTINCT gm.user_id) AS members_count
      FROM groups g
      LEFT JOIN group_memberships gm
        ON gm.group_id = g.id
      ${groupFilterSql}
      GROUP BY g.id, g.name, g.description
      ORDER BY g.name ASC
    `,
    visibleGroupIds ?? [],
  );

  const sceneFilterSql = visibleGroupIds
    ? `WHERE s.group_id IN (${visibleGroupIds.map(() => "?").join(", ")})`
    : "";
  const sceneRows = await db.all<SceneSummaryRow>(
    `
      SELECT
        s.id,
        s.uuid,
        s.group_id,
        s.name,
        s.description,
        s.shared,
        s.room_ply_url,
        s.room_glb_url
      FROM scenes s
      ${sceneFilterSql}
      ORDER BY s.name ASC
    `,
    visibleGroupIds ?? [],
  );

  const scenesByGroupId = new Map<string, AppSceneSummary[]>();

  for (const row of sceneRows) {
    const current = scenesByGroupId.get(row.group_id) ?? [];
    current.push({
      id: row.id,
      uuid: row.uuid,
      groupId: row.group_id,
      name: row.name,
      description: row.description,
      shared: row.shared === 1,
      roomPlyUrl: row.room_ply_url,
      roomGlbUrl: row.room_glb_url,
    });
    scenesByGroupId.set(row.group_id, current);
  }

  return groupRows.map((row) => {
    const scenes = scenesByGroupId.get(row.id) ?? [];
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

async function listAccessibleGroupIdsForActor(actor: SceneAccessActor): Promise<string[] | null> {
  if (!actor) {
    return [];
  }

  const normalizedRoles = sortRoles(actor.roles);

  if (normalizedRoles.includes("admin")) {
    return null;
  }

  const db = await ensureAuthSchema();
  const rows = await db.all<{ group_id: string }>(
    `
      SELECT group_id
      FROM group_memberships
      WHERE user_id = ?
      ORDER BY group_id ASC
    `,
    [actor.userId],
  );

  return rows.map((row) => row.group_id);
}

export async function listVisibleScenesForActor(actor: SceneAccessActor): Promise<AppSceneSummary[]> {
  const db = await ensureAuthSchema();
  const accessibleGroupIds = await listAccessibleGroupIdsForActor(actor);

  if (accessibleGroupIds && accessibleGroupIds.length === 0) {
    const publicRows = await db.all<(SceneSummaryRow & { group_name: string })>(
      `
        SELECT
          s.id,
          s.uuid,
          s.group_id,
          g.name AS group_name,
          s.name,
          s.description,
          s.shared,
          s.room_ply_url,
          s.room_glb_url
        FROM scenes s
        INNER JOIN groups g
          ON g.id = s.group_id
        WHERE s.shared = 1
        ORDER BY g.name ASC, s.name ASC
      `,
    );

    return publicRows.map((row) => ({
      id: row.id,
      uuid: row.uuid,
      groupId: row.group_id,
      groupName: row.group_name,
      name: row.name,
      description: row.description,
      shared: row.shared === 1,
      roomPlyUrl: row.room_ply_url,
      roomGlbUrl: row.room_glb_url,
    }));
  }

  const whereClause =
    accessibleGroupIds === null
      ? ""
      : `WHERE s.shared = 1 OR s.group_id IN (${accessibleGroupIds.map(() => "?").join(", ")})`;

  const rows = await db.all<(SceneSummaryRow & { group_name: string })>(
    `
      SELECT
        s.id,
        s.uuid,
        s.group_id,
        g.name AS group_name,
        s.name,
        s.description,
        s.shared,
        s.room_ply_url,
        s.room_glb_url
      FROM scenes s
      INNER JOIN groups g
        ON g.id = s.group_id
      ${whereClause}
      ORDER BY g.name ASC, s.name ASC
    `,
    accessibleGroupIds ?? [],
  );

  return rows.map((row) => ({
    id: row.id,
    uuid: row.uuid,
    groupId: row.group_id,
    groupName: row.group_name,
    name: row.name,
    description: row.description,
    shared: row.shared === 1,
    roomPlyUrl: row.room_ply_url,
    roomGlbUrl: row.room_glb_url,
  }));
}

export async function getVisibleSceneByUuidForActor(
  sceneUuid: string,
  actor: SceneAccessActor,
): Promise<AppSceneSummary | null> {
  const db = await ensureAuthSchema();
  const accessibleGroupIds = await listAccessibleGroupIdsForActor(actor);

  if (accessibleGroupIds && accessibleGroupIds.length === 0) {
    const row = await db.first<(SceneSummaryRow & { group_name: string })>(
      `
        SELECT
          s.id,
          s.uuid,
          s.group_id,
          g.name AS group_name,
          s.name,
          s.description,
          s.shared,
          s.room_ply_url,
          s.room_glb_url
        FROM scenes s
        INNER JOIN groups g
          ON g.id = s.group_id
        WHERE s.uuid = ?
          AND s.shared = 1
        LIMIT 1
      `,
      [sceneUuid],
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      uuid: row.uuid,
      groupId: row.group_id,
      groupName: row.group_name,
      name: row.name,
      description: row.description,
      shared: row.shared === 1,
      roomPlyUrl: row.room_ply_url,
      roomGlbUrl: row.room_glb_url,
    };
  }

  const whereClause =
    accessibleGroupIds === null
      ? "WHERE s.uuid = ?"
      : `WHERE s.uuid = ? AND (s.shared = 1 OR s.group_id IN (${accessibleGroupIds.map(() => "?").join(", ")}))`;
  const params = accessibleGroupIds === null ? [sceneUuid] : [sceneUuid, ...accessibleGroupIds];
  const row = await db.first<(SceneSummaryRow & { group_name: string })>(
    `
      SELECT
        s.id,
        s.uuid,
        s.group_id,
        g.name AS group_name,
        s.name,
        s.description,
        s.shared,
        s.room_ply_url,
        s.room_glb_url
      FROM scenes s
      INNER JOIN groups g
        ON g.id = s.group_id
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
    uuid: row.uuid,
    groupId: row.group_id,
    groupName: row.group_name,
    name: row.name,
    description: row.description,
    shared: row.shared === 1,
    roomPlyUrl: row.room_ply_url,
    roomGlbUrl: row.room_glb_url,
  };
}

export async function getSceneAccessHintByUuid(sceneUuid: string): Promise<SceneAccessHint> {
  const db = await ensureAuthSchema();
  const row = await db.first<{ shared: number }>(
    `
      SELECT shared
      FROM scenes
      WHERE uuid = ?
      LIMIT 1
    `,
    [sceneUuid],
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

export async function listManageableGroupsForUser(input: {
  userId: string;
  roles: string[];
}): Promise<ManageableGroupOption[]> {
  const db = await ensureAuthSchema();
  const actorRoles = sortRoles(input.roles);

  if (actorRoles.includes("admin")) {
    return db.all<ManageableGroupOption>(
      `
        SELECT id, name
        FROM groups
        ORDER BY name ASC
      `,
    );
  }

  if (!actorRoles.includes("editor")) {
    return [];
  }

  return db.all<ManageableGroupOption>(
    `
      SELECT g.id, g.name
      FROM group_memberships gm
      INNER JOIN groups g
        ON g.id = gm.group_id
      WHERE gm.user_id = ?
        AND gm.role IN ('admin', 'editor')
      ORDER BY g.name ASC
    `,
    [input.userId],
  );
}

export async function listAllGroups(): Promise<GroupCatalogEntry[]> {
  const db = await ensureAuthSchema();
  return db.all<GroupCatalogEntry>(
    `
      SELECT id, name, description
      FROM groups
      ORDER BY name ASC
    `,
  );
}

export async function getSceneForEdit(sceneId: string): Promise<
  | {
      id: string;
      uuid: string;
      groupId: string;
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
        uuid,
        group_id,
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
    uuid: row.uuid,
    groupId: row.group_id,
    name: row.name,
    description: row.description,
    shared: row.shared === 1,
    roomPlyUrl: row.room_ply_url,
    roomGlbUrl: row.room_glb_url,
  };
}

function slugifyGroupName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || `group-${crypto.randomUUID().slice(0, 8)}`;
}

async function canManageGroup(input: {
  userId: string;
  roles: string[];
  groupId: string;
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
      FROM group_memberships
      WHERE user_id = ?
        AND group_id = ?
        AND role IN ('admin', 'editor')
      LIMIT 1
    `,
    [input.userId, input.groupId],
  );

  return match?.present === 1;
}

export async function createGroup(input: {
  name: string;
  description: string | null;
  createdByUserId: string;
}): Promise<string> {
  const db = await ensureAuthSchema();
  const now = new Date().toISOString();
  const groupId = crypto.randomUUID();
  const slugBase = slugifyGroupName(input.name);
  let slug = slugBase;
  let suffix = 1;

  while (
    await db.first<{ id: string }>(
      `
        SELECT id
        FROM groups
        WHERE slug = ?
        LIMIT 1
      `,
      [slug],
    )
  ) {
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }

  await db.run(
    `
      INSERT INTO groups (
        id,
        name,
        slug,
        description,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [groupId, input.name.trim(), slug, input.description, now, now],
  );

  await db.run(
    `
      INSERT INTO group_memberships (user_id, group_id, role, created_at)
      VALUES (?, ?, 'admin', ?)
    `,
    [input.createdByUserId, groupId, now],
  );

  return groupId;
}

export async function deleteGroup(input: {
  groupId: string;
  actorUserId: string;
  actorRoles: string[];
}): Promise<void> {
  if (!sortRoles(input.actorRoles).includes("admin")) {
    throw new Error("Only admins can delete groups");
  }

  const db = await ensureAuthSchema();
  const counts = await db.first<{ members_count: number; scenes_count: number }>(
    `
      SELECT
        (SELECT COUNT(*) FROM group_memberships WHERE group_id = ?) AS members_count,
        (SELECT COUNT(*) FROM scenes WHERE group_id = ?) AS scenes_count
    `,
    [input.groupId, input.groupId],
  );

  if (!counts) {
    throw new Error("Group not found");
  }

  if (counts.members_count > 0 || counts.scenes_count > 0) {
    throw new Error("Group with members or scenes cannot be deleted");
  }

  await db.run("DELETE FROM groups WHERE id = ?", [input.groupId]);
}

export async function createScene(input: {
  groupId: string;
  name: string;
  description: string | null;
  shared: boolean;
  roomPlyUrl: string | null;
  roomGlbUrl: string | null;
  actorUserId: string;
  actorRoles: string[];
}): Promise<string> {
  const allowed = await canManageGroup({
    userId: input.actorUserId,
    roles: input.actorRoles,
    groupId: input.groupId,
  });

  if (!allowed) {
    throw new Error("Forbidden");
  }

  const db = await ensureAuthSchema();
  const now = new Date().toISOString();
  const sceneId = crypto.randomUUID();
  const sceneUuid = crypto.randomUUID();

  await db.run(
    `
      INSERT INTO scenes (
        id,
        uuid,
        group_id,
        name,
        description,
        shared,
        room_ply_url,
        room_glb_url,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sceneId,
      sceneUuid,
      input.groupId,
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
  groupId: string;
  name: string;
  description: string | null;
  shared: boolean;
  roomPlyUrl: string | null;
  roomGlbUrl: string | null;
  actorUserId: string;
  actorRoles: string[];
}): Promise<void> {
  const allowed = await canManageGroup({
    userId: input.actorUserId,
    roles: input.actorRoles,
    groupId: input.groupId,
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
        group_id = ?,
        name = ?,
        description = ?,
        shared = ?,
        room_ply_url = ?,
        room_glb_url = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      input.groupId,
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

export async function replaceUserGroupMemberships(input: {
  userId: string;
  memberships: {
    groupId: string;
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
          groupId: membership.groupId,
          role: normalizeRole(membership.role),
        }))
        .filter(
          (membership) =>
            membership.groupId.trim().length > 0 &&
            ["admin", "editor", "viewer"].includes(membership.role),
        )
        .map((membership) => [membership.groupId, membership]),
    ).values(),
  );

  await db.run("DELETE FROM group_memberships WHERE user_id = ?", [input.userId]);

  for (const membership of dedupedMemberships) {
    await db.run(
      `
        INSERT INTO group_memberships (user_id, group_id, role, created_at)
        VALUES (?, ?, ?, ?)
      `,
      [input.userId, membership.groupId, membership.role, now],
    );
  }

  const [updatedUser] = await Promise.all([getUserWithRoles(input.userId)]);
  const membershipRows = await db.all<GroupMembershipRow>(
    `
      SELECT
        gm.user_id,
        gm.group_id,
        g.name AS group_name,
        gm.role
      FROM group_memberships gm
      INNER JOIN groups g
        ON g.id = gm.group_id
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
    groups: membershipRows.map((row) => ({
      groupId: row.group_id,
      groupName: row.group_name,
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
