/** Request-local, allowlisted metadata only. Never attach provider/request data. */
export type SignatureFailureReason = "query_id_missing" | "query_id_duplicate" | "query_id_invalid" |
  "request_id_missing" | "request_id_invalid" | "signature_missing" | "signature_format_invalid" |
  "timestamp_outside_window" | "hmac_mismatch";

export interface WebhookQueryDiagnostic {
  resourceKind: "data_id" | "legacy_id" | "mixed" | "missing";
  topic: "payment" | "merchant_order" | "chargebacks" | "other" | "missing" | "ambiguous";
  topicParameter: "type" | "topic" | "both" | "none";
  declaredSource: "webhooks" | "ipn" | "other" | "missing" | "ambiguous";
}

/** Describe query field shapes with fixed labels; never return their raw values. */
export function classifyWebhookQuery(url: URL): WebhookQueryDiagnostic {
  const params = url.searchParams;
  const hasData = params.has("data.id");
  const hasLegacy = params.has("id");
  const types = params.getAll("type");
  const topics = params.getAll("topic");
  const normalize = (value: string): WebhookQueryDiagnostic["topic"] => {
    if (value === "payment") return "payment";
    if (value === "merchant_order" || value === "topic_merchant_order_wh") return "merchant_order";
    if (value === "chargebacks" || value === "topic_chargebacks_wh") return "chargebacks";
    return "other";
  };
  const values = [...types, ...topics].map(normalize);
  const sources = params.getAll("source_news");
  return {
    resourceKind: hasData && hasLegacy ? "mixed" : hasData ? "data_id" : hasLegacy ? "legacy_id" : "missing",
    topic: !values.length ? "missing" : types.length > 1 || topics.length > 1 || new Set(values).size > 1
      ? "ambiguous" : values[0],
    topicParameter: types.length && topics.length ? "both" : types.length ? "type" : topics.length ? "topic" : "none",
    declaredSource: !sources.length ? "missing" : sources.length > 1 ? "ambiguous"
      : sources[0] === "webhooks" ? "webhooks" : sources[0] === "ipn" ? "ipn" : "other",
  };
}

export interface WebhookDiagnostic {
  stage: "configuration" | "routing" | "signature" | "payload" | "provider_lookup_and_validation" | "database_apply" | "completed";
  signatureVerified: boolean;
  signatureSource?: "application" | "test_application";
  query?: WebhookQueryDiagnostic;
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
