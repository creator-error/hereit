import { redirect } from "next/navigation";
import { AdminHeader } from "./_components/AdminHeader";
import { AdminOrganizationSceneBoard } from "./_components/AdminGroupSceneBoard";
import { hasAnyRole, listOrganizationsWithScenesForUser } from "@/server/repositories/user-repository";
import { getAppSession } from "@/server/auth/session";
import { hasWorkspaceAccess, isBootstrapCandidate, sortRoles } from "@/features/admin/roles";

export default async function AdminPage() {
  const session = await getAppSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const sessionRoles = sortRoles(session.roles ?? []);
  const bootstrapMode = !(await hasAnyRole("admin"));

  if (
    (!bootstrapMode && !hasWorkspaceAccess(sessionRoles)) ||
    (bootstrapMode && !isBootstrapCandidate(sessionRoles))
  ) {
    return (
      <main className="min-h-screen bg-[#0b1220] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-400/20 bg-rose-500/10 p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-rose-200">403</p>
          <h1 className="mt-3 text-3xl font-semibold">Admin access denied</h1>
          <p className="mt-4 text-sm leading-7 text-white/78">
            {bootstrapMode
              ? "`/admin` bootstrap は role 未設定のログインユーザー本人に限定されます。"
              : "`/admin` は `admin` / `editor` / `viewer` がアクセスできます。"}
          </p>
        </div>
      </main>
    );
  }

  const organizations = await listOrganizationsWithScenesForUser({
    userId: session.user.id,
    roles: sessionRoles,
  });

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <AdminHeader currentPath="/admin" user={session.user} roles={sessionRoles} />
      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {bootstrapMode ? (
            <section className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm leading-7 text-amber-50">
              初回 bootstrap 中です。正式な権限制御に入る前に、`/admin/users` から自分自身へ
              `admin` を付与してください。
            </section>
          ) : null}
          <AdminOrganizationSceneBoard currentUserRoles={sessionRoles} organizations={organizations} />
        </div>
      </main>
    </div>
  );
}
