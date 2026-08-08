/** Cloudflare/Sites worker stub — deploy wiring is out of scope for P3A. */
export default {
  async fetch(): Promise<Response> {
    return new Response("German Learning OS web shell (P3A). Deploy not enabled.", {
      status: 501,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
