import Link from "next/link";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { AuthClientProvider } from "@/app/login/AuthClientProvider";

type AdminHeaderProps = {
  currentPath: "/admin" | "/admin/users";
  user: {
    name?: string | null;
    email?: string | null;
  };
  roles: string[];
};

export function AdminHeader({ currentPath, user, roles }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08111f]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 text-white">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f59e0b] text-sm font-semibold text-[#111827]">
              H
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/48">Hereit</p>
              <p className="text-lg font-semibold text-white">Admin Console</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/admin"
              className={`rounded-full px-4 py-2 text-sm transition ${
                currentPath === "/admin"
                  ? "bg-white text-[#08111f]"
                  : "bg-white/6 text-white/70 hover:bg-white/10"
              }`}
            >
              Groups & Scenes
            </Link>
            <Link
              href="/admin/users"
              className={`rounded-full px-4 py-2 text-sm transition ${
                currentPath === "/admin/users"
                  ? "bg-white text-[#08111f]"
                  : "bg-white/6 text-white/70 hover:bg-white/10"
              }`}
            >
              Users
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="truncate text-sm font-medium text-white">
              {user.name ?? "No display name"}
            </p>
            <p className="truncate text-xs text-white/58">{user.email ?? "No email"}</p>
            <div className="mt-2 flex justify-end gap-2">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-white/12 bg-white/6 px-2 py-1 text-[11px] text-white/72"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-white/44">No roles</span>
              )}
            </div>
          </div>
          <AuthClientProvider>
            <AdminLogoutButton />
          </AuthClientProvider>
        </div>
      </div>
    </header>
  );
}
