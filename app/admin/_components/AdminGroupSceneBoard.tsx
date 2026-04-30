"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  createOrganizationAction,
  deleteOrganizationAction,
  deleteSceneAction,
  toggleSceneSharedAction,
} from "@/app/admin/actions";
import { useToast } from "@/app/_components/ToastProvider";
import { Button } from "@/app/_components/ui/Button";
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [openSceneMenuId, setOpenSceneMenuId] = useState<string | null>(null);
  const sceneMenuRef = useRef<HTMLDivElement | null>(null);
  const allowSceneOps = canCreateScene(currentUserRoles);
  const allowOrganizationDelete = canDeleteOrganization(currentUserRoles);
  const { showToast } = useToast();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!sceneMenuRef.current?.contains(event.target as Node)) {
        setOpenSceneMenuId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenSceneMenuId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleCopySharedUrl(sceneId: string, shared: boolean) {
    if (!shared) {
      return;
    }

    try {
      const url =
        typeof window === "undefined"
          ? `/scenes/${sceneId}`
          : new URL(`/scenes/${sceneId}`, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      showToast("共有URLをコピーしました。", "success");
    } catch {
      showToast("共有URLのコピーに失敗しました。", "error");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.28em] text-[#f59e0b]">
              Organization And Scenes
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-white">組織単位のシーン管理</h1>
            <p className="mt-4 text-sm leading-7 text-white/72">
              シーンは組織単位でまとめて表示し、組織の中で作成、編集、公開状態を管理できるようにしています。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setCreateModalOpen(true)}
              disabled={!allowSceneOps}
              className="cursor-pointer"
              variant="primary"
            >
              組織を作成
            </Button>
          </div>
        </div>
      </section>

      {createModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#020617]/72 px-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#0c1423] p-8 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#f59e0b]">新規組織</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">組織を作成</h2>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  会社名や部門名の単位でシーンをまとめる組織を作成します。
                </p>
              </div>
              <Button
                onClick={() => setCreateModalOpen(false)}
                variant="secondary"
              >
                閉じる
              </Button>
            </div>

            <form action={createOrganizationAction} className="mt-8 space-y-5">
              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-white/44">組織名</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/34"
                  placeholder="株式会社サンプル"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-white/44">説明</label>
                <input
                  type="text"
                  name="description"
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/34"
                  placeholder="この組織の運用主体や、ここに含まれるシーンの概要"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.18em] text-white/44">ロゴ URL</label>
                <input
                  type="url"
                  name="logoUrl"
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/34"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  onClick={() => setCreateModalOpen(false)}
                  size="md"
                  variant="secondary"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  size="md"
                  variant="primary"
                >
                  組織を作成
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className="space-y-5">
        {organizations.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-12 text-center text-white/62">
            <h2 className="text-2xl font-semibold text-white">組織はまだありません</h2>
            <p className="mt-3 text-sm leading-7">
              まだ組織がありません。最初の組織を作成すると、その中でシーンを運用できます。
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
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">組織</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{organization.name}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
                    {organization.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/76">
                    {organization.scenes.length} シーン
                  </span>
                  <form action={deleteOrganizationAction}>
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <button
                      type="submit"
                      disabled={!allowOrganizationDelete || !organization.removable}
                      className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-white/38"
                    >
                      組織を削除
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-white">シーン一覧</h3>
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
                  新規シーンを作成
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
                        <h4 className="mt-2 text-xl font-medium text-white">{scene.name}</h4>
                        {scene.description ? (
                          <p className="mt-2 text-sm leading-6 text-white/60">
                            {scene.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="relative flex items-center gap-2" ref={openSceneMenuId === scene.id ? sceneMenuRef : null}>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${sceneStatusTone(scene.shared)}`}
                        >
                          {scene.shared ? "公開中" : "非公開"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenSceneMenuId((current) => (current === scene.id ? null : scene.id))
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/6 text-sm text-white transition hover:bg-white/10"
                          aria-label="シーンメニューを開く"
                        >
                          ⋮
                        </button>
                        {openSceneMenuId === scene.id ? (
                          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 rounded-3xl border border-white/10 bg-[#0c1423] p-2 shadow-2xl shadow-black/40">
                            <Link
                              href={`/admin/scenes/${scene.id}/edit`}
                              className="block rounded-2xl px-4 py-3 text-sm text-white transition hover:bg-white/6"
                              onClick={() => setOpenSceneMenuId(null)}
                            >
                              基本情報を編集
                            </Link>
                            <form action={toggleSceneSharedAction}>
                              <input type="hidden" name="sceneId" value={scene.id} />
                              <input
                                type="hidden"
                                name="shared"
                                value={scene.shared ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                disabled={!allowSceneOps}
                                className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-white transition hover:bg-white/6 disabled:cursor-not-allowed disabled:text-white/38"
                              >
                                {scene.shared ? "非公開にする" : "公開する"}
                              </button>
                            </form>
                            <button
                              type="button"
                              disabled={!scene.shared}
                              onClick={() => void handleCopySharedUrl(scene.id, scene.shared)}
                              className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-white transition hover:bg-white/6 disabled:cursor-not-allowed disabled:text-white/38"
                            >
                              共有URLをコピー
                            </button>
                            <form action={deleteSceneAction}>
                              <input type="hidden" name="sceneId" value={scene.id} />
                              <button
                                type="submit"
                                disabled={!currentUserRoles.includes("admin")}
                                className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:text-white/38"
                              >
                                削除
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div>
                        <dt className="text-white/42">PLY URL</dt>
                        <dd className="mt-1 break-all text-white/74">
                          {scene.roomPlyUrl ?? "未設定"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/42">GLB URL</dt>
                        <dd className="mt-1 break-all text-white/74">
                          {scene.roomGlbUrl ?? "未設定"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/scenes/${scene.id}/edit`}
                        aria-disabled={!allowSceneOps}
                        className={`rounded-2xl border border-white/12 px-4 py-2 text-sm transition ${
                          allowSceneOps
                            ? "bg-white/6 text-white hover:bg-white/10"
                            : "pointer-events-none bg-white/[0.03] text-white/40"
                        }`}
                      >
                        シーン編集
                      </Link>
                      <Link
                        href={`/scenes/${scene.id}`}
                        aria-disabled={!scene.shared}
                        className={`rounded-2xl border border-white/12 px-4 py-2 text-sm transition ${
                          scene.shared
                            ? "bg-white/6 text-white hover:bg-white/10"
                            : "pointer-events-none bg-white/[0.03] text-white/40"
                        }`}
                      >
                        共有リンク
                      </Link>
                    </div>
                  </section>
                ))}
              </div>
              {organization.scenes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-10 text-center text-sm text-white/58">
                  この組織にはまだシーンがありません。
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
