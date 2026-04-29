import Link from "next/link";

export default function SceneNotFound() {
  return (
    <main className="min-h-screen bg-[#08111f] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/30">
        <p className="text-sm uppercase tracking-[0.24em] text-white/46">404</p>
        <h1 className="mt-3 text-4xl font-semibold">Scene not found</h1>
        <p className="mt-4 text-sm leading-7 text-white/72">
          指定された UUID の Scene は見つかりませんでした。削除済みか、URL が誤っている可能性があります。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-2xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24]"
          >
            Back to Home
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
