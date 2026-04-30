"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  createAudioPlacementDraft,
  ScenePlacementEditor,
  type EditableScenePlacement,
  type EditableScenePlacementDraft,
} from "./ScenePlacementEditor";
import { SceneViewerClient } from "./SceneViewerClient";
import { useToast } from "@/app/_components/ToastProvider";
import type { SceneInitialView, SparkScenePlacement } from "@/features/spark-viewer/sceneTypes";
import type { AppScenePlacement } from "@/server/repositories/user-repository";

type SceneWorkspaceClientProps = {
  canEdit: boolean;
  initialSceneView: SceneInitialView | null;
  initialPlacements: AppScenePlacement[];
  sceneId: string;
  collisionAssetUrl: string | null;
  splatAssetUrl: string | null;
};

type PlacementEditorState = {
  draft: EditableScenePlacementDraft;
  mode: "create" | "edit";
};

function mapPlacement(placement: AppScenePlacement): EditableScenePlacement {
  if (placement.kind === "audio") {
    return {
      id: placement.id,
      kind: "audio",
      position: placement.position,
      url: placement.url,
      gain: placement.gain.toString(),
      loop: placement.loop,
    };
  }

  return {
    id: placement.id,
    kind: "tag",
    position: placement.position,
    title: placement.title,
    description: placement.description,
    linkUrl: placement.linkUrl ?? "",
  };
}

export function SceneWorkspaceClient({
  canEdit,
  initialSceneView,
  initialPlacements,
  sceneId,
  collisionAssetUrl,
  splatAssetUrl,
}: SceneWorkspaceClientProps) {
  const [placements, setPlacements] = useState<EditableScenePlacement[]>(
    initialPlacements.map(mapPlacement),
  );
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(
    initialPlacements[0]?.id ?? null,
  );
  const [editorState, setEditorState] = useState<PlacementEditorState | null>(null);
  const latestViewerViewRef = useRef<SceneInitialView | null>(initialSceneView);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const viewerPlacements = useMemo<SparkScenePlacement[]>(
    () =>
      placements.map((placement) =>
        placement.kind === "audio"
          ? {
              gain: Number(placement.gain) || 1,
              id: placement.id,
              kind: "audio",
              label: "音声",
              loop: placement.loop,
              position: placement.position,
              selected: placement.id === selectedPlacementId,
              url: placement.url,
            }
          : {
              id: placement.id,
              kind: "tag",
              label: placement.description,
              linkUrl: placement.linkUrl || null,
              title: placement.title,
              position: placement.position,
              selected: placement.id === selectedPlacementId,
            },
      ),
    [placements, selectedPlacementId],
  );

  const handleCreatePlacementAtPoint = useCallback(
    (position: { x: number; y: number; z: number }) => {
      if (!canEdit) {
        return;
      }

      const draft = createAudioPlacementDraft({
        x: Number(position.x.toFixed(2)),
        y: Number(position.y.toFixed(2)),
        z: Number(position.z.toFixed(2)),
      });
      setEditorState({
        draft,
        mode: "create",
      });
    },
    [canEdit],
  );

  const handleViewStateChange = useCallback((view: SceneInitialView) => {
    latestViewerViewRef.current = view;
  }, []);

  function handleEditPlacement(id: string) {
    const target = placements.find((placement) => placement.id === id);

    if (!target) {
      return;
    }

    setSelectedPlacementId(id);
    setEditorState({
      draft: target,
      mode: "edit",
    });
  }

  function handleDeletePlacement(id: string) {
    setPlacements((current) => current.filter((placement) => placement.id !== id));
    setSelectedPlacementId((current) => {
      if (current !== id) {
        return current;
      }

      const next = placements.find((placement) => placement.id !== id);
      return next?.id ?? null;
    });
    if (editorState?.draft.id === id) {
      setEditorState(null);
    }
    showToast("配置を一覧から外しました。保存すると反映されます。", "info");
  }

  function handleSubmitDraft() {
    if (!editorState) {
      return;
    }

    if (editorState.draft.kind === "audio") {
      if (editorState.draft.url.trim().length === 0) {
        showToast("音声 URL を入力してください。", "error");
        return;
      }

      const gain = Number(editorState.draft.gain);
      if (!Number.isFinite(gain)) {
        showToast("音量は数値で入力してください。", "error");
        return;
      }
    }

    if (editorState.draft.kind === "tag" && editorState.draft.title.trim().length === 0) {
      showToast("タグのタイトルを入力してください。", "error");
      return;
    }

    if (editorState.draft.kind === "tag" && editorState.draft.description.trim().length === 0) {
      showToast("タグの説明を入力してください。", "error");
      return;
    }

    if (editorState.mode === "create") {
      setPlacements((current) => [...current, editorState.draft]);
      setSelectedPlacementId(editorState.draft.id);
      showToast("配置を追加しました。保存すると反映されます。", "success");
    } else {
      setPlacements((current) =>
        current.map((placement) =>
          placement.id === editorState.draft.id ? editorState.draft : placement,
        ),
      );
      setSelectedPlacementId(editorState.draft.id);
      showToast("配置を更新しました。保存すると反映されます。", "success");
    }

    setEditorState(null);
  }

  async function handleSave() {
    setSaving(true);

    try {
      const response = await fetch(`/api/scenes/${sceneId}/audio-placements`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placements: placements.map((placement) =>
            placement.kind === "audio"
              ? {
                  kind: "audio",
                  position: placement.position,
                  url: placement.url,
                  gain: Number(placement.gain),
                  loop: placement.loop,
                }
              : {
                  kind: "tag",
                  position: placement.position,
                  linkUrl: placement.linkUrl,
                  title: placement.title,
                  description: placement.description,
                },
          ),
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        placements?: AppScenePlacement[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Save failed");
      }

      const nextPlacements = (payload.placements ?? []).map(mapPlacement);
      setPlacements(nextPlacements);
      setSelectedPlacementId((current) =>
        nextPlacements.some((placement) => placement.id === current)
          ? current
          : nextPlacements[0]?.id ?? null,
      );
      showToast("配置設定を保存しました。", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveInitialView() {
    if (!latestViewerViewRef.current) {
      showToast("保存できる視点がまだありません。Scene の表示後にもう一度試してください。", "info");
      return;
    }

    try {
      const response = await fetch(`/api/scenes/${sceneId}/initial-view`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initialView: latestViewerViewRef.current,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Initial view save failed");
      }

      showToast("初期表示位置を保存しました。", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Initial view save failed", "error");
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <SceneViewerClient
          canCreatePlacement={canEdit}
          collisionAssetUrl={collisionAssetUrl}
          initialView={initialSceneView}
          onCreatePlacementAtPoint={handleCreatePlacementAtPoint}
          onSaveInitialView={handleSaveInitialView}
          onViewStateChange={handleViewStateChange}
          placements={viewerPlacements}
          splatAssetUrl={splatAssetUrl}
        />
      </section>

      <ScenePlacementEditor
        canEdit={canEdit}
        editorState={editorState}
        onCancelEditor={() => setEditorState(null)}
        onChangeDraft={(draft) => setEditorState((current) => (current ? { ...current, draft } : current))}
        onDeletePlacement={handleDeletePlacement}
        onEditPlacement={handleEditPlacement}
        onSave={handleSave}
        onSelectPlacement={setSelectedPlacementId}
        onSubmitDraft={handleSubmitDraft}
        placements={placements}
        saving={saving}
        selectedPlacementId={selectedPlacementId}
      />
    </div>
  );
}
