# Admin Workspace Checklist

`188f688e-2bd8-4db7-aad5-497384c1516d` 向けの最低限の回帰確認手順。

対象:

- `/admin`
- `/admin/users`
- group / scene / memberships 管理 API
- `admin` / `editor` / `viewer` / 一般ユーザーの権限制御

## Bootstrap

1. `admin` が 0 人の状態でログインする
2. `/admin` を開く
3. bootstrap 案内が表示され、`/admin/users` へ進めることを確認する
4. role 未設定のログインユーザー本人だけが `/admin/users` に入れることを確認する
5. 自分自身へ `admin` を付与できることを確認する

## Admin Workspace

1. `admin` で `/admin` を開く
2. group 一覧と group ごとの scene 一覧が表示されることを確認する
3. group 作成フォームから新しい group を作成できることを確認する
4. empty group のみ削除ボタンが有効であることを確認する
5. members または scenes を持つ group は削除できないことを確認する
6. `New Scene` から `/admin/scenes/new` へ遷移できることを確認する
7. scene 編集ボタンから `/admin/scenes/[sceneId]/edit` へ遷移できることを確認する
8. scene 削除ボタンは `admin` のみ実行可能であることを確認する

## Editor Workspace

1. `editor` で `/admin` を開く
2. 所属 group のみ表示されることを確認する
3. scene 作成と scene 編集導線が利用できることを確認する
4. group 削除と scene 削除は実行できないことを確認する
5. `/admin/users` は `403` になることを確認する

## Viewer Workspace

1. `viewer` で `/admin` を開く
2. 所属 group のみ表示されることを確認する
3. group / scene の閲覧はできるが、作成・編集・削除導線は無効であることを確認する
4. `/admin/users` は `403` になることを確認する

## User Directory

1. `admin` で `/admin/users` を開く
2. 各ユーザーに対して名前、メール、所属グループ、全体 role が表示されることを確認する
3. 全体 role を更新できることを確認する
4. group 所属の ON/OFF と group 内 role (`editor` / `viewer`) を更新できることを確認する
5. 自分自身の全体 role を更新した場合、session 再取得が必要な案内が見えることを確認する

## Shared Scene Rules

1. `shared = true` の scene を 1 件作成する
2. `shared = false` の scene を 1 件作成する
3. `viewer` は所属 group の未共有 scene を閲覧できる前提で一覧に見えることを確認する
4. 一般ユーザー向け詳細導線では、共有 scene だけが公開対象になる前提で API / 画面実装が分離されていることを確認する

## Unauthorized

1. 未ログインで `/admin` にアクセスする
2. `/login` へ誘導されることを確認する
3. 未ログインで `/admin/users` にアクセスする
4. `/login` へ誘導されることを確認する
5. role 未設定だが bootstrap 対象ではないユーザーは `/admin` / `/admin/users` に入れないことを確認する

## API Checks

1. `GET /api/admin/groups` は `admin` / `editor` / `viewer` が呼べることを確認する
2. `POST /api/admin/groups` は `admin` / `editor` が呼べることを確認する
3. `DELETE /api/admin/groups/:groupId` は `admin` のみ成功することを確認する
4. `GET /api/admin/scenes` は `admin` / `editor` / `viewer` が呼べることを確認する
5. `POST /api/admin/scenes` と `PUT /api/admin/scenes/:sceneId` は `admin` / 所属 group の `editor` が呼べることを確認する
6. `DELETE /api/admin/scenes/:sceneId` は `admin` のみ成功することを確認する
7. `PUT /api/admin/users/:userId/memberships` は `admin` のみ成功することを確認する
8. `PUT /api/admin/users/:userId/roles` は `admin` のみ成功することを確認する
