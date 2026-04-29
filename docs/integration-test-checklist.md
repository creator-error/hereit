# Integration Test Checklist

管理者ログインから Scene 作成、共有 URL 閲覧までの通し確認用メモ。

## Admin Flow

1. Google ログインする
2. `/admin` を開く
3. group が無ければ作成する
4. `/admin/scenes/new` から group を選び、name / description / room PLY URL / room GLB URL を入力して Scene を作成する
5. `/admin` に戻り、作成した Scene が対象 group 配下に表示されることを確認する
6. `/scenes/:sceneUuid` を開き、Scene 詳細ページと viewer が表示されることを確認する
7. collision mesh toggle が動くことを確認する

## Role Flow

1. `admin` で `/admin/users` を開く
2. 対象ユーザーに group membership を付与する
3. group 内 role を `editor` または `viewer` に設定する
4. 必要なら全体 role `editor` / `viewer` を付与する
5. 保存後、対象ユーザーで再ログインして権限が反映されることを確認する

## Shared Scene Flow

1. `shared = true` の Scene を 1 件作る
2. 未ログイン状態で `/scenes/:sceneUuid` にアクセスする
3. Scene 詳細が表示されることを確認する
4. `Copy Shared URL` が利用できることを確認する
4. `shared = false` の Scene に未ログインでアクセスする
5. `/login?callbackUrl=...` に誘導されることを確認する

## Authorized Viewer Flow

1. `viewer` が所属する group の private Scene を作る
2. `viewer` でログインして `/admin` を開く
3. 所属 group の Scene だけ見えることを確認する
4. `/scenes/:sceneUuid` を開き、private Scene を閲覧できることを確認する
5. 他 group の private Scene UUID では 403 または 404 相当になることを確認する

## Editor Flow

1. `editor` でログインする
2. `/admin` を開く
3. 所属 group の Scene について `/admin/scenes/:sceneId/edit` へ遷移できることを確認する
4. 更新後に `/scenes/:sceneUuid` で変更内容が見えることを確認する
5. group 削除と scene 削除は実行できないことを確認する

## Admin Delete Flow

1. `admin` で Scene を削除する
2. `/admin` から一覧が消えることを確認する
3. `/scenes/:sceneUuid` が 404 になることを確認する
4. members または scenes がある group の削除が拒否されることを確認する
5. 空の group のみ削除できることを確認する

## Audio Placement Flow

1. `admin` または対象 group の `editor` でログインする
2. 対象 Scene UUID を控える
3. `PUT /api/scenes/:sceneUuid/audio-placements` に対して、audio URL と position を含む payload を送る
4. `GET /api/scenes/:sceneUuid/audio-placements` で保存内容が返ることを確認する
5. `/api/scenes/:sceneUuid` に `audioPlacements` が含まれることを確認する
6. `/scenes/:sceneUuid` を開き、Audio Placements 件数が反映されることを確認する
7. shared Scene なら未ログインでも `/api/scenes/:sceneUuid/audio-placements` と `/scenes/:sceneUuid` で閲覧できることを確認する
8. private Scene では未ログイン閲覧が拒否されることを確認する
9. 非所属 viewer または一般ユーザーが `PUT /api/scenes/:sceneUuid/audio-placements` を呼ぶと 403 または 401 になることを確認する
