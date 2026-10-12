export type IdentityEmailKind = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

export type IdentityEmail = Readonly<{
  recipient: string;
  kind: IdentityEmailKind;
  actionUrl: string;
  expiresAt: Date;
}>;

export interface IdentityEmailDelivery {
  send(message: IdentityEmail): Promise<void>;
}
