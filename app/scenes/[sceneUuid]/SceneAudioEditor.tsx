"use client";

import { useState } from "react";

type EditablePlacement = {
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
  initialPlacements: Array<{
    id: string;
    name: string | null;
    url: string;
    originalFilename: string | null;
    mimeType: string | null;
    byteSize: number | null;
    position: {
      x: number;
      y: number;
      z: number;
    };
    rotation: {
      x: number;
      y: number;
      z: number;
    };
    gain: number;
    loop: boolean;
  }>;
  sceneUuid: string;
};

function createEmptyPlacement(): EditablePlacement {
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

function mapPlacement(
  placement: SceneAudioEditorProps["initialPlacements"][number],
): EditablePlacement {
  return {
    id: placement.id,
    name: placement.name ?? "",
    url: placement.url,
    originalFilename: placement.originalFilename ?? "",
    mimeType: placement.mimeType ?? "",
    byteSize: placement.byteSize?.toString() ?? "",
    position: {
      x: placement.position.x.toString(),
      y: placement.position.y.toString(),
      z: placement.position.z.toString(),
    },
    rotation: {
      x: placement.rotation.x.toString(),
      y: placement.rotation.y.toString(),
      z: placement.rotation.z.toString(),
    },
    gain: placement.gain.toString(),
    loop: placement.loop,
  };
}

export function SceneAudioEditor({
  canEdit,
  initialPlacements,
  sceneUuid,
}: SceneAudioEditorProps) {
  const [placements, setPlacements] = useState<EditablePlacement[]>(
    initialPlacements.map(mapPlacement),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updatePlacement(
    id: string,
    updater: (current: EditablePlacement) => EditablePlacement,
  ) {
    setPlacements((current) =>
      current.map((placement) => (placement.id === id ? updater(placement) : placement)),
    );
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/scenes/${sceneUuid}/audio-placements`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placements: placements.map((placement) => ({
            name: placement.name || null,
            url: placement.url,
            originalFilename: placement.originalFilename || null,
            mimeType: placement.mimeType || null,
            byteSize: placement.byteSize ? Number(placement.byteSize) : null,
            position: {
              x: Number(placement.position.x),
              y: Number(placement.position.y),
              z: Number(placement.position.z),
            },
            rotation: {
              x: Number(placement.rotation.x),
              y: Number(placement.rotation.y),
              z: Number(placement.rotation.z),
            },
            gain: Number(placement.gain),
            loop: placement.loop,
          })),
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        placements?: SceneAudioEditorProps["initialPlacements"];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Save failed");
      }

      setPlacements((payload.placements ?? []).map(mapPlacement));
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-[#0c1423] p-8 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/46">Audio Placements</p>
          <p className="mt-2 text-sm text-white/68">
            Scene ごとの audio URL と座標を保存します。Viewer 上のドラッグ編集ではなく、まずは
            API ベースで再読込できる形を先に入れています。
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPlacements((current) => [...current, createEmptyPlacement()])}
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Add Audio
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:bg-[#475569] disabled:text-white/60"
            >
              {saving ? "Saving..." : "Save Audio"}
            </button>
          </div>
        ) : null}
      </div>

      {status ? <p className="mt-4 text-sm text-white/78">{status}</p> : null}

      <div className="mt-6 space-y-4">
        {placements.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-8 text-center text-sm text-white/58">
            Audio placement はまだありません。
          </div>
        ) : null}

        {placements.map((placement) => (
          <div
            key={placement.id}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm text-white/72">
                Name
                <input
                  type="text"
                  value={placement.name}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updatePlacement(placement.id, (current) => ({
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
                  value={placement.url}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updatePlacement(placement.id, (current) => ({
                      ...current,
                      url: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              {(["x", "y", "z"] as const).map((axis) => (
                <label key={`pos-${axis}`} className="text-sm text-white/72">
                  Position {axis.toUpperCase()}
                  <input
                    type="number"
                    step="0.01"
                    value={placement.position[axis]}
                    disabled={!canEdit}
                    onChange={(event) =>
                      updatePlacement(placement.id, (current) => ({
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
                  value={placement.gain}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updatePlacement(placement.id, (current) => ({
                      ...current,
                      gain: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 text-sm text-white/72">
                <input
                  type="checkbox"
                  checked={placement.loop}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updatePlacement(placement.id, (current) => ({
                      ...current,
                      loop: event.target.checked,
                    }))
                  }
                />
                Loop
              </label>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() =>
                    setPlacements((current) => current.filter((item) => item.id !== placement.id))
                  }
                  className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
