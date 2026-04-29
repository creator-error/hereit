"use server";

import { redirect } from "next/navigation";
import { sortRoles } from "@/features/admin/roles";
import { getAppSession } from "@/server/auth/session";
import {
  createGroup,
  createScene,
  deleteGroup,
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

export async function createGroupAction(formData: FormData) {
  const actor = await requireSession();

  await createGroup({
    name: getRequiredString(formData, "name"),
    description: getOptionalString(formData, "description"),
    createdByUserId: actor.userId,
  });

  redirect("/admin");
}

export async function deleteGroupAction(formData: FormData) {
  const actor = await requireSession();

  await deleteGroup({
    groupId: getRequiredString(formData, "groupId"),
    actorUserId: actor.userId,
    actorRoles: actor.roles,
  });

  redirect("/admin");
}

export async function createSceneAction(formData: FormData) {
  const actor = await requireSession();

  await createScene({
    groupId: getRequiredString(formData, "groupId"),
    name: getRequiredString(formData, "name"),
    description: getOptionalString(formData, "description"),
    shared: getBoolean(formData, "shared"),
    roomPlyUrl: getOptionalString(formData, "roomPlyUrl"),
    roomGlbUrl: getOptionalString(formData, "roomGlbUrl"),
    actorUserId: actor.userId,
    actorRoles: actor.roles,
  });

  redirect("/admin");
}

export async function updateSceneAction(formData: FormData) {
  const actor = await requireSession();

  await updateScene({
    sceneId: getRequiredString(formData, "sceneId"),
    groupId: getRequiredString(formData, "groupId"),
    name: getRequiredString(formData, "name"),
    description: getOptionalString(formData, "description"),
    shared: getBoolean(formData, "shared"),
    roomPlyUrl: getOptionalString(formData, "roomPlyUrl"),
    roomGlbUrl: getOptionalString(formData, "roomGlbUrl"),
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
