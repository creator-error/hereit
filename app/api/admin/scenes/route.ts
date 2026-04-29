import { getAppSession } from "@/server/auth/session";
import { canEditWorkspace, hasWorkspaceAccess, sortRoles } from "@/features/admin/roles";
import {
  createScene,
  listGroupsWithScenesForUser,
} from "@/server/repositories/user-repository";

type SceneBody = {
  groupId?: unknown;
  name?: unknown;
  description?: unknown;
  shared?: unknown;
  roomPlyUrl?: unknown;
  roomGlbUrl?: unknown;
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

  const groups = await listGroupsWithScenesForUser({
    userId: actorUserId,
    roles: actorRoles,
  });

  return Response.json({
    scenes: groups.flatMap((group) =>
      group.scenes.map((scene) => ({
        ...scene,
        groupId: group.id,
        groupName: group.name,
      })),
    ),
  });
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

  const body = (await request.json()) as SceneBody;

  if (typeof body.groupId !== "string" || typeof body.name !== "string" || body.name.trim().length === 0) {
    return Response.json({ error: "groupId and name are required" }, { status: 400 });
  }

  try {
    const sceneId = await createScene({
      groupId: body.groupId,
      name: body.name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      shared: body.shared === true,
      roomPlyUrl: typeof body.roomPlyUrl === "string" ? body.roomPlyUrl.trim() || null : null,
      roomGlbUrl: typeof body.roomGlbUrl === "string" ? body.roomGlbUrl.trim() || null : null,
      actorUserId,
      actorRoles,
    });

    return Response.json({ sceneId }, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message === "Forbidden" ? 403 : 400;
    return Response.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status },
    );
  }
}
