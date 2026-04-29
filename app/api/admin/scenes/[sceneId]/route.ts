import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import { deleteScene, updateScene } from "@/server/repositories/user-repository";

type RouteContext = {
  params: Promise<{
    sceneId: string;
  }>;
};

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

export async function PUT(request: Request, context: RouteContext) {
  const session = await getAppSession();

  if (!isAuthenticated(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorUserId = session?.user?.id;

  if (!actorUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorRoles = sortRoles(session!.roles ?? []);
  const { sceneId } = await context.params;
  const body = (await request.json()) as SceneBody;

  if (typeof body.groupId !== "string" || typeof body.name !== "string" || body.name.trim().length === 0) {
    return Response.json({ error: "groupId and name are required" }, { status: 400 });
  }

  try {
    await updateScene({
      sceneId,
      groupId: body.groupId,
      name: body.name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      shared: body.shared === true,
      roomPlyUrl: typeof body.roomPlyUrl === "string" ? body.roomPlyUrl.trim() || null : null,
      roomGlbUrl: typeof body.roomGlbUrl === "string" ? body.roomGlbUrl.trim() || null : null,
      actorUserId,
      actorRoles,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getAppSession();

  if (!isAuthenticated(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorUserId = session?.user?.id;

  if (!actorUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorRoles = sortRoles(session!.roles ?? []);
  const { sceneId } = await context.params;

  try {
    await deleteScene({
      sceneId,
      actorUserId,
      actorRoles,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 },
    );
  }

  return Response.json({ ok: true });
}
