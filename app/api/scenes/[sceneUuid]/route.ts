import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import {
  getVisibleSceneByIdForActor,
  listAudioPlacementsForSceneIdActor,
} from "@/server/repositories/user-repository";

type RouteContext = {
  params: Promise<{
    sceneUuid: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAppSession();
  const actor =
    session?.user?.id
      ? {
          userId: session.user.id,
          roles: sortRoles(session.roles ?? []),
        }
      : null;

  const { sceneUuid: sceneId } = await context.params;
  const scene = await getVisibleSceneByIdForActor(sceneId, actor);

  if (!scene) {
    return Response.json({ error: "Scene not found" }, { status: 404 });
  }

  const audioPlacements = (await listAudioPlacementsForSceneIdActor(sceneId, actor)) ?? [];

  return Response.json({ scene, audioPlacements });
}
