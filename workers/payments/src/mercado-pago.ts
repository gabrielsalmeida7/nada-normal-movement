import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { HttpError } from "./http";

/** One client per operation: never retain tokens or mutable SDK config globally. */
function client(accessToken: string) {
  // The pinned SDK forwards remaining request options to fetch. Keep redirects
  // manual so a provider Location cannot move a credential-bearing request.
  const options = { timeout: 8000, maxRetries: 0, redirect: "manual" as const };
  return new MercadoPagoConfig({ accessToken, options });
}

async function request<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // SDK errors can contain provider bodies, payer data and internal details.
    // Preserve only a numeric HTTP status for our existing allowlisted telemetry.
    const status = typeof error === "object" && error !== null && "status" in error
      && typeof error.status === "number" && Number.isInteger(error.status)
      && error.status >= 100 && error.status <= 599 ? error.status : undefined;
    throw new HttpError("UPSTREAM_UNAVAILABLE", 503, status);
  }
}

export function createProviderPreference(accessToken: string, body: Parameters<Preference["create"]>[0]["body"],
  attemptId: string) {
  return request(() => new Preference(client(accessToken)).create({ body,
    requestOptions: { idempotencyKey: attemptId } }));
}

export function getProviderPreference(accessToken: string, id: string) {
  return request(() => new Preference(client(accessToken)).get({ preferenceId: id }));
}

export function getProviderPayment(accessToken: string, id: string) {
  return request(() => new Payment(client(accessToken)).get({ id }));
}

export function searchProviderPreferences(accessToken: string, reference: string) {
  return request(() => new Preference(client(accessToken)).search({
    options: { external_reference: reference, limit: 2, offset: 0 } }));
}

export function searchProviderPayments(accessToken: string, reference: string) {
  return request(() => new Payment(client(accessToken)).search({
    options: { external_reference: reference, limit: 10, offset: 0, sort: "date_created", criteria: "desc" } }));
}
