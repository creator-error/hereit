# Hereit!

`Next.js + TypeScript + Three.js` で、LP と 3D デモページを同居させるための雛形です。

## Pages

- `/`: LP
- `/demo`: Three.js ベースの L3DGS viewer scaffold

## Setup

```bash
npm install
npm run dev
```

Google OAuth を使う場合は `.env.example` を元に `.env.development` を作成し、少なくとも次を設定してください。

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

ログイン時のアプリ user 永続化には Cloudflare D1 binding `DB` を使います。OpenNext の local bindings を前提にしているため、`next dev` でも binding が参照されます。設定方針の詳細は [docs/google-oauth-session-plan.md](docs/google-oauth-session-plan.md) を参照してください。

Scene 本体の 3D データと音源は、現在は R2 など外部ストレージ上の URL を DB に保持して参照する前提です。
この repo では upload 自体はまだ持たず、`scenes.room_ply_url`、`scenes.room_glb_url`、`assets.url`、`audio_files.url`
に保存された URL をそのまま利用します。

## Directory Structure

- 複数ページで使う見た目の部品
  - components/ui
- サイト全体で使う枠
  - components/layout
- 特定機能に強く依存するUI
  - features/xxx/components
- Next.jsのルーティング・metadata・layout責務
  - app
- DB/API/Authなどサーバー処理
  - server

```
app/
  layout.tsx          // Next.jsのルートLayoutだけ
  page.tsx            // ページの組み立てだけ
  demo/page.tsx
  admin/page.tsx
components/
  ui/                 // Button, Card, Badge, Input など汎用UI
  layout/             // Header, Footer, AppShell など共通レイアウト
features/
  scenes/
    components/       // SceneViewer, SceneCard など機能専用UI
    hooks/
    types.ts
domain/
  scene/
    model.ts          // UIに依存しないドメイン型・ルール
server/
  db/
  auth/
  repositories/

app = ルーティングと画面の組み立て
components = 汎用UIと共通レイアウト
features = 業務・機能単位のUI
domain/server = UI以外
```

## Cloudflare Workers

Google OAuth と `/auth/[...nextauth]` を使うため、認証込みの運用は Cloudflare Workers
(`@opennextjs/cloudflare`) 前提です。

ビルドとデプロイは次を使ってください。

```bash
npm run build:cf
npm run deploy:cf
```

Workers 側では少なくとも次を用意してください。

- runtime secrets: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- runtime variable: `NEXTAUTH_URL`
- runtime variable: `NEXT_PUBLIC_APP_URL`
- D1 binding: `DB`

3D データや音源 URL を Cloudflare R2 から配る場合は、少なくとも次も確認してください。

- Scene / asset / audio URL が Worker から到達可能であること
- ブラウザからの `GET` を許可する CORS 設定
- private bucket の場合は、将来 signed URL 発行 API を追加すること

Google OAuth の redirect URI は次を登録します。

- local: `http://localhost:3000/auth/callback/google`
- production: `https://<production-host>/auth/callback/google`

開発中の DB 接続確認は `GET /api/health/db` で行えます。D1 binding が見つかれば `cloudflare-d1`、それ以外は `local-sqlite` を返し、実際に probe レコードを書き込んで読み戻します。

環境別セットアップは [docs/environment-setup.md](docs/environment-setup.md) を参照してください。
Cloudflare 本番用の OAuth / D1 / R2 確認は [docs/cloudflare-production-checklist.md](docs/cloudflare-production-checklist.md) にまとめています。

## Database Migrations

ローカル SQLite へ現在の schema を通常適用する場合:

```bash
npm run db:migrate:local
```

このコマンドは `schema_migrations` を使って未適用 migration のみを一度だけ適用します。既存テーブルの DROP は行いません。

開発中にローカル DB を破壊的に作り直したい場合だけ、次を実行してから再適用してください。

```bash
npm run db:reset:local
npm run db:migrate:local
```

Wrangler の D1 へ同じ migration を適用する場合:

```bash
npx wrangler d1 execute DB --local --file=server/db/migrations/0001_users.sql
npx wrangler d1 execute DB --remote --file=server/db/migrations/0001_users.sql
```

今後の migration は append-only を前提にし、既存 migration ファイルを DROP ベースで書き換えない方針です。

## Authorization Admin API

認証とは別に、認可は DB の `user_roles` と `group_memberships` で管理します。role 名の辞書テーブルは持たず、role 文字列はアプリケーション側で扱います。

現在の認可関連テーブル:

- `users`
- `auth_identities`
- `user_roles`
- `groups`
- `group_memberships`
- `scenes`

現在の role 命名は次の 3 つです。

- `admin`
  - 管理画面でグループ、シーン、ユーザー権限の全操作を行える
- `editor`
  - 所属グループのシーンを作成・編集できるが削除はできない
- `viewer`
  - 所属グループの未共有シーンを閲覧できる
  - `shared = true` のシーンは一般ユーザーも閲覧できる

管理 API の入口は次です。

- `GET /api/admin/users`
  - ユーザー一覧と role 一覧を返します
- `PUT /api/admin/users/:userId/roles`
  - body で渡した role 一覧に置き換えます
- `PUT /api/admin/users/:userId/memberships`
  - 所属グループとグループ内 role を置き換えます
- `GET /api/admin/groups`
- `POST /api/admin/groups`
- `DELETE /api/admin/groups/:groupId`
- `GET /api/admin/scenes`
- `POST /api/admin/scenes`
- `PUT /api/admin/scenes/:sceneId`
- `DELETE /api/admin/scenes/:sceneId`

### Bootstrap

まだ `admin` が 1 人もいない初回だけは、ログイン済みユーザーが自分自身へ `admin` を付与できます。

`userId` は `/login` ページの session payload から確認できます。

例:

```bash
curl -X PUT http://localhost:3000/api/admin/users/<your-user-id>/roles \
  -H 'Content-Type: application/json' \
  --cookie '<your session cookie>' \
  -d '{"roles":["admin"]}'
```

一度 `admin` が作成されると、それ以降の一覧取得と role 更新は `admin` のみ実行できます。

### API Examples

ユーザー一覧:

```bash
curl http://localhost:3000/api/admin/users \
  --cookie '<your session cookie>'
```

role 更新:

```bash
curl -X PUT http://localhost:3000/api/admin/users/<target-user-id>/roles \
  -H 'Content-Type: application/json' \
  --cookie '<your session cookie>' \
  -d '{"roles":["admin","viewer"]}'
```

`PUT` の request body は次の形式です。

```json
{
  "roles": ["admin", "viewer"]
}
```

## Workspace UI

- `/admin`
  - `admin` / `editor` / `viewer` が閲覧可能
  - group 単位で scene を表示
  - `shared = true` の scene は shared URL をコピー可能
- `/admin/users`
  - `admin` のみアクセス可能
  - 名前、メールアドレス、所属グループ、role を表示

Scene の閲覧 URL は `/scenes/:sceneUuid` です。

- shared scene:
  - 未ログインでも閲覧可能
- private scene:
  - 未ログインでは `/login` へリダイレクト
  - ログイン済みでも未認可なら 403

## Notes

- 現在の `/demo` は外部アセット不要の疑似ポイントクラウドです
- `components/three-scene.tsx` の `createPseudoSplatCloud` を実際の L3DGS ローダーへ置き換える想定です
- `/login` は Google ログイン専用ページです
