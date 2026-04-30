import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import { updateSceneInitialView } from "@/server/repositories/user-repository";

type RouteContext = {
  params: Promise<{
    sceneUuid: string;
  }>;
};

type RequestBody = {
  initialView?: {
    position?: {
      x?: unknown;
      y?: unknown;
      z?: unknown;
    };
    target?: {
      x?: unknown;
      y?: unknown;
      z?: unknown;
    };
  };
};

export async function PUT(request: Request, context: RouteContext) {
  const session = await getAppSession();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as RequestBody;
  const initialView = body.initialView;

  if (
    typeof initialView?.position?.x !== "number" ||
    typeof initialView.position.y !== "number" ||
    typeof initialView.position.z !== "number" ||
    typeof initialView.target?.x !== "number" ||
    typeof initialView.target.y !== "number" ||
    typeof initialView.target.z !== "number"
  ) {
    return Response.json({ error: "initialView is invalid" }, { status: 400 });
  }

  try {
    const { sceneUuid: sceneId } = await context.params;
    const position = {
      x: initialView.position.x,
      y: initialView.position.y,
      z: initialView.position.z,
    };
    const target = {
      x: initialView.target.x,
      y: initialView.target.y,
      z: initialView.target.z,
    };
    await updateSceneInitialView({
      sceneId,
      actorUserId: session.user.id,
      actorRoles: sortRoles(session.roles ?? []),
      initialView: {
        position,
        target,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "Forbidden"
        ? 403
        : error instanceof Error && error.message === "Scene not found"
          ? 404
          : 400;
    return Response.json(
      { error: error instanceof Error ? error.message : "Initial view save failed" },
      { status },
    );
  }
}
