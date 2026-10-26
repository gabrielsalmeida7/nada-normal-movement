/** Request-local, allowlisted metadata only. Never attach provider/request data. */
export type SignatureFailureReason = "query_id_missing" | "query_id_duplicate" | "query_id_invalid" |
  "request_id_missing" | "request_id_invalid" | "signature_missing" | "signature_format_invalid" |
  "timestamp_outside_window" | "hmac_mismatch";

export interface WebhookDiagnostic {
  stage: "configuration" | "routing" | "signature" | "payload" | "provider_lookup_and_validation" | "database_apply" | "completed";
  signatureVerified: boolean;
  signatureSource?: "application" | "test_application";
  signatureFailureReasons?: SignatureFailureReason[];
  rejectedPaymentFields?: string[];
  rejectedTestAccountChecks?: string[];
}

const CODES = new Set([
  "CONFIGURATION_INVALID", "CHECKOUT_UNAVAILABLE", "WEBHOOK_SIGNATURE_INVALID",
  "WEBHOOK_RESOURCE_MISMATCH", "INVALID_PAYLOAD", "PAYLOAD_TOO_LARGE",
  "UPSTREAM_UNAVAILABLE", "PROVIDER_PAYMENT_MISMATCH", "PROVIDER_TEST_ACCOUNT_UNVERIFIED",
]);

export function diagnosticCode(code: string): string {
  return CODES.has(code) ? code : "CHECKOUT_UNAVAILABLE";
}
