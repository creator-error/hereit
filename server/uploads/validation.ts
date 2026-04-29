type UploadAssetKind = "roomPly" | "roomGlb" | "audio";

type AssetValidationInput = {
  byteSize?: number | null;
  kind: UploadAssetKind;
  mimeType?: string | null;
  urlOrFilename: string;
};

const MB = 1024 * 1024;

const ASSET_RULES: Record<
  UploadAssetKind,
  {
    allowedExtensions: string[];
    allowedMimeTypes: string[];
    maxBytes: number;
  }
> = {
  roomPly: {
    allowedExtensions: [".ply", ".spz"],
    allowedMimeTypes: [
      "application/octet-stream",
      "application/ply",
      "model/ply",
    ],
    maxBytes: 500 * MB,
  },
  roomGlb: {
    allowedExtensions: [".glb"],
    allowedMimeTypes: [
      "application/octet-stream",
      "model/gltf-binary",
    ],
    maxBytes: 500 * MB,
  },
  audio: {
    allowedExtensions: [".mp3", ".wav", ".ogg", ".m4a"],
    allowedMimeTypes: [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/mp4",
      "audio/x-m4a",
    ],
    maxBytes: 100 * MB,
  },
};

function getExtension(value: string) {
  try {
    const pathname = value.includes("://") ? new URL(value).pathname : value;
    const normalized = pathname.toLowerCase();
    const index = normalized.lastIndexOf(".");
    return index >= 0 ? normalized.slice(index) : "";
  } catch {
    const normalized = value.toLowerCase();
    const index = normalized.lastIndexOf(".");
    return index >= 0 ? normalized.slice(index) : "";
  }
}

export function validateAssetInput(input: AssetValidationInput) {
  const rule = ASSET_RULES[input.kind];
  const extension = getExtension(input.urlOrFilename);

  if (!rule.allowedExtensions.includes(extension)) {
    throw new Error(
      `${input.kind} must use one of: ${rule.allowedExtensions.join(", ")}`,
    );
  }

  if (
    typeof input.byteSize === "number" &&
    Number.isFinite(input.byteSize) &&
    input.byteSize > rule.maxBytes
  ) {
    throw new Error(`${input.kind} exceeds max size of ${Math.round(rule.maxBytes / MB)}MB`);
  }

  if (input.mimeType) {
    const normalizedMime = input.mimeType.toLowerCase();
    if (!rule.allowedMimeTypes.includes(normalizedMime)) {
      throw new Error(
        `${input.kind} must use one of: ${rule.allowedMimeTypes.join(", ")}`,
      );
    }
  }
}
