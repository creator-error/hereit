import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SceneWorkspaceClient } from "../SceneWorkspaceClient";
import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import {
  getSceneForEdit,
  listScenePlacementsForSceneIdActor,
} from "@/server/repositories/user-repository";

type PageProps = {
  params: Promise<{
    sceneUuid: string;
  }>;
};

export default async function SceneWorkspaceEditPage({ params }: PageProps) {
  const session = await getAppSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const actor = {
    userId: session.user.id,
    roles: sortRoles(session.roles ?? []),
  };
  const canEditAudio = actor.roles.includes("admin") || actor.roles.includes("editor");

  if (!canEditAudio) {
    redirect("/admin");
  }

  const { sceneUuid: sceneId } = await params;
  const scene = await getSceneForEdit(sceneId);

  if (!scene) {
    notFound();
  }

  const scenePlacements = (await listScenePlacementsForSceneIdActor(sceneId, actor)) ?? [];

  return (
    <main className="min-h-screen bg-[#08111f] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.28em] text-sky-300">シーン編集</p>
          <h1 className="mt-3 text-4xl font-semibold">{scene.name}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72">
            音声とタグの配置、Scene 内の確認用表示を編集します。共有ページとは分離されています。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/scenes/${scene.id}`}
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              共有ページを開く
            </Link>
            <Link
              href={`/admin/scenes/${scene.id}/edit`}
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              基本情報を編集
            </Link>
            <Link
              href="/admin"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              管理画面に戻る
            </Link>
          </div>
        </section>

        <SceneWorkspaceClient
          canEdit
          collisionAssetUrl={scene.roomGlbUrl}
          initialSceneView={scene.initialView}
          initialPlacements={scenePlacements}
          sceneId={scene.id}
          splatAssetUrl={scene.roomPlyUrl}
        />
      </div>
    </main>
  );
}
