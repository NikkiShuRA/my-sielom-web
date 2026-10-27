export default async function handler(req, res) {
  // req.url is the original pre-rewrite path, e.g. /schedule/api/groups?week_id=xxx
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  // Strip Vercel-injected params from the raw query string without re-encoding brackets
  // (URLSearchParams encodes [] as %5B%5D which breaks Strapi / schedule API)
  const rawQuery = req.url.split("?")[1] || "";
  const cleanQuery = rawQuery
    .split("&")
    .filter((p) => p && !/^(\.{3}path|__path)=/.test(p))
    .join("&");
  const search = cleanQuery ? "?" + cleanQuery : "";

  let upstream;
  if (pathname.startsWith("/schedule/")) {
    upstream = `https://sielom.ru${pathname}${search}`;
  } else if (pathname.startsWith("/strapi/")) {
    upstream = `https://strapi.sielom.ru${pathname.replace(/^\/strapi/, "")}${search}`;
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
