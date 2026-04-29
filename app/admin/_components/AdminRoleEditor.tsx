"use client";

import { useState } from "react";
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

type AdminUserGroup = {
  groupId: string;
  groupName: string;
  role: string;
};

type AdminDirectoryUser = AdminUser & {
  groups: AdminUserGroup[];
};

type AdminRoleEditorProps = {
  currentUserId: string;
  currentUserRoles: string[];
  initialUsers: AdminDirectoryUser[];
  availableGroups: {
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
  availableGroups,
  bootstrapMode,
}: AdminRoleEditorProps) {
  const [users, setUsers] = useState(() =>
    initialUsers.map((user) => ({ ...user, roles: sortRoles(user.roles) })),
  );
  const [draftRoles, setDraftRoles] = useState<Record<string, string[]>>(
    Object.fromEntries(initialUsers.map((user) => [user.id, sortRoles(user.roles)])),
  );
  const [draftMemberships, setDraftMemberships] = useState<
    Record<string, Record<string, string>>
  >(
    Object.fromEntries(
      initialUsers.map((user) => [
        user.id,
        Object.fromEntries(user.groups.map((group) => [group.groupId, group.role])),
      ]),
    ),
  );
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingMembershipUserId, setSavingMembershipUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentUserIsAdmin = isAdmin(currentUserRoles);

  const toggleRole = (userId: string, role: string, checked: boolean) => {
    setDraftRoles((current) => {
      const nextRoles = new Set(current[userId] ?? []);

      if (checked) {
        nextRoles.add(role);
      } else {
        nextRoles.delete(role);
      }

      return {
        ...current,
        [userId]: sortRoles([...nextRoles]),
      };
    });
  };

  const toggleGroupMembership = (userId: string, groupId: string, checked: boolean) => {
    setDraftMemberships((current) => {
      const next = { ...(current[userId] ?? {}) };

      if (checked) {
        next[groupId] = next[groupId] ?? "viewer";
      } else {
        delete next[groupId];
      }

      return {
        ...current,
        [userId]: next,
      };
    });
  };

  const setGroupRole = (userId: string, groupId: string, role: string) => {
    setDraftMemberships((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {}),
        [groupId]: role,
      },
    }));
  };

  const saveRoles = async (userId: string) => {
    const roles = draftRoles[userId] ?? [];
    setSavingUserId(userId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roles }),
      });

      const payload = (await response.json()) as {
        error?: string;
        user?: AdminUser;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Role update failed");
      }

      const updatedUser: AdminDirectoryUser = {
        ...payload.user,
        roles: sortRoles(payload.user.roles),
        groups: users.find((user) => user.id === userId)?.groups ?? [],
      };

      setUsers((current) =>
        current.map((user) => (user.id === userId ? updatedUser : user)),
      );
      setDraftRoles((current) => ({
        ...current,
        [userId]: updatedUser.roles,
      }));

      setMessage(
        userId === currentUserId
          ? "Role を更新しました。現在のログインユーザーの権限変更は、再ログインまたは session 再取得後に反映されます。"
          : "Role を更新しました。",
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setSavingUserId(null);
    }
  };

  const saveMemberships = async (userId: string) => {
    const memberships = Object.entries(draftMemberships[userId] ?? {}).map(([groupId, role]) => ({
      groupId,
      role,
    }));

    setSavingMembershipUserId(userId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/memberships`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberships }),
      });

      const payload = (await response.json()) as {
        error?: string;
        user?: AdminDirectoryUser;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Membership update failed");
      }

      const updatedUser = payload.user;

      setUsers((current) =>
        current.map((user) => (user.id === userId ? updatedUser : user)),
      );
      setDraftMemberships((current) => ({
        ...current,
        [userId]: Object.fromEntries(
          updatedUser.groups.map((group) => [group.groupId, group.role]),
        ),
      }));
      setMessage("所属グループを更新しました。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setSavingMembershipUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[#101827] p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#f59e0b]">Admin</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Role Management</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
              {bootstrapMode
                ? "初回 bootstrap 中です。自分自身に admin を付与できます。"
                : currentUserIsAdmin
                  ? "admin はすべての role を更新できます。"
                  : "この画面の role 更新は admin のみが実行できます。"}
            </p>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c1423] shadow-2xl shadow-black/20">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-medium text-white">Users</h3>
          <p className="mt-1 text-sm text-white/60">
            表示名、メール、現在の role と更新可能な role を一覧で確認できます。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/84">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-white/48">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Groups</th>
                <th className="px-6 py-4 font-medium">Current Roles</th>
                <th className="px-6 py-4 font-medium">Edit Roles</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-white/58">
                    ユーザーがまだ存在しません。
                  </td>
                </tr>
              ) : null}
              {users.map((user) => {
                const currentRoles = sortRoles(user.roles);
                const draft = draftRoles[user.id] ?? currentRoles;
                const groups = user.groups;
                const draftGroupRoles = draftMemberships[user.id] ?? {};
                const dirty = JSON.stringify(draft) !== JSON.stringify(currentRoles);
                const membershipsDirty =
                  JSON.stringify(
                    Object.entries(draftGroupRoles)
                      .sort(([left], [right]) => left.localeCompare(right))
                      .map(([groupId, role]) => `${groupId}:${role}`),
                  ) !==
                  JSON.stringify(
                    groups
                      .map((group) => `${group.groupId}:${group.role}`)
                      .sort((left, right) => left.localeCompare(right)),
                  );
                const targetIsPrivileged = touchesPrivilegedRole(currentRoles);
                const adminBlockedTarget = !currentUserIsAdmin && targetIsPrivileged;

                return (
                  <tr key={user.id} className="align-top">
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="font-medium text-white">
                          {user.displayName ?? "No display name"}
                        </div>
                        <div className="break-all text-white/60">{user.email ?? "No email"}</div>
                        <div className="text-xs text-white/42">{user.id}</div>
                        {user.id === currentUserId ? (
                          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                            You
                          </span>
                        ) : null}
                        {adminBlockedTarget ? (
                          <span className="inline-flex rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-100">
                            Privileged user
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {groups.length > 0 ? (
                            groups.map((group) => (
                              <span
                                key={group.groupId}
                                className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/78"
                              >
                                {group.groupName} · {formatRole(group.role)}
                              </span>
                            ))
                          ) : (
                            <span className="text-white/42">No groups</span>
                          )}
                        </div>
                        <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                          {availableGroups.length > 0 ? (
                            availableGroups.map((group) => {
                              const checked = group.id in draftGroupRoles;
                              const selectedRole = draftGroupRoles[group.id] ?? "viewer";

                              return (
                                <div
                                  key={group.id}
                                  className="flex flex-col gap-2 rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-3"
                                >
                                  <label className="flex items-center gap-3 text-sm text-white/84">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) =>
                                        toggleGroupMembership(
                                          user.id,
                                          group.id,
                                          event.currentTarget.checked,
                                        )
                                      }
                                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                                    />
                                    <span>{group.name}</span>
                                  </label>
                                  <select
                                    value={selectedRole}
                                    disabled={!checked}
                                    onChange={(event) =>
                                      setGroupRole(user.id, group.id, event.currentTarget.value)
                                    }
                                    className="rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <option value="editor" className="bg-[#0b1220] text-white">
                                      Editor
                                    </option>
                                    <option value="viewer" className="bg-[#0b1220] text-white">
                                      Viewer
                                    </option>
                                  </select>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-white/44">No groups available.</p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={!membershipsDirty || savingMembershipUserId === user.id}
                          onClick={() => saveMemberships(user.id)}
                          className="inline-flex items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-50 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-white/38"
                        >
                          {savingMembershipUserId === user.id ? "Saving groups..." : "Save Groups"}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        {currentRoles.length > 0 ? (
                          currentRoles.map((role) => (
                            <span
                              key={role}
                              className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/78"
                            >
                              {formatRole(role)}
                            </span>
                          ))
                        ) : (
                          <span className="text-white/42">No roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {ROLE_ORDER.map((role) => {
                          const checked = draft.includes(role);
                          const editable =
                            bootstrapMode && user.id === currentUserId
                              ? role === "admin"
                              : canManageRole(currentUserRoles, role, currentRoles);

                          const disabled =
                            !editable || (bootstrapMode && user.id !== currentUserId);

                          return (
                            <label
                              key={role}
                              className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm ${
                                disabled
                                  ? "border-white/8 bg-white/[0.02] text-white/35"
                                  : "border-white/12 bg-white/[0.04] text-white/80"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-white/20 bg-transparent"
                                checked={checked}
                                disabled={disabled}
                                onChange={(event) =>
                                  toggleRole(user.id, role, event.currentTarget.checked)
                                }
                              />
                              <span>{formatRole(role)}</span>
                            </label>
                          );
                        })}
                      </div>
                      {!currentUserIsAdmin && !bootstrapMode ? (
                        <p className="mt-3 text-xs leading-6 text-white/46">
                          role 更新は admin のみ可能です。
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        disabled={!dirty || savingUserId === user.id || adminBlockedTarget}
                        onClick={() => saveRoles(user.id)}
                        className="inline-flex items-center justify-center rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:bg-[#6b7280] disabled:text-white/70"
                      >
                        {savingUserId === user.id ? "Saving..." : "Save"}
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
            Role 更新後、対象が現在のログインユーザー自身なら session の再取得まで画面表示と権限判定がずれる可能性があります。
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#101827] p-6 shadow-2xl shadow-black/20">
        <h3 className="text-lg font-medium text-white">Editable Roles</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {(currentUserIsAdmin || bootstrapMode ? ROLE_ORDER : []).map(
            (role) => (
              <span
                key={role}
                className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/78"
              >
                {formatRole(role)}
              </span>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
