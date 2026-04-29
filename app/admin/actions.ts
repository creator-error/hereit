"use server";

import { redirect } from "next/navigation";
import { sortRoles } from "@/features/admin/roles";
import { getAppSession } from "@/server/auth/session";
import { buildSceneRoomAssetKey, deleteAssetFromR2, uploadAssetToR2 } from "@/server/uploads/r2";
import { validateAssetInput } from "@/server/uploads/validation";
import {
  createUniqueSceneId,
  createOrganization,
  createScene,
  deleteOrganization,
  deleteScene,
  updateScene,
} from "@/server/repositories/user-repository";

function getRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function getOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function getRequiredFile(formData: FormData, key: string): File {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0 || value.name.trim().length === 0) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function getFileExtension(filename: string) {
  const normalized = filename.toLowerCase();
  const index = normalized.lastIndexOf(".");
  return index >= 0 ? normalized.slice(index) : "";
}

async function requireSession() {
  const session = await getAppSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return {
    userId: session.user.id,
    roles: sortRoles(session.roles ?? []),
  };
}

export async function createOrganizationAction(formData: FormData) {
  const actor = await requireSession();

  await createOrganization({
    name: getRequiredString(formData, "name"),
    description: getOptionalString(formData, "description"),
    createdByUserId: actor.userId,
  });

  redirect("/admin");
}

export async function deleteOrganizationAction(formData: FormData) {
  const actor = await requireSession();

  await deleteOrganization({
    organizationId: getRequiredString(formData, "organizationId"),
    actorUserId: actor.userId,
    actorRoles: actor.roles,
  });

  redirect("/admin");
}

export async function createSceneAction(formData: FormData) {
  const actor = await requireSession();
  const organizationId = getRequiredString(formData, "organizationId");
  const roomPlyFile = getRequiredFile(formData, "roomPlyFile");
  const roomGlbFile = getRequiredFile(formData, "roomGlbFile");
  const roomPlyExtension = getFileExtension(roomPlyFile.name);

  validateAssetInput({
    kind: "roomPly",
    urlOrFilename: roomPlyFile.name,
    mimeType: roomPlyFile.type,
    byteSize: roomPlyFile.size,
  });
  validateAssetInput({
    kind: "roomGlb",
    urlOrFilename: roomGlbFile.name,
    mimeType: roomGlbFile.type,
    byteSize: roomGlbFile.size,
  });

  const sceneId = await createUniqueSceneId();
  const roomPlyKey = buildSceneRoomAssetKey(organizationId, sceneId, `room${roomPlyExtension}`);
  const roomGlbKey = buildSceneRoomAssetKey(organizationId, sceneId, "collision.glb");
  const roomPlyUpload = await uploadAssetToR2({
    file: roomPlyFile,
    key: roomPlyKey,
  });

  try {
    const roomGlbUpload = await uploadAssetToR2({
      file: roomGlbFile,
      key: roomGlbKey,
    });

    try {
      await createScene({
        sceneId,
        organizationId,
        name: getRequiredString(formData, "name"),
        description: getOptionalString(formData, "description"),
        shared: getBoolean(formData, "shared"),
        roomPlyUrl: roomPlyUpload.url,
        roomGlbUrl: roomGlbUpload.url,
        actorUserId: actor.userId,
        actorRoles: actor.roles,
      });
    } catch (error) {
      await Promise.all([
        deleteAssetFromR2(roomPlyKey),
        deleteAssetFromR2(roomGlbKey),
      ]);
      throw error;
    }
  } catch (error) {
    await deleteAssetFromR2(roomPlyKey);
    throw error;
  }

  redirect(`/scenes/${sceneId}`);
}

export async function updateSceneAction(formData: FormData) {
  const actor = await requireSession();
  const roomPlyUrl = getOptionalString(formData, "roomPlyUrl");
  const roomGlbUrl = getOptionalString(formData, "roomGlbUrl");

  if (roomPlyUrl) {
    validateAssetInput({ kind: "roomPly", urlOrFilename: roomPlyUrl });
  }

  if (roomGlbUrl) {
    validateAssetInput({ kind: "roomGlb", urlOrFilename: roomGlbUrl });
  }

  await updateScene({
    sceneId: getRequiredString(formData, "sceneId"),
    organizationId: getRequiredString(formData, "organizationId"),
    name: getRequiredString(formData, "name"),
    description: getOptionalString(formData, "description"),
    shared: getBoolean(formData, "shared"),
    roomPlyUrl,
    roomGlbUrl,
    actorUserId: actor.userId,
    actorRoles: actor.roles,
  });

  redirect("/admin");
}

export async function deleteSceneAction(formData: FormData) {
  const actor = await requireSession();

  await deleteScene({
    sceneId: getRequiredString(formData, "sceneId"),
    actorUserId: actor.userId,
    actorRoles: actor.roles,
  });

  redirect("/admin");
}
