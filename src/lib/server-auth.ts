import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
  };
}
