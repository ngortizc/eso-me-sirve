import Link from "next/link";
import { getCurrentUser } from "@/modules/identity/application/session";

export async function AuthMenu() {
  const user = await getCurrentUser();
  return user
    ? <Link className="nav-link max-w-40 truncate" href="/perfil">{user.name}</Link>
    : <Link className="nav-link" href="/ingresar">Ingresar</Link>;
}
