import Link from "next/link";
import { AdminUserMenu } from "./AdminUserMenu";
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
              <p className="text-lg font-semibold text-white">管理コンソール</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/admin"
              className={`rounded-full px-4 py-2 text-sm transition ${
                currentPath === "/admin"
                  ? "bg-[#f59e0b] !text-[#111827]"
                  : "bg-white/6 text-white/70 hover:bg-white/10"
              }`}
            >
              組織とシーン
            </Link>
            <Link
              href="/admin/users"
              className={`rounded-full px-4 py-2 text-sm transition ${
                currentPath === "/admin/users"
                  ? "bg-[#f59e0b] !text-[#111827]"
                  : "bg-white/6 text-white/70 hover:bg-white/10"
              }`}
            >
              利用者
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <AuthClientProvider>
            <AdminUserMenu user={user} roles={roles} />
          </AuthClientProvider>
        </div>
      </div>
    </header>
  );
}
