"use client";

import type { JoystickVector } from "@/features/spark-viewer/uiTypes";

type MovementControlKey = "forward" | "back" | "left" | "right" | "up" | "down";

type MovementControlsHudProps = {
  endMovementControl: (key: MovementControlKey) => void;
  joystickOffset: JoystickVector;
  onJoystickPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onJoystickPointerLeave: (event: React.PointerEvent<HTMLDivElement>) => void;
  onJoystickPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onJoystickPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  reduced?: boolean;
  setMovementControl: (key: MovementControlKey, active: boolean) => void;
};

const lateralControls: Array<[MovementControlKey, string, string]> = [
  ["forward", "↑", "top-0 left-[60px]"],
  ["left", "←", "top-[60px] left-0"],
  ["back", "↓", "top-[60px] left-[60px]"],
  ["right", "→", "top-[60px] left-[120px]"],
  ["up", "U", "top-[120px] left-[30px]"],
  ["down", "D", "top-[120px] left-[90px]"],
];

export function MovementControlsHud({
  endMovementControl,
  joystickOffset,
  onJoystickPointerDown,
  onJoystickPointerLeave,
  onJoystickPointerMove,
  onJoystickPointerUp,
  reduced = false,
  setMovementControl,
}: MovementControlsHudProps) {
  if (reduced) {
    return (
      <div className="pointer-events-none absolute left-[max(20px,env(safe-area-inset-left))] bottom-[max(20px,calc(env(safe-area-inset-bottom)+20px))] z-[3] flex flex-col gap-3">
        {(["up", "down"] as const).map((key) => {
          const label = key === "up" ? "U" : "D";
          return (
            <button
              key={key}
              type="button"
              className="pointer-events-auto grid h-[56px] w-[56px] place-items-center rounded-[18px] border border-[rgba(212,175,55,0.3)] bg-[linear-gradient(180deg,rgba(26,31,40,0.92),rgba(15,19,28,0.9))] text-[1.15rem] font-semibold text-white shadow-[0_18px_32px_rgba(0,0,0,0.34)] backdrop-blur-[12px] touch-none select-none active:scale-[0.97]"
              aria-label={`${label}へ移動`}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                setMovementControl(key, true);
              }}
              onPointerUp={() => endMovementControl(key)}
              onPointerCancel={() => endMovementControl(key)}
              onPointerLeave={() => endMovementControl(key)}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute right-[max(16px,env(safe-area-inset-right))] bottom-[max(16px,calc(env(safe-area-inset-bottom)+16px))] left-[max(16px,env(safe-area-inset-left))] z-[2] flex items-end justify-between max-[960px]:bottom-[max(104px,calc(env(safe-area-inset-bottom)+18px))]">
      <div
        className="pointer-events-auto relative hidden h-[148px] w-[148px] rounded-full touch-none max-[960px]:block"
        aria-label="移動ジョイスティック"
        onPointerDown={onJoystickPointerDown}
        onPointerMove={onJoystickPointerMove}
        onPointerUp={onJoystickPointerUp}
        onPointerCancel={onJoystickPointerUp}
        onPointerLeave={onJoystickPointerLeave}
      >
        <div className="absolute inset-0 rounded-full border border-[rgba(125,211,252,0.28)] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.12),rgba(8,17,30,0.7)_68%),rgba(8,17,30,0.62)] shadow-[0_18px_36px_rgba(2,6,23,0.24)] backdrop-blur-[10px]" />
        <div className="absolute top-1/2 left-1/2 h-px w-[84px] -translate-x-1/2 -translate-y-1/2 bg-[rgba(226,232,240,0.14)] max-[960px]:w-[72px]" />
        <div className="absolute top-1/2 left-1/2 h-[84px] w-px -translate-x-1/2 -translate-y-1/2 bg-[rgba(226,232,240,0.14)] max-[960px]:h-[72px]" />
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 h-[52px] w-[52px] rounded-full border border-[rgba(125,211,252,0.4)] bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.35),rgba(125,211,252,0.18)_42%,rgba(14,165,233,0.42)_100%)] shadow-[0_12px_24px_rgba(2,6,23,0.26)] max-[960px]:h-[48px] max-[960px]:w-[48px]"
          style={{
            transform: `translate(calc(-50% + ${joystickOffset.x * 42}px), calc(-50% + ${joystickOffset.y * 42}px))`,
          }}
        />
      </div>
      <div className="relative h-[168px] w-[168px] max-[960px]:hidden">
        {lateralControls.map(([key, label, position]) => (
          <button
            key={key}
            type="button"
            className={`pointer-events-auto absolute grid h-[56px] w-[56px] place-items-center rounded-[18px] border border-[rgba(125,211,252,0.28)] bg-[rgba(8,17,30,0.78)] text-[1.35rem] font-bold text-slate-50 shadow-[0_14px_30px_rgba(2,6,23,0.28)] backdrop-blur-[10px] touch-none select-none active:scale-[0.97] active:border-[rgba(125,211,252,0.58)] active:bg-[rgba(14,165,233,0.34)] max-[960px]:h-[52px] max-[960px]:w-[52px] max-[960px]:rounded-[16px] ${position}`}
            aria-label={`${label}へ移動`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setMovementControl(key, true);
            }}
            onPointerUp={() => endMovementControl(key)}
            onPointerCancel={() => endMovementControl(key)}
            onPointerLeave={() => endMovementControl(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
