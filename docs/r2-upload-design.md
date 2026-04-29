# R2 Upload Design

## Scope

このドキュメントは、3DGS / GLB / audio を R2 へ保存する際の

- アップロード方式
- オブジェクトキー命名規則
- 公開方法
- Scene / audio 配置との関連付け

を定義する。

## Current App State

現在の app は upload 自体をまだ持たない。
DB に保存した URL を viewer がそのまま読む段階である。

- `scenes.room_ply_url`
- `scenes.room_glb_url`
- `audio_files.url`
- `assets.url`

## Upload Strategy

第一段階では signed URL ではなく、アプリの API 経由 upload を優先する。

理由:

- 現在の認可モデルをそのままサーバー側で判定できる
- file size / extension / MIME validation を一か所に寄せやすい
- object key と DB 更新を同じ責務で扱いやすい

将来的に大容量 upload が増えたら signed upload へ分離する。

## Bucket Model

- bucket: 1 つに集約してもよい
- 種別の切り分けは object key で行う

候補 binding:

- `ASSET_BUCKET`

## Object Key Rules

### Scene room assets

- PLY / SPZ:
  - `scenes/<scene-uuid>/room/room.<ext>`
- GLB:
  - `scenes/<scene-uuid>/room/collision.glb`

### Additional visual assets

- `scenes/<scene-uuid>/assets/<asset-id>/<original-filename>`

### Audio files

- `scenes/<scene-uuid>/audio/<audio-file-id>/<original-filename>`

## Public URL Rules

初期段階では次のいずれかでよい。

- public bucket URL
- custom domain URL
- Worker 経由の安定 URL

private bucket にする場合は、取得時に signed URL または proxy route が必要。

## Validation Rules

server 側では最低限次を検証する。

### roomPly

- extensions: `.ply`, `.spz`
- MIME: `application/octet-stream`, `application/ply`, `model/ply`
- max size: `500MB`

### roomGlb

- extensions: `.glb`
- MIME: `application/octet-stream`, `model/gltf-binary`
- max size: `500MB`

### audio

- extensions: `.mp3`, `.wav`, `.ogg`, `.m4a`
- MIME: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-wav`, `audio/ogg`, `audio/mp4`, `audio/x-m4a`
- max size: `100MB`

## DB Association Rules

- room の主要 3D ファイルは `scenes` に直接保存する
- audio file 実体は `audio_files`
- 配置は `audio_placements`
- 追加 visual asset は `assets`

つまり、

- room 表示の基礎は `scenes`
- 可視 asset 拡張は `assets`
- 音源実体は `audio_files`
- 空間配置は `audio_placements`

で分離する。

## API Direction

第一段階の想定 API:

- `POST /api/uploads/scene-room`
- `POST /api/uploads/audio`

返却値は少なくとも次。

- `key`
- `url`
- `mimeType`
- `byteSize`
- `originalFilename`

## Failure Policy

- validation 失敗は 400
- 未認可は 401 / 403
- R2 put 失敗は 502 相当
- DB 更新失敗時は object cleanup を検討する

## Why This Shape

### Why object key is scene-centric

Scene 単位でまとまっていると、移管・削除・調査がしやすい。

### Why room assets stay on scenes

主要 3D 表示の入口が常に 1 Scene : 1 room だから。
追加 asset と同じ抽象へ無理に寄せる必要がない。
