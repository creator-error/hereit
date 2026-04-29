export const ROLE_ORDER = ["admin", "editor", "viewer"] as const;

export type RoleName = (typeof ROLE_ORDER)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export const WORKSPACE_ACCESS_ROLES: RoleName[] = ["admin", "editor", "viewer"];
export const USER_ADMIN_ACCESS_ROLES: RoleName[] = ["admin"];
export const PRIVILEGED_ROLES: RoleName[] = ["admin"];

const LEGACY_ROLE_ALIASES: Record<string, RoleName> = {
  superuser: "admin",
  manager: "admin",
  scene_editor: "editor",
  scene_viewer: "viewer",
};

export function normalizeRole(role: string): string {
  return LEGACY_ROLE_ALIASES[role] ?? role;
}

export function normalizeRoles(roles: string[] | undefined): string[] {
  return [...new Set((roles ?? []).map((role) => normalizeRole(role.trim())).filter(Boolean))];
}

export function sortRoles(roles: string[]): string[] {
  const order = new Map(ROLE_ORDER.map((role, index) => [role, index]));
  return [...new Set(roles.map((role) => normalizeRole(role)))].sort((left, right) => {
    const leftIndex = order.get(left as RoleName) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = order.get(right as RoleName) ?? Number.MAX_SAFE_INTEGER;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.localeCompare(right);
  });
}

export function hasWorkspaceAccess(roles: string[] | undefined): boolean {
  return normalizeRoles(roles).some((role) => WORKSPACE_ACCESS_ROLES.includes(role as RoleName));
}

export function hasUserAdminAccess(roles: string[] | undefined): boolean {
  return normalizeRoles(roles).some((role) => USER_ADMIN_ACCESS_ROLES.includes(role as RoleName));
}

export function isBootstrapCandidate(roles: string[] | undefined): boolean {
  return normalizeRoles(roles).length === 0;
}

export function isAdmin(roles: string[] | undefined): boolean {
  return normalizeRoles(roles).includes("admin");
}

export function canManageRole(
  actorRoles: string[] | undefined,
  targetRole: string,
  targetUserRoles: string[] = [],
): boolean {
  const normalizedActorRoles = normalizeRoles(actorRoles);
  const normalizedTargetRole = normalizeRole(targetRole);
  const normalizedTargetUserRoles = normalizeRoles(targetUserRoles);

  if (!isAdmin(normalizedActorRoles) && touchesPrivilegedRole(normalizedTargetUserRoles)) {
    return false;
  }

  if (isAdmin(normalizedActorRoles)) {
    return ROLE_ORDER.includes(normalizedTargetRole as RoleName);
  }

  return false;
}

export function canSubmitRoleSet(
  actorRoles: string[] | undefined,
  desiredRoles: string[],
  options?: {
    bootstrap?: boolean;
  },
): boolean {
  const sortedRoles = sortRoles(desiredRoles);

  if (options?.bootstrap) {
    return sortedRoles.length === 1 && sortedRoles[0] === "admin";
  }

  if (isAdmin(actorRoles)) {
    return sortedRoles.every((role) => ROLE_ORDER.includes(role as RoleName));
  }

  return false;
}

export function touchesPrivilegedRole(roles: string[]): boolean {
  return normalizeRoles(roles).some((role) => PRIVILEGED_ROLES.includes(role as RoleName));
}
