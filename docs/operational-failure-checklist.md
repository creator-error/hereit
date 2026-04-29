# Operational Failure Checklist

運用上よく詰まりそうな失敗ケースと、最初に見るべき観点のメモ。

## 1. Google ログインできない

- 確認点
  - `AUTH_GOOGLE_ID`
  - `AUTH_GOOGLE_SECRET`
  - `NEXTAUTH_URL`
  - Google Console の redirect URI
- まず見る場所
  - `/login`
  - `/auth/providers`
  - callback URL が `/auth/callback/google` になっているか

## 2. shared ではない Scene に未ログインで入れない

- 期待動作
  - `/login?callbackUrl=/scenes/:sceneUuid` にリダイレクト
- まず見る場所
  - `app/scenes/[sceneUuid]/page.tsx`
  - `server/repositories/user-repository.ts`
  - `scenes.shared`

## 3. ログイン済みなのに Scene が見えない

- 確認点
  - `user_roles` に `admin` / `editor` / `viewer` があるか
  - `group_memberships` に対象 group があるか
  - private Scene か shared Scene か
- まず見る場所
  - `/admin/users`
  - `/api/scenes`
  - `/api/scenes/:sceneUuid`

## 4. `/admin/users` に入れない

- 期待動作
  - `admin` だけが入れる
- 確認点
  - session の roles
  - bootstrap 中かどうか
- まず見る場所
  - `/login` の session payload
  - `app/admin/users/page.tsx`

## 5. group が削除できない

- 期待動作
  - members または scenes があれば拒否
- 確認点
  - `group_memberships`
  - `scenes`
- まず見る場所
  - `/admin`
  - `DELETE /api/admin/groups/:groupId`

## 6. scene が表示されるが viewer が崩れる

- 確認点
  - `room_ply_url`
  - `room_glb_url`
  - URL が実在するか
- まず見る場所
  - `/scenes/:sceneUuid`
  - browser network tab
  - `SparkScene` loading overlay

## 7. role 変更後に画面表示がずれる

- 期待動作
  - role 更新後は再ログインまたは session 再取得で反映
- 確認点
  - API 更新結果
  - 現在の session roles
- まず見る場所
  - `/admin/users`
  - `/login`

## 8. local DB に schema 差分が反映されない

- 確認点
  - `npm run db:migrate:local`
  - `schema_migrations`
  - dev で破壊的リセットが必要か
- まず見る場所
  - `.data/hereit.sqlite`
  - `scripts/apply-local-migrations.mjs`
  - `scripts/reset-local-db.mjs`
