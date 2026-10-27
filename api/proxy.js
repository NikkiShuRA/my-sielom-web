export default async function handler(req, res) {
  // req.url is the original pre-rewrite path, e.g. /schedule/api/groups?week_id=xxx
  const url = new URL(req.url, "http://localhost");

  // Remove Vercel internal wildcard params
  url.searchParams.delete("...path");
  url.searchParams.delete("__path");

  const pathname = url.pathname;
  let upstream;
  if (pathname.startsWith("/schedule/")) {
    upstream = `https://sielom.ru${pathname}${url.search}`;
  } else if (pathname.startsWith("/strapi/")) {
    upstream = `https://strapi.sielom.ru${pathname.replace(/^\/strapi/, "")}${url.search}`;
  } else {
    res.status(404).end();
    return;
  }

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
