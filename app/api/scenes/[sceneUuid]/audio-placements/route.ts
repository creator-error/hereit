import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import {
  listAudioPlacementsForSceneUuidActor,
  replaceAudioPlacementsForSceneUuid,
} from "@/server/repositories/user-repository";

type RouteContext = {
  params: Promise<{
    sceneUuid: string;
  }>;
};

type AudioPlacementBody = {
  placements?: Array<{
    name?: unknown;
    url?: unknown;
    originalFilename?: unknown;
    mimeType?: unknown;
    byteSize?: unknown;
    position?: {
      x?: unknown;
      y?: unknown;
      z?: unknown;
    };
    rotation?: {
      x?: unknown;
      y?: unknown;
      z?: unknown;
    };
    gain?: unknown;
    loop?: unknown;
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

  const { sceneUuid } = await context.params;
  const placements = await listAudioPlacementsForSceneUuidActor(sceneUuid, actor);

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

  const { sceneUuid } = await context.params;
  const body = (await request.json()) as AudioPlacementBody;
  const placements = Array.isArray(body.placements) ? body.placements : [];

  try {
    const saved = await replaceAudioPlacementsForSceneUuid({
      sceneUuid,
      actorUserId: session.user.id,
      actorRoles: sortRoles(session.roles ?? []),
      placements: placements.map((placement) => ({
        name: typeof placement.name === "string" ? placement.name : null,
        url: typeof placement.url === "string" ? placement.url : "",
        originalFilename:
          typeof placement.originalFilename === "string" ? placement.originalFilename : null,
        mimeType: typeof placement.mimeType === "string" ? placement.mimeType : null,
        byteSize: typeof placement.byteSize === "number" ? placement.byteSize : null,
        position: {
          x: typeof placement.position?.x === "number" ? placement.position.x : 0,
          y: typeof placement.position?.y === "number" ? placement.position.y : 0,
          z: typeof placement.position?.z === "number" ? placement.position.z : 0,
        },
        rotation: {
          x: typeof placement.rotation?.x === "number" ? placement.rotation.x : 0,
          y: typeof placement.rotation?.y === "number" ? placement.rotation.y : 0,
          z: typeof placement.rotation?.z === "number" ? placement.rotation.z : 0,
        },
        gain: typeof placement.gain === "number" ? placement.gain : 1,
        loop: placement.loop === true,
      })),
    });

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
