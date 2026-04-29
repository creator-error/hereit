# Cloudflare Production Checklist

## Scope

このドキュメントは次の 2 点をまとめる。

- Google OAuth の本番 redirect URI と secret 運用
- Cloudflare 本番で必要な D1 / R2 binding 整備

## 1. Google OAuth Production

### Required secrets

次は Cloudflare 側の secret / runtime var として持つ。

- secret: `AUTH_SECRET`
- secret: `AUTH_GOOGLE_ID`
- secret: `AUTH_GOOGLE_SECRET`
- var: `NEXTAUTH_URL`
- var: `NEXT_PUBLIC_APP_URL`

`AUTH_SECRET` と OAuth client secret は repo に置かない。
`wrangler secret put` または Cloudflare dashboard の secrets で管理する。

### Required runtime values

- `NEXTAUTH_URL=https://<production-host>/auth`
- `NEXT_PUBLIC_APP_URL=https://<production-host>`

`NEXTAUTH_URL` に `/auth` が入っていないと callback が `/api/auth/...` 側へずれて `redirect_uri_mismatch` の原因になる。

### Google Cloud Console

Authorized redirect URI に次を登録する。

- `https://<production-host>/auth/callback/google`

必要に応じて staging も別 client として分ける。
少なくとも redirect URI は production と staging で混ぜない。

### Pre-release checks

1. `/login` から Google ログインできる
2. callback 後に `/auth/callback/google` が 404 にならない
3. session payload に `user.id` と `roles` が乗る
4. `/admin` と `/scenes/:sceneUuid` の認可が壊れていない

## 2. D1 Binding

### Required binding

`wrangler.jsonc` では `DB` binding を使う。

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "<d1-database-name>",
    "database_id": "<d1-database-id>"
  }
]
```

app 側は [server/db/cloudflare.ts](../server/db/cloudflare.ts) で `env.DB` を読む。

### Required schema apply

deploy 前に少なくとも一度は remote D1 へ schema を適用する。

```bash
npx wrangler d1 execute DB --remote --file=server/db/migrations/0001_users.sql
```

### Verification

- `/api/health/db` が成功する
- ログイン時に user upsert が失敗しない
- `/admin` の group / scene 読み込みが失敗しない

## 3. R2 Binding

### Current implementation state

今の app は R2 binding を直接使わない。
Scene / asset / audio は DB に保存された URL をそのまま取得する。

つまり現時点では本番に必須なのは次。

- URL が有効
- ブラウザから `GET` 可能
- CORS が viewer をブロックしない

### When R2 binding becomes necessary

次を実装するときに binding を追加する。

- upload API
- signed URL 発行 API
- private object proxy

その場合の候補は次。

```jsonc
// "r2_buckets": [
//   {
//     "binding": "ASSET_BUCKET",
//     "bucket_name": "<r2-bucket-name>"
//   }
// ]
```

### Operational recommendation

- public read 前提なら object key は scene 単位で整理する
- private bucket 前提なら signed URL の寿命と scope を短く保つ
- PLY / GLB / audio の MIME を明示する

## 4. Release Gate

本番反映前に最低限確認する。

1. `wrangler.jsonc` の `NEXTAUTH_URL` と Google redirect URI が一致
2. `DB` binding が本番 Worker に付いている
3. `AUTH_SECRET` と Google secrets が secret として入っている
4. `npm run build:cf` が通る
5. `/api/health/db` が成功する
6. `/login` から本番 Google ログインできる
7. shared scene と private scene の閲覧制御が期待通り
