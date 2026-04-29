import { getAppSession } from "@/server/auth/session";
import { hasUserAdminAccess, isBootstrapCandidate, sortRoles } from "@/features/admin/roles";
import { hasAnyRole, listUsersWithMemberships } from "@/server/repositories/user-repository";

function isAuthenticated(session: Awaited<ReturnType<typeof getAppSession>>) {
  return Boolean(session?.user?.id);
}

export async function GET() {
  const session = await getAppSession();

  if (!isAuthenticated(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAdmin = await hasAnyRole("admin");
  const roles = sortRoles(session?.roles ?? []);

  if (hasAdmin) {
    if (!hasUserAdminAccess(roles)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!isBootstrapCandidate(roles)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await listUsersWithMemberships();

  return Response.json({
    users,
    bootstrapMode: !hasAdmin,
  });
}
