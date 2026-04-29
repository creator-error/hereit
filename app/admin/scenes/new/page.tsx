import { redirect } from "next/navigation";
import { AdminHeader } from "../../_components/AdminHeader";
import { SceneEditorForm } from "../../_components/SceneEditorForm";
import { getAppSession } from "@/server/auth/session";
import { hasWorkspaceAccess, sortRoles } from "@/features/admin/roles";
import { listManageableGroupsForUser } from "@/server/repositories/user-repository";

type PageProps = {
  searchParams: Promise<{
    groupId?: string;
  }>;
};

export default async function NewScenePage({ searchParams }: PageProps) {
  const session = await getAppSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const sessionRoles = sortRoles(session.roles ?? []);

  if (!hasWorkspaceAccess(sessionRoles)) {
    redirect("/admin");
  }

  const groups = await listManageableGroupsForUser({
    userId: session.user.id,
    roles: sessionRoles,
  });

  if (groups.length === 0) {
    redirect("/admin");
  }

  const params = await searchParams;
  const selectedGroupId = groups.some((group) => group.id === params.groupId)
    ? params.groupId
    : groups[0]?.id;

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <AdminHeader currentPath="/admin" user={session.user} roles={sessionRoles} />
      <main className="px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-2xl shadow-black/30">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-300">New Scene</p>
            <h1 className="mt-3 text-4xl font-semibold">Create a scene inside a group</h1>
          </section>
          <SceneEditorForm
            mode="create"
            groups={groups}
            initialValue={
              selectedGroupId
                ? {
                    id: "",
                    groupId: selectedGroupId,
                    name: "",
                    description: null,
                    shared: false,
                    roomPlyUrl: null,
                    roomGlbUrl: null,
                  }
                : undefined
            }
          />
        </div>
      </main>
    </div>
  );
}
