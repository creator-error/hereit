import { getAppSession } from "@/server/auth/session";
import { canEditWorkspace, hasWorkspaceAccess, sortRoles } from "@/features/admin/roles";
import {
  createOrganization,
  listOrganizationsWithScenesForUser,
} from "@/server/repositories/user-repository";

type OrganizationBody = {
  name?: unknown;
  description?: unknown;
};

function isAuthenticated(session: Awaited<ReturnType<typeof getAppSession>>) {
  return Boolean(session?.user?.id);
}

export async function GET() {
  const session = await getAppSession();

  if (!isAuthenticated(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorUserId = session?.user?.id;

  if (!actorUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorRoles = sortRoles(session!.roles ?? []);

  if (!canEditWorkspace(actorRoles)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizations = await listOrganizationsWithScenesForUser({
    userId: actorUserId,
    roles: actorRoles,
  });

  return Response.json({ organizations });
}

export async function POST(request: Request) {
  const session = await getAppSession();

  if (!isAuthenticated(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorUserId = session?.user?.id;

  if (!actorUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorRoles = sortRoles(session!.roles ?? []);

  if (!hasWorkspaceAccess(actorRoles)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as OrganizationBody;

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const organizationId = await createOrganization({
    name: body.name,
    description: typeof body.description === "string" ? body.description.trim() || null : null,
    createdByUserId: actorUserId,
  });

  return Response.json({ organizationId }, { status: 201 });
}
