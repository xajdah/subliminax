/**
 * Cloudflare Worker entry for the subliminax Worker.
 * Static files come from `assets` (./dist); this fetch handler is the
 * script Wrangler replaces on `wrangler deploy` so the live Worker updates
 * in place (same `name`: subliminax).
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request)
  },
}
