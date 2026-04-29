import { redirect } from "next/navigation";
import { AdminHeader } from "../_components/AdminHeader";
import { AdminRoleEditor } from "../_components/AdminRoleEditor";
import {
  hasAnyRole,
  listAllGroups,
  listUsersWithMemberships,
} from "@/server/repositories/user-repository";
import { getAppSession } from "@/server/auth/session";
import {
  hasUserAdminAccess,
  isBootstrapCandidate,
  sortRoles,
} from "@/features/admin/roles";

export default async function AdminUsersPage() {
  const session = await getAppSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const sessionRoles = sortRoles(session.roles ?? []);
  const bootstrapMode = !(await hasAnyRole("admin"));

  if (
    (!bootstrapMode && !hasUserAdminAccess(sessionRoles)) ||
    (bootstrapMode && !isBootstrapCandidate(sessionRoles))
  ) {
    return (
      <main className="min-h-screen bg-[#0b1220] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-400/20 bg-rose-500/10 p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-rose-200">403</p>
          <h1 className="mt-3 text-3xl font-semibold">Admin access denied</h1>
          <p className="mt-4 text-sm leading-7 text-white/78">
            {bootstrapMode
              ? "`/admin/users` bootstrap は role 未設定のログインユーザー本人に限定されます。"
              : "`/admin/users` は `admin` のみアクセスできます。"}
          </p>
        </div>
      </main>
    );
  }

  const [users, availableGroups] = await Promise.all([
    listUsersWithMemberships(),
    listAllGroups(),
  ]);

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <AdminHeader currentPath="/admin/users" user={session.user} roles={sessionRoles} />
      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-2xl shadow-black/30">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-300">Users</p>
            <h1 className="mt-3 text-4xl font-semibold">User directory and role controls</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72">
              名前、メールアドレス、所属グループ、role を一覧し、必要ならここから権限を更新します。
            </p>
          </section>

          <AdminRoleEditor
            currentUserId={session.user.id}
            currentUserRoles={sessionRoles}
            initialUsers={users}
            availableGroups={availableGroups}
            bootstrapMode={bootstrapMode}
          />
        </div>
      </main>
    </div>
  );
}
