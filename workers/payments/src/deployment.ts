import { readConfig, REQUIRED_SECRETS, type Bindings } from "./config.ts";

export interface DeploymentConfig {
  vars?: Bindings;
  workers_dev?: boolean;
  preview_urls?: boolean;
  routes?: { pattern: string; custom_domain?: boolean }[];
  secrets?: { required?: string[] };
}

/** Offline validation; Wrangler separately verifies required secrets against Cloudflare. */
export function validateDeployment(target: string, config: DeploymentConfig): void {
  if (!["staging", "production"].includes(target) || config.vars?.APP_ENV !== target) {
    throw new Error("DEPLOYMENT_ENVIRONMENT_INVALID");
  }
  if (config.workers_dev !== false || config.preview_urls !== false) {
    throw new Error("DEPLOYMENT_EXPOSURE_INVALID");
  }
  if (!config.routes?.length || config.routes.some((r) => {
    try {
      const url = new URL(`https://${r.pattern}`);
      return !r.custom_domain || url.hostname !== r.pattern || r.pattern.includes("*") ||
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    } catch { return true; }
  })) throw new Error("DEPLOYMENT_DOMAIN_REQUIRED");
  for (const name of REQUIRED_SECRETS) {
    if (name in (config.vars ?? {}) || !config.secrets?.required?.includes(name)) {
      throw new Error("DEPLOYMENT_SECRET_DECLARATION_INVALID");
    }
  }
  // Placeholders exist only for offline validation and are never deployed.
  readConfig({ ...config.vars, ...Object.fromEntries(REQUIRED_SECRETS.map((name) => [name, "required-at-deploy"])) });
}
