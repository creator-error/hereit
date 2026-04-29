export default function SceneDetailLoading() {
  return (
    <main className="min-h-screen bg-[#08111f] px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-8 shadow-2xl shadow-black/30">
        <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Loading</p>
        <h1 className="mt-3 text-4xl font-semibold">Scene detail is loading</h1>
        <p className="mt-4 text-sm leading-7 text-white/72">
          Scene メタデータと閲覧権限を確認しています。大きい asset の実読み込みはこの後に続きます。
        </p>
        <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-400/70" />
        </div>
      </div>
    </main>
  );
}
