import Link from "next/link";
import { AuthActions } from "./AuthActions";
import { AuthClientProvider } from "./AuthClientProvider";
import { getAppSession } from "@/server/auth/session";
import { isGoogleAuthConfigured } from "@/server/auth/options";

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default async function LoginPage() {
  const session = await getAppSession();
  const user = session?.user ?? null;

  return (
    <main className="min-h-screen bg-[#0f1729] px-6 py-16 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#f59e0b]">Authentication</p>
            <h1 className="mt-3 text-4xl font-semibold">Googleログイン確認</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
              Auth.js の route handler 経由で Google OAuth を開始し、JWT session を cookie に保持します。
              ここではログイン状態と callback 後の session 内容を確認できます。
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-white/16 px-4 py-2 text-sm text-white/80 transition hover:bg-white/8 hover:text-white"
          >
            LPへ戻る
          </Link>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/6 p-8 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/60">状態</p>
              <h2 className="mt-1 text-2xl font-medium">
                {user ? "ログイン済み" : "未ログイン"}
              </h2>
            </div>
            <AuthClientProvider>
              <AuthActions
                isAuthenticated={Boolean(user)}
                isConfigured={isGoogleAuthConfigured}
              />
            </AuthClientProvider>
          </div>

          {!isGoogleAuthConfigured ? (
            <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
              <p className="font-medium">Google OAuth が未設定です。</p>
              <p>
                `AUTH_GOOGLE_ID` と `AUTH_GOOGLE_SECRET` を `.env.development` または Cloudflare
                の runtime variables に設定してください。
              </p>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#111c31] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/48">Email</p>
              <p className="mt-3 break-all text-sm text-white/84">{user?.email ?? "未取得"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111c31] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/48">Display Name</p>
              <p className="mt-3 text-sm text-white/84">{user?.name ?? "未取得"}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#0a1221] p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/48">Session Payload</p>
              <span className="text-xs text-white/48">server-rendered</span>
            </div>
            <pre className="mt-4 overflow-x-auto text-xs leading-6 text-white/78">
              {formatJson(
                session
                  ? {
                      user: session.user,
                      provider: session.provider ?? null,
                      googleSub: session.googleSub ?? null,
                      roles: session.roles ?? [],
                      expires: session.expires,
                    }
                  : null,
              )}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
