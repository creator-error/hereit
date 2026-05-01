import { Panel } from "@/components/ui/Panel";
import { jc } from "@/components/util/joinClasses";

type ViewerHeaderProps = {
  className: string | null;
  sceneLabel: string | null;
  organizationName: string | null;
  organizationLogoUrl: string | null;
};

export function ViewerHeader({
  className,
  sceneLabel,
  organizationName,
  organizationLogoUrl,
}: ViewerHeaderProps) {
  return (
    <Panel className={jc("flex items-start gap-4 z-30 min-w-[240px]", className)}>
      {organizationLogoUrl && (
        <img src={organizationLogoUrl} alt="" className="h-12 object-cover" />
      )}
      <div>
        <h1 className="text-lg font-semibold text-white">{sceneLabel}</h1>
        <p className="text-sm text-white/80">{organizationName}</p>
      </div>
    </Panel>
  );
}
