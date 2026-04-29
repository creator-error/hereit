# Domain ER Design

この文書は Story `認証・認可・Scene・Asset・音源配置のデータ基盤を整える` のための
ER 設計メモである。

目的は次の 3 つ。

- 認証と認可の責務を分離する
- Scene / Asset / 音源配置の保存単位を明確にする
- 後続 Task が同じ用語で実装できるようにする

## Decision Summary

- 認証 identity は `auth_identities` に置く
- アプリ内ユーザー本体は `users` に置く
- 認可は role 文字列を持つ `user_roles` で表現する
- グループ所属は `group_memberships` で表現する
- Scene の公開用識別子は内部連番ではなく `uuid` を使う
- Asset は Scene 本体とは分離し、visual 系ファイルのメタデータを持つ
- Audio は `audio_files` と `audio_placements` に分離する

## Entity List

### users

アプリ内の利用者本体。

- `id`
- `email`
- `display_name`
- `avatar_url`
- `created_at`
- `updated_at`

`users` は Google 専用の識別子を持たない。
ログイン手段は `auth_identities` で表現する。

### auth_identities

外部認証と `users` の紐付け。

- `id`
- `user_id`
- `provider`
- `provider_user_id`
- `provider_email`
- `created_at`
- `updated_at`

例:

- Google の `sub`
- 将来の GitHub / Microsoft の subject

一意性は `(provider, provider_user_id)` で担保する。

### user_roles

全体権限を表す認可テーブル。

- `user_id`
- `role`
- `created_at`

role 名は DB マスタではなくアプリケーションコードで管理する。

例:

- `superuser`
- `scene_editor`
- `scene_viewer`

### groups

Scene の閲覧・編集を束ねる単位。

- `id`
- `name`
- `slug`
- `description`
- `created_at`
- `updated_at`

`slug` は管理 UI や URL で扱いやすい識別子として使えるようにする。

### group_memberships

ユーザーのグループ所属。

- `user_id`
- `group_id`
- `created_at`

必要なら将来 `role` 列を足して group 内権限を表現できるが、
初期段階では membership の有無だけを持つ。

### scenes

Viewer と共有 URL の中心になる集約。

- `id`
- `uuid`
- `group_id`
- `name`
- `description`
- `room_ply_url`
- `room_glb_url`
- `created_by_user_id`
- `created_at`
- `updated_at`

`id` は内部参照用、`uuid` は公開 URL と API で使う。
部屋描画用の PLY とメッシュ用 GLB は Scene 本体に URL として持つ。

### assets

Scene に追加する visual asset のメタデータ。

- `id`
- `scene_id`
- `kind`
- `url`
- `original_filename`
- `mime_type`
- `byte_size`
- `created_by_user_id`
- `created_at`
- `updated_at`

`kind` の初期候補:

- `object_glb`
- `poster_image`
- `reference_file`

1 Scene に対して複数 asset を持てる前提で設計する。
Asset は R2 上の URL で取得する前提で、DB には `url` を保持する。
部屋描画の基礎となる PLY / GLB は `scenes.room_ply_url` と
`scenes.room_glb_url` にのみ保持し、`assets` へ重複保存しない。

### audio_files

音源ファイル本体のメタデータ。

- `id`
- `scene_id`
- `url`
- `original_filename`
- `mime_type`
- `byte_size`
- `created_by_user_id`
- `created_at`
- `updated_at`

音源ファイルも R2 上の URL で取得する前提で、DB には `url` を保持する。

### audio_placements

Scene 上に置かれた音源の配置情報。

- `id`
- `scene_id`
- `audio_file_id`
- `name`
- `position_x`
- `position_y`
- `position_z`
- `rotation_x`
- `rotation_y`
- `rotation_z`
- `gain`
- `loop_enabled`
- `created_at`
- `updated_at`

ここでの `audio_file_id` は `audio_files.id` を参照する。

## Coordinate Rules For Audio Placement

`audio_placements` の座標表現は Viewer で扱いやすい素直な 3D transform に揃える。

- position は `position_x`, `position_y`, `position_z`
- rotation は Euler angle として `rotation_x`, `rotation_y`, `rotation_z`
- 初期値は rotation = `0, 0, 0`
- 音量は `gain`
- ループ有無は `loop_enabled`

初期段階では scale は持たない。
音源配置は見た目サイズではなく、位置と向きと再生特性が中心だからである。

座標系の実装前提:

- DB では各軸を独立列で保持する
- API では必要に応じて `{ position: { x, y, z } }` のように変換して返してよい
- Viewer と保存形式のあいだで配列順依存にしない

## Relationship Summary

- `users 1 - n auth_identities`
- `users n - n groups` via `group_memberships`
- `users 1 - n scenes` via `created_by_user_id`
- `groups 1 - n scenes`
- `scenes 1 - n assets`
- `scenes 1 - n audio_files`
- `scenes 1 - n audio_placements`
- `audio_files 1 - n audio_placements`
- `users 1 - n user_roles`

## ER View

```txt
users
  id PK
  email
  display_name
  avatar_url

auth_identities
  id PK
  user_id FK -> users.id
  provider
  provider_user_id
  provider_email

user_roles
  user_id FK -> users.id
  role
  PK (user_id, role)

groups
  id PK
  name
  slug

group_memberships
  user_id FK -> users.id
  group_id FK -> groups.id
  PK (user_id, group_id)

scenes
  id PK
  uuid UNIQUE
  group_id FK -> groups.id
  created_by_user_id FK -> users.id
  name
  description
  room_ply_url
  room_glb_url

assets
  id PK
  scene_id FK -> scenes.id
  kind
  url
  original_filename
  mime_type
  byte_size
  created_by_user_id FK -> users.id

audio_files
  id PK
  scene_id FK -> scenes.id
  url
  original_filename
  mime_type
  byte_size
  created_by_user_id FK -> users.id

audio_placements
  id PK
  scene_id FK -> scenes.id
  audio_file_id FK -> audio_files.id
  name
  position_x
  position_y
  position_z
  rotation_x
  rotation_y
  rotation_z
  gain
  loop_enabled
```

## Why Scene UUID Is Public

- 共有 URL で内部 ID を露出しない
- URL 直打ち時の認可チェック対象を固定できる
- 将来 DB をまたいでも URL 仕様を変えずに済む

内部リレーションは数値やランダム ID でもよいが、
外部公開導線は `scene.uuid` を使う前提で統一する。

## Scene Creation Input Spec

Scene 作成フォームまたは API の最小入力は次を基準にする。

- `groupId`
- `name`
- `description`
- `roomPlyUrl`
- `roomGlbUrl`

サーバー側で補完する値:

- `scene.id`
- `scene.uuid`
- `created_by_user_id`
- `created_at`
- `updated_at`

保存時の扱い:

- `groupId` は `scenes.group_id` に入る
- `name` / `description` は `scenes` 本体へ入る
- `roomPlyUrl` は `scenes.room_ply_url` に入る
- `roomGlbUrl` は `scenes.room_glb_url` に入る

追加 visual asset は `assets` に、音源ファイルは `audio_files` に URL でぶら下げる。
Scene の主要 3D ファイルは `scenes` 本体にのみ置く。

## Shared URL Routing Spec

共有 URL は内部 ID を使わず `scene.uuid` を使う。

パス案:

- 詳細表示: `/scenes/:sceneUuid`

この形にすると:

- 一覧画面から詳細画面への遷移を統一できる
- コピーしやすい URL をそのまま共有できる
- サーバー側で `scene.uuid` をキーに認可判定できる

ルーティングとデータ取得の前提:

- route param は `sceneUuid`
- API も `scene.uuid` 指定で詳細取得する
- 認可されていない場合は UUID が分かっていても返さない

将来共有専用導線を分ける場合でも、まずは `/scenes/:sceneUuid` を正規 URL とする。

## Explicit Non-Goals

この段階では次はまだ決め切らない。

- asset versioning
- placement revision history
- group 内での細粒度 role
- scene 単位の ACL テーブル
- soft delete

必要になった時点で別 Task として追加する。

## Follow-up Mapping

この設計は次の Task を直接支える。

- `56c81ca9-f2a1-4e37-bb50-fd7b83050ca1`
  - `users` / `user_roles` / `groups` / `group_memberships`
- `b7a9fec2-489f-4118-95c5-3695808e34e4`
  - `assets` / `audio_placements`
- `b99d5b19-0d0a-467d-9c3e-ed845631c797`
  - Scene 作成時の入力項目整理
- `842c188d-0c09-406f-9469-7af9a8a11a66`
  - `scene.uuid` ベースの共有 URL
