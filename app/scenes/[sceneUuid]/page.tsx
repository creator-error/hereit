import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SceneShareControls } from "../_components/SceneShareControls";
import { SceneAudioEditor } from "./SceneAudioEditor";
import { SceneViewerClient } from "./SceneViewerClient";
import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import {
  getSceneAccessHintByUuid,
  listAudioPlacementsForSceneUuidActor,
  getVisibleSceneByUuidForActor,
} from "@/server/repositories/user-repository";

type PageProps = {
  params: Promise<{
    sceneUuid: string;
  }>;
};

export default async function SceneDetailPage({ params }: PageProps) {
  const { sceneUuid } = await params;
  const session = await getAppSession();
  const actor =
    session?.user?.id
      ? {
          userId: session.user.id,
          roles: sortRoles(session.roles ?? []),
        }
      : null;

  const scene = await getVisibleSceneByUuidForActor(sceneUuid, actor);

  if (!scene) {
    const hint = await getSceneAccessHintByUuid(sceneUuid);

    if (!hint.exists) {
      notFound();
    }

    if (!session?.user?.id && !hint.shared) {
      redirect(`/login?callbackUrl=/scenes/${sceneUuid}`);
    }

    return (
      <main className="min-h-screen bg-[#08111f] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-rose-400/20 bg-rose-500/10 p-8 shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.24em] text-rose-200">403</p>
          <h1 className="mt-3 text-4xl font-semibold">Scene access denied</h1>
          <p className="mt-4 text-sm leading-7 text-white/78">
            この Scene は共有されておらず、現在のログインユーザーには閲覧権限がありません。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Back to Admin
            </Link>
            <Link
              href="/login"
              className="rounded-2xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24]"
            >
              Switch Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const audioPlacements = (await listAudioPlacementsForSceneUuidActor(sceneUuid, actor)) ?? [];
  const canEditAudio = sessionRolesCanEdit(session?.roles ?? []);

  return (
    <main className="min-h-screen bg-[#08111f] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.28em] text-sky-300">Scene Viewer</p>
          <h1 className="mt-3 text-4xl font-semibold">{scene.name}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72">
            {scene.description ?? "No description"}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                scene.shared
                  ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                  : "border-white/12 bg-white/6 text-white/76"
              }`}
            >
              {scene.shared ? "Shared" : "Private"}
            </span>
            {scene.groupName ? (
              <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/76">
                {scene.groupName}
              </span>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <SceneViewerClient
            audioSources={audioPlacements.map((placement) => ({
              gain: placement.gain,
              loop: placement.loop,
              name: placement.name ?? placement.originalFilename ?? "audio",
              position: placement.position,
              url: placement.url,
            }))}
            splatAssetUrl={scene.roomPlyUrl}
            collisionAssetUrl={scene.roomGlbUrl}
          />

          <aside className="rounded-[32px] border border-white/10 bg-[#0c1423] p-8 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold text-white">Assets</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-white/44">Scene UUID</dt>
                <dd className="mt-1 break-all text-white/78">{scene.uuid}</dd>
              </div>
              <div>
                <dt className="text-white/44">PLY URL</dt>
                <dd className="mt-1 break-all text-white/78">
                  {scene.roomPlyUrl ?? "No PLY URL"}
                </dd>
              </div>
              <div>
                <dt className="text-white/44">GLB URL</dt>
                <dd className="mt-1 break-all text-white/78">
                  {scene.roomGlbUrl ?? "No GLB URL"}
                </dd>
              </div>
              <div>
                <dt className="text-white/44">Audio Placements</dt>
                <dd className="mt-1 text-white/78">{audioPlacements.length}</dd>
              </div>
            </dl>
            <SceneShareControls sceneUuid={scene.uuid} shared={scene.shared} />
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Open Demo
              </Link>
              <Link
                href="/admin"
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Back to Admin
              </Link>
            </div>
          </aside>
        </section>

        <SceneAudioEditor
          canEdit={canEditAudio}
          initialPlacements={audioPlacements}
          sceneUuid={scene.uuid}
        />
      </div>
    </main>
  );
}

function sessionRolesCanEdit(roles: string[] | undefined) {
  const normalized = sortRoles(roles ?? []);
  return normalized.includes("admin") || normalized.includes("editor");
}
