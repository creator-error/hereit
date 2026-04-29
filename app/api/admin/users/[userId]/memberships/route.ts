import { getAppSession } from "@/server/auth/session";
import { hasUserAdminAccess, sortRoles } from "@/features/admin/roles";
import {
  hasAnyRole,
  replaceUserOrganizationMemberships,
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

function parseMemberships(body: MembershipBody): { organizationId: string; role: string }[] | null {
  if (!Array.isArray(body.memberships)) {
    return null;
  }

  const normalized = body.memberships.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as { organizationId?: unknown }).organizationId !== "string" ||
      typeof (entry as { role?: unknown }).role !== "string"
    ) {
      return null;
    }

    return {
      organizationId: (entry as { organizationId: string }).organizationId,
      role: (entry as { role: string }).role,
    };
  });

  return normalized.every(Boolean) ? (normalized as { organizationId: string; role: string }[]) : null;
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
      { error: "memberships must be an array of { organizationId, role }" },
      { status: 400 },
    );
  }

  const { userId } = await context.params;
  const user = await replaceUserOrganizationMemberships({
    userId,
    memberships,
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ user });
}
