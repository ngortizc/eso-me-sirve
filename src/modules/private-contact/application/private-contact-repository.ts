import type { DeliveryMethod, PrivateContact } from "../domain/private-contact";

export type EncryptedValue = { ciphertext: Uint8Array; nonce: Uint8Array; authTag: Uint8Array };

export type EncryptedPrivateContact = {
  phone: EncryptedValue;
  deliveryMethod: DeliveryMethod;
  location: EncryptedValue;
  instructions: EncryptedValue | null;
  keyVersion: number;
  consentVersion: string;
};

export type OwnerPrivateContactView = PrivateContact & {
  version: number;
  consentVersion: string;
  consentedAt: string;
  updatedAt: string;
};

export type FutureContactAccessDecision =
  | { allowed: false; reason: "PAYMENT_NOT_CONFIRMED" | "NO_ACTIVE_GRANT" | "NOT_PARTICIPANT" }
  | { allowed: true; grantId: string; authorizedAt: string };

export interface FutureContactAccessAuthorizer {
  authorizeAfterVerifiedPayment(input: { actorId: string; listingId: string; reservationId: string; paymentOrderId: string }): Promise<FutureContactAccessDecision>;
}

export interface PrivateContactRepository {
  getForOwner(actorId: string, listingId: string): Promise<OwnerPrivateContactView | null>;
  upsertForOwner(input: {
    actorId: string;
    listingId: string;
    expectedVersion: number;
    encrypted: EncryptedPrivateContact;
    correlationId: string;
  }): Promise<OwnerPrivateContactView>;
}
