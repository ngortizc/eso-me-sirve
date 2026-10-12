import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@/modules/identity/application/safe-return-to";
import { isUserRole, type UserRole } from "@/modules/identity/domain/role";
import { auth } from "@/modules/identity/infrastructure/auth";

export type AuthorizedUser = Readonly<{
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  commune: string | null;
}>;

export async function getCurrentIdentitySession(requestHeaders?: Headers) {
  return auth.api.getSession({ headers: requestHeaders ?? (await headers()) });
}

export async function getCurrentUser(requestHeaders?: Headers): Promise<AuthorizedUser | null> {
  const session = await getCurrentIdentitySession(requestHeaders);
  if (!session || !isUserRole(session.user.role)) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    role: session.user.role,
    commune: session.user.commune ?? null
  };
}

export async function requireUser(returnTo: string): Promise<AuthorizedUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
  return user;
}

export async function requireRole(role: UserRole, returnTo: string): Promise<AuthorizedUser> {
  const user = await requireUser(returnTo);
  if (user.role !== role) redirect("/acceso-denegado");
  return user;
}
