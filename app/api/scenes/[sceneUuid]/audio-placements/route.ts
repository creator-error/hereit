import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import {
  listScenePlacementsForSceneIdActor,
  replaceScenePlacementsForSceneId,
} from "@/server/repositories/user-repository";

type RouteContext = {
  params: Promise<{
    sceneUuid: string;
  }>;
};

type AudioPlacementBody = {
  placements?: Array<{
    kind?: unknown;
    position?: {
      x?: unknown;
      y?: unknown;
      z?: unknown;
    };
    url?: unknown;
    gain?: unknown;
    loop?: unknown;
    linkUrl?: unknown;
    title?: unknown;
    description?: unknown;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAppSession();
  const actor = session?.user?.id
    ? {
        userId: session.user.id,
        roles: sortRoles(session.roles ?? []),
      }
    : null;

  const { sceneUuid: sceneId } = await context.params;
  const placements = await listScenePlacementsForSceneIdActor(sceneId, actor);

  if (!placements) {
    return Response.json({ error: "Scene not found" }, { status: 404 });
  }

  return Response.json({ placements });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getAppSession();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sceneUuid: sceneId } = await context.params;
  const body = (await request.json()) as AudioPlacementBody;
  const placements = Array.isArray(body.placements) ? body.placements : [];

  console.log("Received placements:", placements);
  try {
    let saved = [];
    for (const [index, placement] of placements.entries()) {
      if (placement.kind !== "audio" && placement.kind !== "tag") {
        throw new Error(`Invalid kind at index ${index}`);
      }
      if (
        typeof placement.position?.x !== "number" ||
        typeof placement.position?.y !== "number" ||
        typeof placement.position?.z !== "number"
      ) {
        throw new Error(`Invalid position at index ${index}`);
      }

      const result = await replaceScenePlacementsForSceneId({
        sceneId,
        actorUserId: session.user.id,
        actorRoles: sortRoles(session.roles ?? []),
        placements: placements.map((placement) => ({
          kind: placement.kind === "tag" ? "tag" : "audio",
          position: {
            x: typeof placement.position?.x === "number" ? placement.position.x : 0,
            y: typeof placement.position?.y === "number" ? placement.position.y : 0,
            z: typeof placement.position?.z === "number" ? placement.position.z : 0,
          },
          url: typeof placement.url === "string" ? placement.url : null,
          gain: typeof placement.gain === "number" ? placement.gain : 1,
          loop: placement.loop === true,
          linkUrl: typeof placement.linkUrl === "string" ? placement.linkUrl : null,
          title: typeof placement.title === "string" ? placement.title : null,
          description: typeof placement.description === "string" ? placement.description : null,
        })),
      });
      saved.push(result);
    }

    return Response.json({ placements: saved });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "Forbidden"
        ? 403
        : error instanceof Error && error.message === "Scene not found"
          ? 404
          : 400;
    return Response.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status },
    );
  }
}
