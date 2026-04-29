"use client";

import Link from "next/link";

export default function SceneError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#08111f] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-rose-400/20 bg-rose-500/10 p-8 shadow-2xl shadow-black/30">
        <p className="text-sm uppercase tracking-[0.24em] text-rose-200">Scene Error</p>
        <h1 className="mt-3 text-4xl font-semibold">Failed to load scene detail</h1>
        <p className="mt-4 text-sm leading-7 text-white/78">
          Scene 情報の取得中に予期しないエラーが発生しました。認可エラーではないため、再試行か別導線を試してください。
        </p>
        <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#0c1423] p-4 text-xs text-white/68">
          {error.message}
        </pre>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-2xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#fbbf24]"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
