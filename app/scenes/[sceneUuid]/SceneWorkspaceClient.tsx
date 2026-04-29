"use client";

import { useState } from "react";
import { SceneAudioEditor, createEmptyPlacement, type EditableSceneAudioPlacement } from "./SceneAudioEditor";
import { SceneViewerClient } from "./SceneViewerClient";
import type { AppAudioPlacement } from "@/server/repositories/user-repository";

type SceneWorkspaceClientProps = {
  canEdit: boolean;
  initialPlacements: AppAudioPlacement[];
  sceneId: string;
  collisionAssetUrl: string | null;
  splatAssetUrl: string | null;
};

function mapPlacement(placement: AppAudioPlacement): EditableSceneAudioPlacement {
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

export function SceneWorkspaceClient({
  canEdit,
  initialPlacements,
  sceneId,
  collisionAssetUrl,
  splatAssetUrl,
}: SceneWorkspaceClientProps) {
  const [placements, setPlacements] = useState<EditableSceneAudioPlacement[]>(
    initialPlacements.map(mapPlacement),
  );
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(
    initialPlacements[0]?.id ?? null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updatePlacement(
    id: string,
    updater: (current: EditableSceneAudioPlacement) => EditableSceneAudioPlacement,
  ) {
    setPlacements((current) =>
      current.map((placement) => (placement.id === id ? updater(placement) : placement)),
    );
  }

  function addPlacement() {
    const placement = createEmptyPlacement();
    setPlacements((current) => [...current, placement]);
    setSelectedPlacementId(placement.id);
  }

  function removePlacement(id: string) {
    setPlacements((current) => current.filter((placement) => placement.id !== id));
    setSelectedPlacementId((current) => (current === id ? null : current));
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/scenes/${sceneId}/audio-placements`, {
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
        placements?: AppAudioPlacement[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Save failed");
      }

      const nextPlacements = (payload.placements ?? []).map(mapPlacement);
      setPlacements(nextPlacements);
      setSelectedPlacementId(nextPlacements[0]?.id ?? null);
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <SceneViewerClient
          audioSources={placements
            .filter((placement) => placement.url.trim().length > 0)
            .map((placement) => ({
              gain: Number(placement.gain) || 1,
              loop: placement.loop,
              name: placement.name || placement.originalFilename || "audio",
              position: {
                x: Number(placement.position.x) || 0,
                y: Number(placement.position.y) || 0,
                z: Number(placement.position.z) || 0,
              },
              url: placement.url,
            }))}
          splatAssetUrl={splatAssetUrl}
          collisionAssetUrl={collisionAssetUrl}
        />
      </section>

      <SceneAudioEditor
        canEdit={canEdit}
        onAddPlacement={addPlacement}
        onRemovePlacement={removePlacement}
        onSave={handleSave}
        onSelectPlacement={setSelectedPlacementId}
        onUpdatePlacement={updatePlacement}
        placements={placements}
        saving={saving}
        selectedPlacementId={selectedPlacementId}
        status={status}
      />
    </div>
  );
}
