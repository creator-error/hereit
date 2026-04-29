import { getCloudflareContext } from "@opennextjs/cloudflare";

type R2PutOptionsLike = {
  httpMetadata?: {
    contentType?: string;
  };
};

type R2ObjectBodyLike = {
  body: ReadableStream | null;
  httpMetadata?: {
    contentType?: string;
  };
  size?: number;
  etag?: string;
  writeHttpMetadata?: (headers: Headers) => void;
};

type R2BucketLike = {
  delete(key: string): Promise<void>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  put(key: string, value: ArrayBuffer, options?: R2PutOptionsLike): Promise<unknown>;
};

type CloudflareEnvWithBucket = {
  ASSET_BUCKET?: R2BucketLike;
};

function getAssetBucket(): R2BucketLike | null {
  const { env } = getCloudflareContext();
  return (env as CloudflareEnvWithBucket).ASSET_BUCKET ?? null;
}

function encodeKeySegment(segment: string) {
  return encodeURIComponent(segment);
}

export function buildSceneRoomAssetKey(organizationId: string, sceneId: string, filename: string) {
  return `3dgs/${organizationId}/${sceneId}/${filename}`;
}

export function buildAssetProxyPath(key: string) {
  return `/api/assets/${key.split("/").map(encodeKeySegment).join("/")}`;
}

export async function uploadAssetToR2(input: {
  file: File;
  key: string;
}): Promise<{ key: string; url: string }> {
  const bucket = getAssetBucket();

  if (!bucket) {
    throw new Error("ASSET_BUCKET binding is not configured");
  }

  const arrayBuffer = await input.file.arrayBuffer();
  await bucket.put(input.key, arrayBuffer, {
    httpMetadata: {
      contentType: input.file.type || undefined,
    },
  });

  return {
    key: input.key,
    url: buildAssetProxyPath(input.key),
  };
}

export async function getAssetFromR2(key: string) {
  const bucket = getAssetBucket();

  if (!bucket) {
    return null;
  }

  return bucket.get(key);
}

export async function deleteAssetFromR2(key: string) {
  const bucket = getAssetBucket();

  if (!bucket) {
    return;
  }

  await bucket.delete(key);
}
