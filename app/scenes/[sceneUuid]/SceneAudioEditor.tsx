"use client";

export type EditableSceneAudioPlacement = {
  id: string;
  name: string;
  url: string;
  originalFilename: string;
  mimeType: string;
  byteSize: string;
  position: {
    x: string;
    y: string;
    z: string;
  };
  rotation: {
    x: string;
    y: string;
    z: string;
  };
  gain: string;
  loop: boolean;
};

type SceneAudioEditorProps = {
  canEdit: boolean;
  onAddPlacement: () => void;
  onRemovePlacement: (id: string) => void;
  onSave: () => void;
  onSelectPlacement: (id: string) => void;
  onUpdatePlacement: (
    id: string,
    updater: (current: EditableSceneAudioPlacement) => EditableSceneAudioPlacement,
  ) => void;
  placements: EditableSceneAudioPlacement[];
  saving: boolean;
  selectedPlacementId: string | null;
  status: string | null;
};

const POSITION_NUDGE_STEP = 0.25;

export function createEmptyPlacement(): EditableSceneAudioPlacement {
  return {
    id: crypto.randomUUID(),
    name: "",
    url: "",
    originalFilename: "",
    mimeType: "",
    byteSize: "",
    position: { x: "0", y: "0", z: "0" },
    rotation: { x: "0", y: "0", z: "0" },
    gain: "1",
    loop: true,
  };
}

export function SceneAudioEditor({
  canEdit,
  onAddPlacement,
  onRemovePlacement,
  onSave,
  onSelectPlacement,
  onUpdatePlacement,
  placements,
  saving,
  selectedPlacementId,
  status,
}: SceneAudioEditorProps) {
  const selectedPlacement =
    placements.find((placement) => placement.id === selectedPlacementId) ?? placements[0] ?? null;

  function nudgeSelected(axis: "x" | "y" | "z", delta: number) {
    if (!selectedPlacement || !canEdit) {
      return;
    }

    onUpdatePlacement(selectedPlacement.id, (current) => ({
      ...current,
      position: {
        ...current.position,
        [axis]: (Number(current.position[axis]) + delta).toFixed(2),
      },
    }));
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-[#0c1423] p-8 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/46">Audio Placements</p>
          <p className="mt-2 text-sm text-white/68">
            Scene ごとの audio URL と座標を保存します。選択中の音源は viewer に即時反映されるので、
            URL と座標を調整しながら配置を詰められます。
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onAddPlacement}
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Add Audio
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-2xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:bg-[#475569] disabled:text-white/60"
            >
              {saving ? "Saving..." : "Save Audio"}
            </button>
          </div>
        ) : null}
      </div>

      {status ? <p className="mt-4 text-sm text-white/78">{status}</p> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr,1.3fr]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-white/42">Sources</p>
          {placements.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-8 text-center text-sm text-white/58">
              Audio placement はまだありません。
            </div>
          ) : null}
          {placements.map((placement, index) => {
            const active = placement.id === selectedPlacement?.id;
            return (
              <button
                key={placement.id}
                type="button"
                onClick={() => onSelectPlacement(placement.id)}
                className={`w-full rounded-3xl border p-4 text-left transition ${
                  active
                    ? "border-sky-300/40 bg-sky-500/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-white/44">
                  Audio {index + 1}
                </p>
                <p className="mt-2 text-base font-medium text-white">
                  {placement.name || placement.originalFilename || "Untitled audio"}
                </p>
                <p className="mt-2 truncate text-xs text-white/56">{placement.url || "No URL"}</p>
                <p className="mt-3 text-xs text-white/56">
                  ({placement.position.x}, {placement.position.y}, {placement.position.z})
                </p>
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {!selectedPlacement ? null : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/44">
                    Selected Audio
                  </p>
                  <h3 className="mt-2 text-xl font-medium text-white">
                    {selectedPlacement.name || selectedPlacement.originalFilename || "Untitled audio"}
                  </h3>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onRemovePlacement(selectedPlacement.id)}
                    className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label className="text-sm text-white/72">
                  Name
                  <input
                    type="text"
                    value={selectedPlacement.name}
                    disabled={!canEdit}
                    onChange={(event) =>
                      onUpdatePlacement(selectedPlacement.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
                <label className="text-sm text-white/72">
                  URL
                  <input
                    type="text"
                    value={selectedPlacement.url}
                    disabled={!canEdit}
                    onChange={(event) =>
                      onUpdatePlacement(selectedPlacement.id, (current) => ({
                        ...current,
                        url: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-[#08111e] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/44">Position</p>
                    <p className="mt-2 text-sm text-white/60">
                      調整ボタンは viewer の音源位置へ即時反映されます。
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  {(["x", "y", "z"] as const).map((axis) => (
                    <label key={`pos-${axis}`} className="text-sm text-white/72">
                      {axis.toUpperCase()}
                      <input
                        type="number"
                        step="0.01"
                        value={selectedPlacement.position[axis]}
                        disabled={!canEdit}
                        onChange={(event) =>
                          onUpdatePlacement(selectedPlacement.id, (current) => ({
                            ...current,
                            position: { ...current.position, [axis]: event.target.value },
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                  ))}
                  <label className="text-sm text-white/72">
                    Gain
                    <input
                      type="number"
                      step="0.1"
                      value={selectedPlacement.gain}
                      disabled={!canEdit}
                      onChange={(event) =>
                        onUpdatePlacement(selectedPlacement.id, (current) => ({
                          ...current,
                          gain: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                </div>

                {canEdit ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {(["x", "y", "z"] as const).map((axis) => (
                      <div key={`nudge-${axis}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/44">
                          Move {axis.toUpperCase()}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => nudgeSelected(axis, -POSITION_NUDGE_STEP)}
                            className="flex-1 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                          >
                            -0.25
                          </button>
                          <button
                            type="button"
                            onClick={() => nudgeSelected(axis, POSITION_NUDGE_STEP)}
                            className="flex-1 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                          >
                            +0.25
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-3 text-sm text-white/72">
                  <input
                    type="checkbox"
                    checked={selectedPlacement.loop}
                    disabled={!canEdit}
                    onChange={(event) =>
                      onUpdatePlacement(selectedPlacement.id, (current) => ({
                        ...current,
                        loop: event.target.checked,
                      }))
                    }
                  />
                  Loop
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
