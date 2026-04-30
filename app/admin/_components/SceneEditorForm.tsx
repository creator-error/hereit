import { createSceneAction, updateSceneAction } from "@/app/admin/actions";
import type { ManageableOrganizationOption } from "@/server/repositories/user-repository";

type SceneEditorFormProps = {
  mode: "create" | "edit";
  organizations: ManageableOrganizationOption[];
  initialValue?: {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    shared: boolean;
    roomPlyUrl: string | null;
    roomGlbUrl: string | null;
  };
};

export function SceneEditorForm({ mode, organizations, initialValue }: SceneEditorFormProps) {
  const action = mode === "create" ? createSceneAction : updateSceneAction;

  return (
    <form action={action} className="space-y-6 rounded-[32px] border border-white/10 bg-[#0c1423] p-8 shadow-2xl shadow-black/20">
      {initialValue ? <input type="hidden" name="sceneId" value={initialValue.id} /> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-white/44">組織</label>
          <select
            name="organizationId"
            required
            defaultValue={initialValue?.organizationId ?? organizations[0]?.id ?? ""}
            className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id} className="bg-[#0b1220] text-white">
                {organization.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-white/44">シーン名</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={initialValue?.name ?? ""}
            className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
            placeholder="メインロビー入口"
          />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-white/44">説明</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={initialValue?.description ?? ""}
          className="mt-2 w-full rounded-3xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
          placeholder="このシーンの用途や確認してほしい相手"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-white/44">PLY URL</label>
          <input
            type="url"
            name="roomPlyUrl"
            defaultValue={initialValue?.roomPlyUrl ?? ""}
            className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
            placeholder="https://r2.example.com/3dgs/organization-id/scene-id/room.ply"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-white/44">GLB URL</label>
          <input
            type="url"
            name="roomGlbUrl"
            defaultValue={initialValue?.roomGlbUrl ?? ""}
            className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
            placeholder="https://r2.example.com/3dgs/organization-id/scene-id/collision.glb"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/84">
        <input
          type="checkbox"
          name="shared"
          defaultChecked={initialValue?.shared ?? false}
          className="h-4 w-4 rounded border-white/20 bg-transparent"
        />
        <span>共有シーンとして公開する</span>
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-2xl bg-[#f59e0b] px-5 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24]"
        >
          {mode === "create" ? "シーンを作成" : "保存"}
        </button>
        <a
          href="/admin"
          className="rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm text-white transition hover:bg-white/10"
        >
          管理画面に戻る
        </a>
      </div>
    </form>
  );
}
