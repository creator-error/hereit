# Environment Setup

## Scope

このドキュメントは、Hereit を次の 3 環境で再現するための最小手順をまとめる。

- local development
- staging
- production

対象は次の構成要素。

- Google OAuth
- NextAuth/Auth.js
- Cloudflare D1
- Cloudflare R2
- OpenNext Cloudflare deployment

## Current Runtime Assumptions

現時点の実装は次を前提にしている。

- 認証は Google OAuth のみ
- アプリ本体は Cloudflare Workers 運用
- DB は local では SQLite、deploy 先では D1
- Scene / asset / audio は DB に URL を保存して参照する
- R2 upload API はまだ未実装

つまり、R2 は「この repo から直接 upload する先」ではなく、「Scene が参照する URL の格納先」として先に扱っている。

## Local Development

### 1. Install

```bash
npm install
```

### 2. Create local env

`.env.development` を作成し、少なくとも次を設定する。

```dotenv
AUTH_SECRET=replace-with-a-random-secret
AUTH_GOOGLE_ID=replace-with-google-oauth-client-id
AUTH_GOOGLE_SECRET=replace-with-google-oauth-client-secret
NEXTAUTH_URL=http://localhost:3000/auth
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Register Google OAuth redirect URI

Google Cloud Console で次を登録する。

- `http://localhost:3000/auth/callback/google`

### 4. Apply schema

```bash
npm run db:migrate:local
```

必要ならローカル DB を破壊的に作り直してから再適用する。

```bash
npm run db:reset:local
npm run db:migrate:local
```

### 5. Run dev server

```bash
npm run dev
```

### 6. Verify

- `/login` から Google ログインできる
- `/api/health/db` で write/read probe が成功する
- `/admin` に入れる
- `/scenes/:sceneUuid` が role と shared に応じて表示される

## Staging

staging は production と同じ Cloudflare Workers 構成を使い、ホスト名と Google OAuth client を分けるのが安全。

### Required runtime values

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL=https://<staging-host>/auth`
- `NEXT_PUBLIC_APP_URL=https://<staging-host>`

### Required bindings

- D1 binding: `DB`
- static assets binding: `ASSETS`

R2 upload API は未実装のため、現時点では R2 binding 自体は必須ではない。
ただし staging で Scene / audio を実表示するなら、DB に保存する URL が有効である必要がある。

### Google OAuth redirect URI

- `https://<staging-host>/auth/callback/google`

## Production

### Required runtime values

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL=https://<production-host>/auth`
- `NEXT_PUBLIC_APP_URL=https://<production-host>`

### Required bindings

- D1 binding: `DB`
- static assets binding: `ASSETS`

### Google OAuth redirect URI

- `https://<production-host>/auth/callback/google`

本番投入前の secret / redirect URI / binding 確認は [cloudflare-production-checklist.md](./cloudflare-production-checklist.md) を参照。

## D1 Setup

この repo の schema は `server/db/migrations/0001_users.sql` にある。

ローカル確認:

```bash
npm run db:migrate:local
```

Wrangler から local D1 へ適用:

```bash
npx wrangler d1 execute DB --local --file=server/db/migrations/0001_users.sql
```

Wrangler から remote D1 へ適用:

```bash
npx wrangler d1 execute DB --remote --file=server/db/migrations/0001_users.sql
```

運用上は append-only migration を前提にし、既存 migration を DROP ベースで書き換えない。

## R2 Setup

### Current behavior

現時点の app は次の URL を DB から読み、そのまま viewer で利用する。

- `scenes.room_ply_url`
- `scenes.room_glb_url`
- `assets.url`
- `audio_files.url`

### Minimum R2 requirements

- URL がブラウザから `GET` 可能
- PLY / GLB / audio の MIME が適切
- CORS で viewer からの取得を拒否しない

### Recommended object organization

- `scenes/<scene-uuid>/room/room.ply`
- `scenes/<scene-uuid>/room/room.glb`
- `scenes/<scene-uuid>/audio/<audio-file-id>/<filename>`
- `scenes/<scene-uuid>/assets/<asset-id>/<filename>`

### Security note

private bucket を使う場合は、将来的に signed URL 発行 API を追加する。
今の実装は public URL またはそれに準ずる取得経路を前提にしている。

## Wrangler Notes

現在の [wrangler.jsonc](../wrangler.jsonc) は OpenNext Worker の基本設定のみを持つ。
DB や将来の R2 upload を本番で使う場合は、Cloudflare 側で次を揃える。

- `DB` binding
- 必要なら R2 bucket binding
- secrets / vars

この repo ではまだ R2 upload API を持たないため、binding 名は実装着手時に確定でよい。

## Operational Checklist

環境を切り替えるたびに最低限確認する。

1. `NEXTAUTH_URL` が `/auth` base path を含んでいる
2. Google OAuth redirect URI が環境ごとに一致している
3. `DB` binding が見える
4. `/api/health/db` が成功する
5. `/login` でログインできる
6. `/admin` が role に応じて表示される
7. shared scene と private scene の閲覧制御が期待通り
