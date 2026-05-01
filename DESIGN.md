# DESIGN.md（UI Design Spec）

Product: HERE IT !

---

## 0. 目的

本ドキュメントは、HERE IT ! のUI設計において

- 一貫したデザイン原則の維持
- 実装時の迷いの排除
- コンポーネントの再利用性確保

を目的とする。

---

## 1. UIデザイン原則

### 1.1 UIの役割

UIは以下の役割に限定する：

- 操作を可能にする
- 状態を伝える
- 発見を補助する

→ 空間体験を邪魔しないことが最優先

---

### 1.2 デザイン原則

#### 原則1：Non-Intrusive（非侵入）

- UIは主張しない
- 背景（空間）を優先

#### 原則2：Contextual（文脈依存）

- 必要なときだけ表示
- 状況に応じて変化

#### 原則3：Spatial（空間連動）

- UIは空間に紐づく
- 画面ではなく「位置」に存在

---

## 2. カラースタイル

### 2.1 カラーパレット

- 背景: #0B0F14
- メインUI: rgba(10, 15, 20, 0.8)
- アクセント: #D4AF37
- テキスト: #FFFFFF
- サブテキスト: rgba(255,255,255,0.7)

---

### 2.2 使用ルール

- ベースはダーク
- アクションはゴールドのみ
- 色数は最小限

---

## 3. タイポグラフィ

### 3.1 フォント

- 見出し: サンセリフ（直線的）
- 本文: 可読性重視

---

### 3.2 サイズ

- H1: 32px
- H2: 24px
- H3: 18px
- Body: 14px
- Caption: 12px

---

## 4. レイアウトシステム

### 4.1 構造

Full Screen Scene

- Overlay UI
- Floating Controls
- Context Panels

---

### 4.2 配置ルール

- 操作系: 左 or 右固定
- 情報系: 空間上 or 右側
- 補助UI: 右下

---

## 5. コンポーネント

---

### 5.1 Button

#### Primary

- 背景: ゴールド
- テキスト: 黒

#### Secondary

- 枠線: ゴールド
- 背景: 透明

#### Icon Button

- サイズ: 48px
- 背景: 半透明

共通:

- border-radius: 12px
- backdrop-filter: blur(10px)
- transition: 0.2s

---

### 5.2 Card

用途:

- 事例
- 機能説明
- 情報表示

スタイル:

- background: rgba(10,15,20,0.7)
- border: 1px solid rgba(212,175,55,0.3)
- border-radius: 16px
- padding: 16px

---

### 5.3 Tag（重要）

構造:

- ポイント（点）
- ポップアップ（情報）

状態:

- idle: 小さい点
- hover: 拡大 + 光
- active: パネル表示

ルール:

- 空間に固定
- 最小表示
- クリックで展開

---

### 5.4 Control UI

#### 移動パッド

- 左下配置
- WASD対応
- モバイル: スティック

#### 右UIスタック

- 音
- 言語
- ホーム

ルール:

- 縦並び
- 同サイズ
- 余白統一

---

### 5.5 MiniMap

- 位置: 右下
- 要素: 現在地 / 向き
- デフォルト: 小 or 非表示

---

### 5.6 Panel / Modal

- 右側スライド
- 半透明
- スクロール可能

---

## 6. インタラクション

### Hover

- scale: 1.05
- ゴールド発光

### Click

- scale: 0.95
- フィードバック必須

### Transition

- duration: 200ms
- easing: ease-out

---

## 7. 状態設計

### UI状態

```ts
type UIState = {
  selectedTag?: string;
  isPlayingAudio: boolean;
  showMap: boolean;
};
```
