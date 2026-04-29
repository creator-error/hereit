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

Google OAuth の redirect URI は次を登録します。

- local: `http://localhost:3000/auth/callback/google`
- production: `https://<production-host>/auth/callback/google`

開発中の DB 接続確認は `GET /api/health/db` で行えます。D1 binding が見つかれば `cloudflare-d1`、それ以外は `local-sqlite` を返し、実際に probe レコードを書き込んで読み戻します。

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

認証とは別に、認可は DB の `user_roles` で管理します。role 名の辞書テーブルは持たず、role 文字列はアプリケーション側で扱います。

現在の認可関連テーブル:

- `users`
- `auth_identities`
- `user_roles`

管理 API は次の 2 本です。

- `GET /api/admin/users`
  - ユーザー一覧と role 一覧を返します
- `PUT /api/admin/users/:userId/roles`
  - body で渡した role 一覧に置き換えます

### Bootstrap

まだ `superuser` が 1 人もいない初回だけは、ログイン済みユーザーが自分自身へ `superuser` を付与できます。

`userId` は `/login` ページの session payload から確認できます。

例:

```bash
curl -X PUT http://localhost:3000/api/admin/users/<your-user-id>/roles \
  -H 'Content-Type: application/json' \
  --cookie '<your session cookie>' \
  -d '{"roles":["superuser"]}'
```

一度 `superuser` が作成されると、それ以降の一覧取得と role 更新は `superuser` のみ実行できます。

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
  -d '{"roles":["superuser","scene_editor"]}'
```

`PUT` の request body は次の形式です。

```json
{
  "roles": ["superuser", "scene_editor"]
}
```

## Notes

- 現在の `/demo` は外部アセット不要の疑似ポイントクラウドです
- `components/three-scene.tsx` の `createPseudoSplatCloud` を実際の L3DGS ローダーへ置き換える想定です
- `/login` は Google ログイン専用ページです
