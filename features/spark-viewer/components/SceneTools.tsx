"use client";
import { useState } from "react";
import { useToast } from "@/components/layout/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Megaphone, MegaphoneOff, ChevronsUp, ChevronsDown, Share2 } from "lucide-react";
import { joinClasses } from "@/components/util/joinClasses";

type ViewerToolsProps = {
  className: string | null;
  setMovementControl: (key: "up" | "down", active: boolean) => void;
  endMovementControl: (key: "up" | "down") => void;
  setSoundEnabled: (enabled: boolean) => void;
};

export function SceneTools({
  className,
  setMovementControl,
  endMovementControl,
  setSoundEnabled,
}: ViewerToolsProps) {
  const [soundEnabled, uiToggleSound] = useState(false);
  const { showToast } = useToast();
  return (
    <div className={joinClasses("z-[3] flex flex-col gap-3", className)}>
      <Button
        variant="primary"
        size="icon"
        onClick={async () => {
          try {
            const url = document.location.href;
            await navigator.clipboard.writeText(url);
            showToast("共有URLをコピーしました。", "success");
          } catch {
            showToast("共有URLのコピーに失敗しました。", "error");
          }
        }}
      >
        <Share2 className="h-6 w-6" />
      </Button>
      {setSoundEnabled && (
        <Button
          variant="primary"
          size="icon"
          title={soundEnabled ? "Disable Sound" : "Enable Sound"}
          onClick={() => {
            uiToggleSound(!soundEnabled);
            setSoundEnabled(!soundEnabled);
          }}
        >
          {soundEnabled ? <Megaphone className="h-6 w-6" /> : <MegaphoneOff className="h-6 w-6" />}
        </Button>
      )}
      <Button
        variant="primary"
        size="icon"
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          setMovementControl("up", true);
        }}
        onPointerUp={() => endMovementControl("up")}
        onPointerCancel={() => endMovementControl("up")}
        onPointerLeave={() => endMovementControl("up")}
      >
        <ChevronsUp className="h-6 w-6" />
      </Button>
      <Button
        variant="primary"
        size="icon"
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          setMovementControl("down", true);
        }}
        onPointerUp={() => endMovementControl("down")}
        onPointerCancel={() => endMovementControl("down")}
        onPointerLeave={() => endMovementControl("down")}
      >
        <ChevronsDown className="h-6 w-6" />
      </Button>
    </div>
  );
}
