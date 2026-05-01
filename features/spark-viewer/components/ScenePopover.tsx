import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { X } from "lucide-react";
import { SparkSceneTagSelection } from "../sceneTypes";

type ScenePopoverProps = {
  activeTag?: SparkSceneTagSelection | null;
  setActiveTag: (tag: SparkSceneTagSelection | null) => void;
};

export function ScenePopover({ activeTag, setActiveTag }: ScenePopoverProps) {
  return (
    <Panel className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ml-[-4px] mb-4 rounded-full w-fit border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] px-3 py-1 text-xs tracking-[0.16em] text-[#e4c46a]">
            情報タグ
          </p>
          <h3 className="text-2xl font-medium leading-tight text-white">{activeTag?.title}</h3>
          <p className="mt-3 text-sm leading-7 text-white/74">{activeTag?.label}</p>
        </div>
        <Button
          onClick={() => setActiveTag(null)}
          className="rounded-full px-3 py-1"
          variant="ghost"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
      {activeTag?.linkUrl && (
        <div className="mt-6">
          <a
            href={activeTag.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-[16px] border border-[rgba(212,175,55,0.4)] bg-[linear-gradient(180deg,rgba(212,175,55,0.28),rgba(160,120,30,0.2))] px-5 py-3 text-sm font-medium text-[#fff8e1] transition hover:border-[rgba(235,203,108,0.55)] hover:bg-[linear-gradient(180deg,rgba(220,183,74,0.34),rgba(160,120,30,0.24))]"
          >
            詳細を見る
          </a>
        </div>
      )}
    </Panel>
  );
}
