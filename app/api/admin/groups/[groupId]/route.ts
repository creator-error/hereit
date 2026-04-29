import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import { deleteGroup } from "@/server/repositories/user-repository";

type RouteContext = {
  params: Promise<{
    groupId: string;
  }>;
};

function isAuthenticated(session: Awaited<ReturnType<typeof getAppSession>>) {
  return Boolean(session?.user?.id);
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
  const { groupId } = await context.params;

  try {
    await deleteGroup({
      groupId,
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
