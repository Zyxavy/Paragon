// Augments the generated worker-configuration.d.ts with bindings that are
// set in the Cloudflare dashboard rather than in wrangler.jsonc.
// Mongo journal storage is optional (ADR 003): all consumers null-check the URI.
interface CloudflareBindings {
	MONGODB_URI?: string;
}