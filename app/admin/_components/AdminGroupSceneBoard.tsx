import Link from "next/link";
import { createOrganizationAction, deleteOrganizationAction, deleteSceneAction } from "@/app/admin/actions";
import { SceneShareControls } from "@/app/scenes/_components/SceneShareControls";
import type { AppOrganizationSummary } from "@/server/repositories/user-repository";

type AdminOrganizationSceneBoardProps = {
  currentUserRoles: string[];
  organizations: AppOrganizationSummary[];
};

function canCreateScene(roles: string[]) {
  return roles.includes("admin") || roles.includes("editor");
}

function canDeleteOrganization(roles: string[]) {
  return roles.includes("admin");
}

function sceneStatusTone(shared: boolean) {
  return shared
    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
    : "border-white/12 bg-white/6 text-white/78";
}

export function AdminOrganizationSceneBoard({
  currentUserRoles,
  organizations,
}: AdminOrganizationSceneBoardProps) {
  const allowSceneOps = canCreateScene(currentUserRoles);
  const allowOrganizationDelete = canDeleteOrganization(currentUserRoles);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.28em] text-[#f59e0b]">
              Organizations & Scenes
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-white">
              Organization-centric scene operations
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/72">
              シーンは organization 単位でまとめて表示し、organization の中で作成、編集、共有状態を管理する形に寄せています。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/users"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Open Users
            </Link>
          </div>
        </div>

        <form action={createOrganizationAction} className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-[#0f1729]/80 p-5 lg:grid-cols-[1.1fr,1.4fr,auto]">
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-white/44">Organization Name</label>
            <input
              type="text"
              name="name"
              required
              disabled={!allowSceneOps}
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/34 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Exhibit Team"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-white/44">Description</label>
            <input
              type="text"
              name="description"
              disabled={!allowSceneOps}
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/34 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Who operates this organization and what scenes belong here"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!allowSceneOps}
              className="w-full rounded-2xl bg-[#f59e0b] px-4 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:bg-[#475569] disabled:text-white/60"
            >
              Create Organization
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-5">
        {organizations.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-12 text-center text-white/62">
            <h2 className="text-2xl font-semibold text-white">No organizations yet</h2>
            <p className="mt-3 text-sm leading-7">
              まだ organization がありません。最初の organization を作成すると、その中でシーンを運用できます。
            </p>
          </section>
        ) : null}

        {organizations.map((organization) => (
          <article
            key={organization.id}
            className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0c1423] shadow-2xl shadow-black/20"
          >
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">
                    Organization
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{organization.name}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
                    {organization.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/76">
                    {organization.membersCount} members
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/76">
                    {organization.scenes.length} scenes
                  </span>
                  <form action={deleteOrganizationAction}>
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <button
                      type="submit"
                      disabled={!allowOrganizationDelete || !organization.removable}
                      className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-white/38"
                    >
                      Delete Organization
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-white">Scenes in {organization.name}</h3>
                  <p className="mt-1 text-sm text-white/58">
                    `room_ply_url` と `room_glb_url` を scene 単位で直接運用します。
                  </p>
                </div>
                <Link
                  href={`/admin/scenes/new?organizationId=${organization.id}`}
                  aria-disabled={!allowSceneOps}
                  className={`rounded-2xl border border-white/12 px-4 py-2 text-sm transition ${
                    allowSceneOps
                      ? "bg-white/6 text-white hover:bg-white/10"
                      : "pointer-events-none bg-white/[0.03] text-white/40"
                  }`}
                >
                  New Scene
                </Link>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {organization.scenes.map((scene) => (
                  <section
                    key={scene.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/44">
                          Scene
                        </p>
                        <h4 className="mt-2 text-xl font-medium text-white">{scene.name}</h4>
                        {scene.description ? (
                          <p className="mt-2 text-sm leading-6 text-white/60">
                            {scene.description}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${sceneStatusTone(scene.shared)}`}
                      >
                        {scene.shared ? "Shared" : "Private"}
                      </span>
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div>
                        <dt className="text-white/42">PLY URL</dt>
                        <dd className="mt-1 break-all text-white/74">
                          {scene.roomPlyUrl ?? "No PLY URL"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/42">GLB URL</dt>
                        <dd className="mt-1 break-all text-white/74">
                          {scene.roomGlbUrl ?? "No GLB URL"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/admin/scenes/${scene.id}/edit`}
                        aria-disabled={!allowSceneOps}
                        className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                          allowSceneOps
                            ? "bg-white text-[#0b1220] hover:bg-slate-100"
                            : "pointer-events-none bg-[#334155] text-white/60"
                        }`}
                      >
                        Edit Scene
                      </Link>
                      <form action={deleteSceneAction}>
                        <input type="hidden" name="sceneId" value={scene.id} />
                        <button
                          type="submit"
                          disabled={!currentUserRoles.includes("admin")}
                          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-white/38"
                        >
                          Delete Scene
                        </button>
                      </form>
                    </div>
                    <SceneShareControls compact sceneId={scene.id} shared={scene.shared} />
                  </section>
                ))}
              </div>
              {organization.scenes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-10 text-center text-sm text-white/58">
                  この organization にはまだシーンがありません。
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
