import { getAppSession } from "@/server/auth/session";
import {
  canSubmitRoleSet,
  hasUserAdminAccess,
  isAdmin,
  isBootstrapCandidate,
  sortRoles,
  touchesPrivilegedRole,
} from "@/features/admin/roles";
import { getUserWithRoles, hasAnyRole, replaceUserRoles } from "@/server/repositories/user-repository";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

type RequestBody = {
  roles?: unknown;
};

function isAuthenticated(session: Awaited<ReturnType<typeof getAppSession>>) {
  return Boolean(session?.user?.id);
}

function parseRoles(body: RequestBody): string[] | null {
  if (!Array.isArray(body.roles)) {
    return null;
  }

  const roles = body.roles.filter((role): role is string => typeof role === "string");

  if (roles.length !== body.roles.length) {
    return null;
  }

  return roles;
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getAppSession();

  if (!isAuthenticated(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAdmin = await hasAnyRole("admin");
  const { userId } = await context.params;
  const actorRoles = sortRoles(session?.roles ?? []);

  if (hasAdmin) {
    if (!hasUserAdminAccess(actorRoles)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (session?.user?.id !== userId || !isBootstrapCandidate(actorRoles)) {
    return Response.json(
      { error: "Bootstrap is only allowed for the current user" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as RequestBody;
  const roles = parseRoles(body);

  if (!roles) {
    return Response.json({ error: "roles must be a string array" }, { status: 400 });
  }

  const nextRoles = sortRoles(roles);

  if (nextRoles.length !== 1) {
    return Response.json({ error: "exactly one role must be selected" }, { status: 400 });
  }

  if (!canSubmitRoleSet(actorRoles, nextRoles, { bootstrap: !hasAdmin })) {
    return Response.json({ error: "Forbidden role set" }, { status: 403 });
  }

  const currentUser = await getUserWithRoles(userId);

  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (hasAdmin && !isAdmin(actorRoles) && touchesPrivilegedRole(currentUser.roles)) {
    return Response.json({ error: "Only admins can modify privileged users" }, { status: 403 });
  }

  const updatedUser = await replaceUserRoles(userId, roles);

  return Response.json({
    user: updatedUser,
    bootstrapMode: !hasAdmin,
  });
}
