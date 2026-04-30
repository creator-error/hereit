"use client";

import { useState } from "react";
import { useToast } from "@/app/_components/ToastProvider";
import {
  ROLE_LABELS,
  ROLE_ORDER,
  canManageRole,
  isAdmin,
  sortRoles,
  touchesPrivilegedRole,
} from "@/features/admin/roles";

type AdminUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

type AdminUserOrganization = {
  organizationId: string;
  organizationName: string;
};

type AdminDirectoryUser = AdminUser & {
  organizations: AdminUserOrganization[];
};

type AdminRoleEditorProps = {
  currentUserId: string;
  currentUserRoles: string[];
  initialUsers: AdminDirectoryUser[];
  availableOrganizations: {
    id: string;
    name: string;
    description: string | null;
  }[];
  bootstrapMode: boolean;
};

function formatRole(role: string) {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}

export function AdminRoleEditor({
  currentUserId,
  currentUserRoles,
  initialUsers,
  availableOrganizations,
  bootstrapMode,
}: AdminRoleEditorProps) {
  const [users, setUsers] = useState(() =>
    initialUsers.map((user) => ({ ...user, roles: sortRoles(user.roles) })),
  );
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>(
    Object.fromEntries(initialUsers.map((user) => [user.id, sortRoles(user.roles)[0] ?? ""])),
  );
  const [draftMemberships, setDraftMemberships] = useState<Record<string, string[]>>(
    Object.fromEntries(
      initialUsers.map((user) => [
        user.id,
        user.organizations.map((organization) => organization.organizationId),
      ]),
    ),
  );
  const [organizationSelections, setOrganizationSelections] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const currentUserIsAdmin = isAdmin(currentUserRoles);
  const { showToast } = useToast();

  const setRole = (userId: string, role: string) => {
    setDraftRoles((current) => ({
      ...current,
      [userId]: role,
    }));
  };

  const addOrganizationMembership = (userId: string) => {
    const organizationId = organizationSelections[userId];

    if (!organizationId) {
      return;
    }

    setDraftMemberships((current) => {
      const next = new Set(current[userId] ?? []);
      next.add(organizationId);

      return {
        ...current,
        [userId]: [...next].sort((left, right) => left.localeCompare(right)),
      };
    });

    setOrganizationSelections((current) => ({
      ...current,
      [userId]: "",
    }));
  };

  const removeOrganizationMembership = (userId: string, organizationId: string) => {
    setDraftMemberships((current) => ({
      ...current,
      [userId]: (current[userId] ?? []).filter((id) => id !== organizationId),
    }));
  };

  const saveRoles = async (userId: string) => {
    const role = draftRoles[userId] ?? "";

    const response = await fetch(`/api/admin/users/${userId}/roles`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roles: role ? [role] : [] }),
    });

    const payload = (await response.json()) as {
      error?: string;
      user?: AdminUser;
    };

    if (!response.ok || !payload.user) {
      throw new Error(payload.error ?? "権限の更新に失敗しました");
    }

    const updatedUser: AdminDirectoryUser = {
      ...payload.user,
      roles: sortRoles(payload.user.roles),
      organizations: users.find((user) => user.id === userId)?.organizations ?? [],
    };

    setUsers((current) => current.map((user) => (user.id === userId ? updatedUser : user)));
    setDraftRoles((current) => ({
      ...current,
      [userId]: updatedUser.roles[0] ?? "",
    }));
  };

  const saveMemberships = async (userId: string) => {
    const organizationIds = draftMemberships[userId] ?? [];
    const response = await fetch(`/api/admin/users/${userId}/memberships`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ organizationIds }),
    });

    const payload = (await response.json()) as {
      error?: string;
      user?: AdminDirectoryUser;
    };

    if (!response.ok || !payload.user) {
      throw new Error(payload.error ?? "所属組織の更新に失敗しました");
    }

    const updatedUser = payload.user;

    setUsers((current) => current.map((user) => (user.id === userId ? updatedUser : user)));
    setDraftMemberships((current) => ({
      ...current,
      [userId]: updatedUser.organizations.map((organization) => organization.organizationId),
    }));
  };

  const saveUserSettings = async (userId: string) => {
    const user = users.find((entry) => entry.id === userId);
    const currentRoles = sortRoles(user?.roles ?? []);
    const currentRole = currentRoles[0] ?? "";
    const draftRole = draftRoles[userId] ?? currentRole;
    const draftOrganizationIds = draftMemberships[userId] ?? [];
    const currentOrganizationIds = (user?.organizations ?? [])
      .map((organization) => organization.organizationId)
      .sort((left, right) => left.localeCompare(right));
    const nextOrganizationIds = [...draftOrganizationIds].sort((left, right) =>
      left.localeCompare(right),
    );
    const roleDirty = draftRole !== currentRole;
    const membershipsDirty =
      JSON.stringify(nextOrganizationIds) !== JSON.stringify(currentOrganizationIds);

    if (!roleDirty && !membershipsDirty) {
      return;
    }

    setSavingUserId(userId);

    try {
      if (roleDirty) {
        await saveRoles(userId);
      }

      if (membershipsDirty) {
        await saveMemberships(userId);
      }

      showToast(
        userId === currentUserId
          ? "権限と所属組織を更新しました。現在ログイン中の利用者の権限変更は、再ログインまたは session 再取得後に反映されます。"
          : "権限と所属組織を更新しました。",
        "success",
      );
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : "不明なエラーが発生しました", "error");
    } finally {
      setSavingUserId(null);
    }
  };

  const showNotice = bootstrapMode || currentUserIsAdmin;
  return (
    <div className="space-y-6">
      {showNotice && (
        <section className="rounded-3xl border border-white/10 bg-[#101827] p-6 shadow-2xl shadow-black/20">
          {bootstrapMode && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              初回 bootstrap 中です。自分自身に admin を付与できます。
            </div>
          )}
          {currentUserIsAdmin && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              管理者はすべての権限を更新できます。
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c1423] shadow-2xl shadow-black/20">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-medium text-white">利用者一覧</h3>
          <p className="mt-1 text-sm text-white/60">
            表示名、メール、所属組織、権限を一覧し、そのまま更新できます。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/84">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-white/48">
              <tr>
                <th className="px-6 py-4 font-medium">利用者</th>
                <th className="px-6 py-4 font-medium">所属組織</th>
                <th className="px-6 py-4 font-medium">権限</th>
                <th className="px-6 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-white/58">
                    ユーザーがまだ存在しません。
                  </td>
                </tr>
              ) : null}
              {users.map((user) => {
                const currentRoles = sortRoles(user.roles);
                const currentRole = currentRoles[0] ?? "";
                const draftRole = draftRoles[user.id] ?? currentRole;
                const organizations = user.organizations;
                const draftOrganizationIds = draftMemberships[user.id] ?? [];
                const dirty = draftRole !== currentRole;
                const membershipsDirty =
                  JSON.stringify(
                    [...draftOrganizationIds].sort((left, right) => left.localeCompare(right)),
                  ) !==
                  JSON.stringify(
                    organizations
                      .map((organization) => organization.organizationId)
                      .sort((left, right) => left.localeCompare(right)),
                  );
                const targetIsPrivileged = touchesPrivilegedRole(currentRoles);
                const adminBlockedTarget = !currentUserIsAdmin && targetIsPrivileged;
                const availableOrganizationOptions = availableOrganizations.filter(
                  (organization) => !draftOrganizationIds.includes(organization.id),
                );

                return (
                  <tr key={user.id} className="align-top">
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="font-medium text-white">
                          {user.displayName ?? "表示名なし"}
                        </div>
                        <div className="break-all text-white/60">
                          {user.email ?? "メールアドレスなし"}
                        </div>
                        {user.id === currentUserId ? (
                          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                            自分
                          </span>
                        ) : null}
                        {adminBlockedTarget ? (
                          <span className="inline-flex rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-100">
                            管理対象外
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {draftOrganizationIds.length > 0 ? (
                            draftOrganizationIds.map((organizationId) => {
                              const organization = availableOrganizations.find(
                                (entry) => entry.id === organizationId,
                              );

                              if (!organization) {
                                return null;
                              }

                              return (
                                <span
                                  key={organization.id}
                                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-50"
                                >
                                  {organization.name}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeOrganizationMembership(user.id, organization.id)
                                    }
                                    className="rounded-full border border-sky-300/20 px-1.5 py-0.5 text-[10px] text-sky-100 transition hover:bg-sky-400/10"
                                  >
                                    削除
                                  </button>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-white/42">所属組織なし</span>
                          )}
                        </div>
                        {availableOrganizationOptions.length > 0 ? (
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <select
                              value={organizationSelections[user.id] ?? ""}
                              onChange={(event) => {
                                const value = event.currentTarget.value;
                                setOrganizationSelections((current) => ({
                                  ...current,
                                  [user.id]: value,
                                }));
                              }}
                              className="min-w-0 flex-1 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white outline-none"
                            >
                              <option value="" className="bg-[#0b1220] text-white">
                                追加する組織を選択
                              </option>
                              {availableOrganizationOptions.map((organization) => (
                                <option
                                  key={organization.id}
                                  value={organization.id}
                                  className="bg-[#0b1220] text-white"
                                >
                                  {organization.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => addOrganizationMembership(user.id)}
                              disabled={!(organizationSelections[user.id] ?? "")}
                              className="rounded-xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/40"
                            >
                              組織を追加
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-white/44">追加できる組織はありません。</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-3">
                        {(() => {
                          const editableRoles = ROLE_ORDER.filter((role) =>
                            bootstrapMode && user.id === currentUserId
                              ? role === "admin"
                              : canManageRole(currentUserRoles, role, currentRoles),
                          );
                          const disabled =
                            editableRoles.length === 0 ||
                            (bootstrapMode && user.id !== currentUserId);

                          return (
                            <select
                              value={draftRole}
                              disabled={disabled}
                              onChange={(event) => setRole(user.id, event.currentTarget.value)}
                              className="w-full rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {currentRole ? null : (
                                <option value="" className="bg-[#0b1220] text-white">
                                  権限を選択
                                </option>
                              )}
                              {editableRoles.map((role) => (
                                <option key={role} value={role} className="bg-[#0b1220] text-white">
                                  {formatRole(role)}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                        {!currentUserIsAdmin && !bootstrapMode ? (
                          <p className="text-xs leading-6 text-white/46">
                            権限更新は管理者のみ可能です。
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        disabled={
                          (!dirty && !membershipsDirty) ||
                          savingUserId === user.id ||
                          adminBlockedTarget
                        }
                        onClick={() => saveUserSettings(user.id)}
                        className="inline-flex items-center justify-center rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:bg-[#6b7280] disabled:text-white/70"
                      >
                        {savingUserId === user.id ? "保存中..." : "保存"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!bootstrapMode ? (
          <div className="border-t border-white/10 px-6 py-4 text-xs leading-6 text-white/46">
            権限更新後、対象が現在のログインユーザー自身なら session
            の再取得まで画面表示と権限判定がずれる可能性があります。
          </div>
        ) : null}
      </section>
    </div>
  );
}
