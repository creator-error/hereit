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
  organizationIds?: unknown;
};

function isAuthenticated(session: Awaited<ReturnType<typeof getAppSession>>) {
  return Boolean(session?.user?.id);
}

function parseOrganizationIds(body: MembershipBody): string[] | null {
  if (!Array.isArray(body.organizationIds)) {
    return null;
  }

  const organizationIds = body.organizationIds.filter(
    (organizationId): organizationId is string => typeof organizationId === "string",
  );

  return organizationIds.length === body.organizationIds.length ? organizationIds : null;
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
  const organizationIds = parseOrganizationIds(body);

  if (!organizationIds) {
    return Response.json(
      { error: "organizationIds must be a string array" },
      { status: 400 },
    );
  }

  const { userId } = await context.params;
  const user = await replaceUserOrganizationMemberships({
    userId,
    organizationIds,
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ user });
}
