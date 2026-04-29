import { getAppSession } from "@/server/auth/session";
import { hasUserAdminAccess, sortRoles } from "@/features/admin/roles";
import {
  hasAnyRole,
  replaceUserGroupMemberships,
} from "@/server/repositories/user-repository";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

type MembershipBody = {
  memberships?: unknown;
};

function isAuthenticated(session: Awaited<ReturnType<typeof getAppSession>>) {
  return Boolean(session?.user?.id);
}

function parseMemberships(body: MembershipBody): { groupId: string; role: string }[] | null {
  if (!Array.isArray(body.memberships)) {
    return null;
  }

  const normalized = body.memberships.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as { groupId?: unknown }).groupId !== "string" ||
      typeof (entry as { role?: unknown }).role !== "string"
    ) {
      return null;
    }

    return {
      groupId: (entry as { groupId: string }).groupId,
      role: (entry as { role: string }).role,
    };
  });

  return normalized.every(Boolean) ? (normalized as { groupId: string; role: string }[]) : null;
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getAppSession();

  if (!isAuthenticated(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAdmin = await hasAnyRole("admin");
  const actorRoles = sortRoles(session!.roles ?? []);

  if (!hasAdmin || !hasUserAdminAccess(actorRoles)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as MembershipBody;
  const memberships = parseMemberships(body);

  if (!memberships) {
    return Response.json(
      { error: "memberships must be an array of { groupId, role }" },
      { status: 400 },
    );
  }

  const { userId } = await context.params;
  const user = await replaceUserGroupMemberships({
    userId,
    memberships,
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ user });
}
