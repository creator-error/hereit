import { notFound, redirect } from "next/navigation";
import { AdminHeader } from "../../../_components/AdminHeader";
import { SceneEditorForm } from "../../../_components/SceneEditorForm";
import { getAppSession } from "@/server/auth/session";
import { hasWorkspaceAccess, sortRoles } from "@/features/admin/roles";
import {
  getSceneForEdit,
  listManageableGroupsForUser,
} from "@/server/repositories/user-repository";

type PageProps = {
  params: Promise<{
    sceneId: string;
  }>;
};

export default async function EditScenePage({ params }: PageProps) {
  const session = await getAppSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const sessionRoles = sortRoles(session.roles ?? []);

  if (!hasWorkspaceAccess(sessionRoles)) {
    redirect("/admin");
  }

  const { sceneId } = await params;
  const [scene, groups] = await Promise.all([
    getSceneForEdit(sceneId),
    listManageableGroupsForUser({
      userId: session.user.id,
      roles: sessionRoles,
    }),
  ]);

  if (!scene) {
    notFound();
  }

  if (groups.length === 0) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <AdminHeader currentPath="/admin" user={session.user} roles={sessionRoles} />
      <main className="px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-2xl shadow-black/30">
            <p className="text-sm uppercase tracking-[0.28em] text-[#f59e0b]">Edit Scene</p>
            <h1 className="mt-3 text-4xl font-semibold">{scene.name}</h1>
          </section>
          <SceneEditorForm mode="edit" groups={groups} initialValue={scene} />
        </div>
      </main>
    </div>
  );
}
