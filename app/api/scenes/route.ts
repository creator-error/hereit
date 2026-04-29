import { getAppSession } from "@/server/auth/session";
import { sortRoles } from "@/features/admin/roles";
import { listVisibleScenesForActor } from "@/server/repositories/user-repository";

export async function GET() {
  const session = await getAppSession();
  const actor =
    session?.user?.id
      ? {
          userId: session.user.id,
          roles: sortRoles(session.roles ?? []),
        }
      : null;

  const scenes = await listVisibleScenesForActor(actor);

  return Response.json({ scenes });
}
