/** Request-local, allowlisted metadata only. Never attach provider/request data. */
export interface WebhookDiagnostic {
  stage: "configuration" | "routing" | "signature" | "payload" | "provider_lookup_and_validation" | "database_apply" | "completed";
  signatureVerified: boolean;
  rejectedPaymentFields?: string[];
}

const CODES = new Set([
  "CONFIGURATION_INVALID", "CHECKOUT_UNAVAILABLE", "WEBHOOK_SIGNATURE_INVALID",
  "WEBHOOK_RESOURCE_MISMATCH", "INVALID_PAYLOAD", "PAYLOAD_TOO_LARGE",
  "UPSTREAM_UNAVAILABLE", "PROVIDER_PAYMENT_MISMATCH",
]);

export function diagnosticCode(code: string): string {
  return CODES.has(code) ? code : "CHECKOUT_UNAVAILABLE";
}
