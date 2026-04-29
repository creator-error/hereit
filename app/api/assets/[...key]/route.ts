import { getAssetFromR2 } from "@/server/uploads/r2";

type RouteContext = {
  params: Promise<{
    key: string[];
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { key } = await context.params;
  const assetKey = key.join("/");
  const object = await getAssetFromR2(assetKey);

  if (!object) {
    return Response.json({ error: "Asset not found" }, { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);

  if (!headers.has("content-type") && object.httpMetadata?.contentType) {
    headers.set("content-type", object.httpMetadata.contentType);
  }

  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }

  if (typeof object.size === "number") {
    headers.set("content-length", String(object.size));
  }

  if (object.etag) {
    headers.set("etag", object.etag);
  }

  return new Response(object.body, { headers });
}
