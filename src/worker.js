// The ledger data changes with every mutation. Served as a plain static asset,
// Cloudflare's edge kept returning the first deploy's copy (cache HIT on a stale
// etag, query strings ignored). Mutable data must flow through the worker with
// an explicit no-store, so /evolution always shows the current pulse.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/mutations.json") {
      const asset = await env.ASSETS.fetch(new Request(new URL("/mutations.json", url.origin)));
      const headers = new Headers(asset.headers);
      headers.set("Cache-Control", "no-store");
      headers.delete("ETag");
      return new Response(asset.body, { status: asset.status, headers });
    }
    return env.ASSETS.fetch(request);
  },
};
