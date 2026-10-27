export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const apiPath = url.pathname.replace(/^\/api\/strapi/, "");
  const upstream = `https://strapi.sielom.ru/api${apiPath}${url.search}`;
  try {
    const r = await fetch(upstream, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    const body = await r.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: "upstream_unavailable", detail: String(e.message) });
  }
}
