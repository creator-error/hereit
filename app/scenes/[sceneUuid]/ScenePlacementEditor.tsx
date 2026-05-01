"use client";

export type EditableScenePlacement =
  | {
      id: string;
      kind: "audio";
      position: {
        x: number;
        y: number;
        z: number;
      };
      url: string;
      gain: string;
      loop: boolean;
    }
  | {
      id: string;
      kind: "tag";
      position: {
        x: number;
        y: number;
        z: number;
      };
      title: string;
      description: string;
      linkUrl: string;
    };

export type EditableScenePlacementDraft = EditableScenePlacement;

type PlacementEditorState = {
  draft: EditableScenePlacementDraft;
  mode: "create" | "edit";
};

type ScenePlacementEditorProps = {
  canEdit: boolean;
  editorState: PlacementEditorState | null;
  onCancelEditor: () => void;
  onChangeDraft: (draft: EditableScenePlacementDraft) => void;
  onDeletePlacement: (id: string) => void;
  onEditPlacement: (id: string) => void;
  onSave: () => void;
  onSelectPlacement: (id: string) => void;
  onSubmitDraft: () => void;
  placements: EditableScenePlacement[];
  saving: boolean;
  selectedPlacementId: string | null;
};

function formatPosition(position: { x: number; y: number; z: number }) {
  return `${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`;
}

export function createAudioPlacementDraft(position: {
  x: number;
  y: number;
  z: number;
}): EditableScenePlacementDraft {
  return {
    id: crypto.randomUUID(),
    kind: "audio",
    position,
    url: "",
    gain: "1",
    loop: true,
  };
}

export function ScenePlacementEditor({
  canEdit,
  editorState,
  onCancelEditor,
  onChangeDraft,
  onDeletePlacement,
  onEditPlacement,
  onSave,
  onSelectPlacement,
  onSubmitDraft,
  placements,
  saving,
  selectedPlacementId,
}: ScenePlacementEditorProps) {
  return (
    <>
      <section className="rounded-[32px] border border-white/10 bg-[#0c1423] p-8 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/46">Scene Placements</p>
            <p className="mt-2 text-sm text-white/68">
              建物をダブルクリックすると、その位置に音声またはタグを追加できます。座標は手入力せず、
              一覧から編集か削除だけを行います。
            </p>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-2xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:bg-[#475569] disabled:text-white/60"
            >
              {saving ? "保存中..." : "配置を保存"}
            </button>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {placements.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-8 text-center text-sm text-white/58">
              配置はまだありません。Viewer 上で建物をダブルクリックすると追加できます。
            </div>
          ) : null}
          {placements.map((placement, index) => {
            if (!placement.id) return null;
            const active = placement.id === selectedPlacementId;
            const title = placement.kind === "audio" ? "音声" : "タグ";
            const detail =
              placement.kind === "audio"
                ? placement.url || "URL 未設定"
                : placement.title || "タイトル未設定";

            return (
              <div
                key={placement.id}
                className={`rounded-3xl border p-4 transition ${
                  active ? "border-sky-300/40 bg-sky-500/10" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectPlacement(placement.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs tracking-[0.18em] text-white/62">
                        {title}
                      </span>
                      <span className="text-xs text-white/44">#{index + 1}</span>
                    </div>
                    <p className="mt-3 truncate text-base font-medium text-white">{detail}</p>
                    {placement.kind === "tag" ? (
                      <p className="mt-2 text-sm text-white/64 line-clamp-2">
                        {placement.description || "説明未設定"}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-white/56">
                      位置: ({formatPosition(placement.position)})
                    </p>
                    {placement.kind === "audio" ? (
                      <p className="mt-1 text-xs text-white/56">
                        ループ: {placement.loop ? "ON" : "OFF"} / 音量: {placement.gain}
                      </p>
                    ) : null}
                  </button>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => onEditPlacement(placement.id)}
                        className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePlacement(placement.id)}
                        className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
                      >
                        削除
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {editorState ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#020617]/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#0c1423] p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-sky-300">
                  {editorState.mode === "create" ? "新規配置" : "配置を編集"}
                </p>
                <h3 className="mt-2 text-2xl font-medium text-white">
                  {editorState.draft.kind === "audio" ? "音声設定" : "タグ設定"}
                </h3>
                <p className="mt-2 text-sm text-white/62">
                  位置: ({formatPosition(editorState.draft.position)})
                </p>
              </div>
              <button
                type="button"
                onClick={onCancelEditor}
                className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white transition hover:bg-white/10"
              >
                閉じる
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm text-white/72">
                種別
                <select
                  value={editorState.draft.kind}
                  onChange={(event) => {
                    const nextKind = event.target.value === "tag" ? "tag" : "audio";
                    if (nextKind === "audio") {
                      onChangeDraft(
                        "url" in editorState.draft
                          ? { ...editorState.draft, kind: "audio" }
                          : {
                              id: editorState.draft.id,
                              kind: "audio",
                              position: editorState.draft.position,
                              url: "",
                              gain: "1",
                              loop: true,
                            },
                      );
                      return;
                    }

                    onChangeDraft(
                      "description" in editorState.draft
                        ? { ...editorState.draft, kind: "tag" }
                        : {
                            id: editorState.draft.id,
                            kind: "tag",
                            position: editorState.draft.position,
                            title: "",
                            description: "",
                            linkUrl: "",
                          },
                    );
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="audio">音声</option>
                  <option value="tag">タグ</option>
                </select>
              </label>

              {editorState.draft.kind === "audio" ? (
                <>
                  <label className="block text-sm text-white/72">
                    URL
                    <input
                      type="url"
                      value={editorState.draft.url}
                      onChange={(event) => {
                        const draft = editorState.draft as Extract<
                          EditableScenePlacementDraft,
                          { kind: "audio" }
                        >;
                        onChangeDraft({
                          ...draft,
                          url: event.target.value,
                        });
                      }}
                      className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-[1fr,auto]">
                    <label className="block text-sm text-white/72">
                      音量
                      <input
                        type="number"
                        step="0.1"
                        value={editorState.draft.gain}
                        onChange={(event) => {
                          const draft = editorState.draft as Extract<
                            EditableScenePlacementDraft,
                            { kind: "audio" }
                          >;
                          onChangeDraft({
                            ...draft,
                            gain: event.target.value,
                          });
                        }}
                        className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                      />
                    </label>
                    <label className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={editorState.draft.loop}
                        onChange={(event) => {
                          const draft = editorState.draft as Extract<
                            EditableScenePlacementDraft,
                            { kind: "audio" }
                          >;
                          onChangeDraft({
                            ...draft,
                            loop: event.target.checked,
                          });
                        }}
                      />
                      ループ再生
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <label className="block text-sm text-white/72">
                    タイトル
                    <input
                      type="text"
                      value={editorState.draft.title}
                      onChange={(event) => {
                        const draft = editorState.draft as Extract<
                          EditableScenePlacementDraft,
                          { kind: "tag" }
                        >;
                        onChangeDraft({
                          ...draft,
                          title: event.target.value,
                        });
                      }}
                      className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                  <label className="block text-sm text-white/72">
                    説明
                    <textarea
                      value={editorState.draft.description}
                      onChange={(event) => {
                        const draft = editorState.draft as Extract<
                          EditableScenePlacementDraft,
                          { kind: "tag" }
                        >;
                        onChangeDraft({
                          ...draft,
                          description: event.target.value,
                        });
                      }}
                      rows={4}
                      className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                  <label className="block text-sm text-white/72">
                    詳細リンク URL
                    <input
                      type="url"
                      value={editorState.draft.linkUrl}
                      onChange={(event) => {
                        const draft = editorState.draft as Extract<
                          EditableScenePlacementDraft,
                          { kind: "tag" }
                        >;
                        onChangeDraft({
                          ...draft,
                          linkUrl: event.target.value,
                        });
                      }}
                      className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancelEditor}
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={onSubmitDraft}
                className="rounded-2xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24]"
              >
                {editorState.mode === "create" ? "追加する" : "更新する"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
