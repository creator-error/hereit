"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ViewerLoadingState } from "@/features/spark-viewer/components/SparkScene";

const SparkScene = dynamic(
  () => import("@/features/spark-viewer/components/SparkScene").then((mod) => mod.SparkScene),
  { ssr: false },
);

export default function SparkDemoPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showCollisionMesh, setShowCollisionMesh] = useState(false);
  const [viewerLoading, setViewerLoading] = useState<ViewerLoadingState>({
    active: true,
    mode: "progress",
    progress: 0,
    stage: "ダウンロード中",
    detail: "PLY アセットを取得しています",
  });

  const progress = Math.round(Math.max(0, Math.min(100, viewerLoading.progress)));
  const overlayActive = viewerLoading.active;
  const loadingMode = viewerLoading.mode;
  const loadingStage = viewerLoading.stage;
  const loadingDetail = viewerLoading.detail;

  return (
    <main className="demo-page">
      {overlayActive ? (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-panel">
            <div className={`loading-visual loading-visual-${loadingMode}`}>
              {loadingMode === "progress" && <h2 className="loading-progress">{progress}%</h2>}
              {loadingMode === "busy" && (
                <div className="loading-spinner-wrap" aria-hidden="true">
                  <div className="loading-spinner" />
                </div>
              )}
            </div>
            <p className="loading-stage">{loadingStage}</p>
            <p className="loading-detail">{loadingDetail}</p>
            {loadingMode === "progress" && (
              <div className="loading-bar" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </div>
      ) : null}
      <header className="viewer-header">
        <div className="viewer-brand">
          <div className="viewer-logo-slot" aria-label="logo placeholder">
            <img src="/img/logo.png" alt="Junichi's WorkStudio" width={48} height={48} />
          </div>
          <div className="viewer-brand-copy">
            <strong>Junichi's WorkStudio</strong>
            <span>最近引っ越しをしたコンクリート打ちっぱなしのデザイナーズ</span>
          </div>
        </div>
        <div className="viewer-header-nav" aria-label="header menu">
          <button
            className="hamburger-button"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="asset-menu"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
      <section className="viewer-stage">
        <div className="viewer-card viewer-card-fullscreen">
          <SparkScene
            onLoadingStateChange={setViewerLoading}
            soundEnabled={soundEnabled}
            onSoundEnabledChange={setSoundEnabled}
            showCollisionMesh={showCollisionMesh}
          />
        </div>
        <aside
          id="asset-menu"
          className={`info-card info-card-floating${isMenuOpen ? " is-open" : ""}`}
        >
          <div className="sidebar-header">
            <p className="sidebar-eyebrow">Debug</p>
            <h1>Viewer</h1>
            <p>衝突判定に使っている GLB メッシュを表示できます。</p>
          </div>

          <button
            className={`debug-toggle${showCollisionMesh ? " is-active" : ""}`}
            type="button"
            onClick={() => setShowCollisionMesh((current) => !current)}
          >
            <span>Collision Mesh</span>
            <strong>{showCollisionMesh ? "ON" : "OFF"}</strong>
          </button>
          <button
            className={`debug-toggle${soundEnabled ? " is-active" : ""}`}
            type="button"
            onClick={() => setSoundEnabled((current) => !current)}
          >
            <span>Spatial Sound</span>
            <strong>{soundEnabled ? "ON" : "OFF"}</strong>
          </button>

          <div className="sidebar-note">
            <p>操作</p>
            <ul>
              <li>W/A/S/D で移動</li>
              <li>ドラッグで視点回転</li>
              <li>Spatial Sound で距離減衰する音を再生</li>
              <li>Collision Mesh で判定用メッシュを表示</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
