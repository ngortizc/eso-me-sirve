import type { UserRole } from "@/modules/identity/domain/role";

export function canAccessUserResource(actor: { id: string; role: UserRole }, ownerId: string): boolean {
  return actor.id === ownerId || actor.role === "ADMIN";
}
