export type Money = Readonly<{ amount: number; currency: "CLP" }>;

export type PaymentOrderDraft = Readonly<{
  reservationId: string;
  recipientId: string;
  serviceFee: Money;
  expiresAt: string;
  idempotencyKey: string;
}>;

export type VerifiedGatewayConfirmation = Readonly<{
  providerEventId: string;
  providerPaymentId: string;
  orderReference: string;
  amount: Money;
  occurredAt: string;
  authenticated: true;
}>;

export interface PaymentGatewayPort {
  createCheckout(order: PaymentOrderDraft): Promise<{ checkoutReference: string; redirectUrl: string }>;
  verifyWebhook(request: Request): Promise<VerifiedGatewayConfirmation>;
  getPaymentStatus(providerPaymentId: string): Promise<"PENDING" | "CONFIRMED" | "FAILED" | "CANCELLED">;
}

export interface PaymentConfirmationPort {
  confirmVerifiedPayment(input: VerifiedGatewayConfirmation): Promise<{ confirmed: boolean; duplicate: boolean }>;
  reconcilePendingPayments(): Promise<number>;
}

// EMS-004 solo fija contratos. Ningún adaptador, checkout, webhook o transición PAID está habilitado.
export type LatePaymentResolution = "REJECT_AND_RECONCILE";
export type ContactUnlockPolicy = "ONLY_AFTER_SERVER_CONFIRMED_PAYMENT";
