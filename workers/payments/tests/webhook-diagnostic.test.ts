import { describe, expect, it } from "vitest";
import { classifyWebhookQuery } from "../src/webhook-diagnostic";

describe("safe webhook query diagnostics", () => {
  const classify = (query: string) => classifyWebhookQuery(new URL(`https://example.test/webhooks/mercadopago${query}`));
  it("distinguishes modern webhook fields from legacy IPN fields without exposing resource IDs", () => {
    expect(classify("?data.id=123456789&type=payment")).toEqual({ resourceKind: "data_id", topic: "payment",
      topicParameter: "type", declaredSource: "missing" });
    expect(classify("?id=987654321&topic=merchant_order&source_news=ipn")).toEqual({ resourceKind: "legacy_id",
      topic: "merchant_order", topicParameter: "topic", declaredSource: "ipn" });
  });
  it.each(["merchant_order", "topic_merchant_order_wh"])("normalizes the documented merchant-order topic %s", topic => {
    expect(classify(`?data.id=123&type=${topic}`).topic).toBe("merchant_order");
  });
  it("retains conflicting or repeated topic/source declarations as ambiguous labels", () => {
    expect(classify("?data.id=123&id=456&type=payment&topic=merchant_order&source_news=ipn&source_news=webhooks"))
      .toEqual({ resourceKind: "mixed", topic: "ambiguous", topicParameter: "both", declaredSource: "ambiguous" });
    expect(classify("?type=payment&type=payment").topic).toBe("ambiguous");
  });
  it("redacts unknown query values and ignores every unrelated field", () => {
    const result = classify("?data.id=private-id&type=private-topic&source_news=private-source&access_token=private-secret");
    expect(result).toEqual({ resourceKind: "data_id", topic: "other", topicParameter: "type", declaredSource: "other" });
    expect(JSON.stringify(result)).not.toContain("private-");
  });
  it("reports only absent-field labels for an empty query", () => {
    expect(classify("")).toEqual({ resourceKind: "missing", topic: "missing", topicParameter: "none", declaredSource: "missing" });
  });
});
