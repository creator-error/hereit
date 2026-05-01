import { notFound } from "next/navigation";
import { SceneViewerClient } from "./SceneViewerClient";
import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import type { SparkScenePlacement } from "@/features/spark-viewer/sceneTypes";
import {
  getSceneAccessHintById,
  listScenePlacementsForSceneIdActor,
  getVisibleSceneByIdForActor,
} from "@/server/repositories/user-repository";

type PageProps = {
  params: Promise<{
    sceneUuid: string;
  }>;
};

export default async function SceneDetailPage({ params }: PageProps) {
  const { sceneUuid: sceneId } = await params;
  const session = await getAppSession();
  const actor =
    session?.user?.id
      ? {
          userId: session.user.id,
          roles: sortRoles(session.roles ?? []),
        }
      : null;
  const hint = await getSceneAccessHintById(sceneId);

  if (!hint.exists) {
    notFound();
  }

  const scene = await getVisibleSceneByIdForActor(sceneId, actor);

  if (!scene) {
    notFound();
  }

  const scenePlacements = (await listScenePlacementsForSceneIdActor(sceneId, actor)) ?? [];
  const viewerPlacements: SparkScenePlacement[] = scenePlacements.map((placement) =>
    placement.kind === "audio"
      ? {
          gain: placement.gain,
          id: placement.id,
          kind: "audio",
          label: "音声",
          loop: placement.loop,
          position: placement.position,
          url: placement.url,
        }
      : {
          id: placement.id,
          kind: "tag",
          label: placement.description,
          linkUrl: placement.linkUrl,
          title: placement.title,
          position: placement.position,
        },
  );

  return (
    <main className="demo-page">
      <section className="viewer-stage">
        <SceneViewerClient
          placements={viewerPlacements}
          collisionAssetUrl={scene.roomGlbUrl}
          fullscreen
          initialView={scene.initialView}
          organizationLogoUrl={scene.organizationLogoUrl ?? null}
          sceneLabel={scene.name}
          sceneSubLabel={scene.organizationName}
          splatAssetUrl={scene.roomPlyUrl}
        />
      </section>
    </main>
  );
}
