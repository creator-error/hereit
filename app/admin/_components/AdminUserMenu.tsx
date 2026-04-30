"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { ROLE_LABELS } from "@/features/admin/roles";

type AdminUserMenuProps = {
  user: {
    name?: string | null;
    email?: string | null;
  };
  roles: string[];
};

function formatRole(role: string) {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}

function getUserInitial(user: AdminUserMenuProps["user"]) {
  const source = user.name?.trim() || user.email?.trim() || "U";
  return source.slice(0, 1).toUpperCase();
}

export function AdminUserMenu({ user, roles }: AdminUserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const initial = getUserInitial(user);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        {initial}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+12px)] w-72 rounded-3xl border border-white/10 bg-[#0f1729] p-4 shadow-2xl shadow-black/40"
        >
          <div className="mt-2 flex flex-wrap gap-2 mb-4">
            {roles.length > 0 ? (
              roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/76"
                >
                  {formatRole(role)}
                </span>
              ))
            ) : (
              <span className="text-xs text-white/44">権限なし</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user.name ?? "表示名なし"}</p>
            <p className="mt-1 break-all text-xs text-white/58">
              {user.email ?? "メールアドレスなし"}
            </p>
          </div>

          <div className="mt-4 border-t border-white/8 pt-4">
            <AdminLogoutButton className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white transition hover:bg-white/10">
              ログアウト
            </AdminLogoutButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
