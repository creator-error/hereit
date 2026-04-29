import { getServerSession } from "next-auth";
import { authOptions } from "./options";

export function getAppSession() {
  return getServerSession(authOptions);
}
