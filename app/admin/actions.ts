"use server";

import { redirect } from "next/navigation";
import { sortRoles } from "@/features/admin/roles";
import { getAppSession } from "@/server/auth/session";
import { validateAssetInput } from "@/server/uploads/validation";
import {
  createOrganization,
  createScene,
  deleteOrganization,
  deleteScene,
  updateScene,
  updateSceneShared,
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
    logoUrl: getOptionalString(formData, "logoUrl"),
    createdByUserId: actor.userId,
    actorRoles: actor.roles,
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
  const roomPlyUrl = getOptionalString(formData, "roomPlyUrl");
  const roomGlbUrl = getOptionalString(formData, "roomGlbUrl");

  if (roomPlyUrl) {
    validateAssetInput({ kind: "roomPly", urlOrFilename: roomPlyUrl });
  }

  if (roomGlbUrl) {
    validateAssetInput({ kind: "roomGlb", urlOrFilename: roomGlbUrl });
  }

  await createScene({
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

export async function toggleSceneSharedAction(formData: FormData) {
  const actor = await requireSession();

  await updateSceneShared({
    sceneId: getRequiredString(formData, "sceneId"),
    shared: getRequiredString(formData, "shared") === "true",
    actorUserId: actor.userId,
    actorRoles: actor.roles,
  });

  redirect("/admin");
}
