import { redirect } from "next/navigation";
import { AdminHeader } from "../../_components/AdminHeader";
import { SceneEditorForm } from "../../_components/SceneEditorForm";
import { getAppSession } from "@/server/auth/session";
import { hasWorkspaceAccess, sortRoles } from "@/features/admin/roles";
import { listManageableOrganizationsForUser } from "@/server/repositories/user-repository";

type PageProps = {
  searchParams: Promise<{
    organizationId?: string;
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

  const organizations = await listManageableOrganizationsForUser({
    userId: session.user.id,
    roles: sessionRoles,
  });

  if (organizations.length === 0) {
    redirect("/admin");
  }

  const params = await searchParams;
  const selectedOrganizationId = organizations.some((organization) => organization.id === params.organizationId)
    ? params.organizationId
    : organizations[0]?.id;

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <AdminHeader currentPath="/admin" user={session.user} roles={sessionRoles} />
      <main className="px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-2xl shadow-black/30">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-300">新規シーン</p>
            <h1 className="mt-3 text-4xl font-semibold">組織内にシーンを作成</h1>
          </section>
          <SceneEditorForm
            mode="create"
            organizations={organizations}
            initialValue={
              selectedOrganizationId
                ? {
                    id: "",
                    organizationId: selectedOrganizationId,
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
