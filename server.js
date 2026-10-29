/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Статика + прокси к sielom.ru schedule API и strapi.sielom.ru (CORS-обход).
// Запуск: node server.js  →  http://localhost:5500
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 5500;
const CACHE_TTL = 5 * 60 * 1000;
const ROOT = __dirname;

const ROUTES = [
  // /schedule/api/groups → https://sielom.ru/schedule/api/groups (полный путь)
  { prefix: "/schedule/api/", upstream: "https://sielom.ru", strip: "" },
  // /strapi/api/employees → https://strapi.sielom.ru/api/employees (убираем /strapi)
  { prefix: "/strapi/",       upstream: "https://strapi.sielom.ru", strip: "/strapi" },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};
const HIDDEN = /^(\.|node_modules|server\.js$)/;

const cache = new Map(); // cacheKey → { at, status, type, body }

async function proxy(req, res, upstream, key) {
  const cacheKey = upstream + key;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return send(res, hit.status, hit.type, hit.body, "HIT");

  try {
    const r = await fetch(upstream + key, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    const body = Buffer.from(await r.arrayBuffer());
    const type = r.headers.get("content-type") || "application/json";
    if (r.ok) cache.set(cacheKey, { at: Date.now(), status: r.status, type, body });
    send(res, r.status, type, body, "MISS");
  } catch (err) {
    if (hit) return send(res, hit.status, hit.type, hit.body, "STALE");
    send(res, 502, "application/json", JSON.stringify({ error: "upstream_unavailable", detail: String(err.message || err) }));
  }
}

function send(res, status, type, body, cacheState) {
  const headers = { "content-type": type, "access-control-allow-origin": "*" };
  if (cacheState) headers["x-cache"] = cacheState;
  res.writeHead(status, headers);
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(301, { location });
  res.end();
}

async function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname);
  // как на GitHub Pages: презентация из docs/ доступна по /about/
  if (rel === "/about") return redirect(res, "/about/");
  if (rel.startsWith("/about/")) rel = "/docs" + rel.slice("/about".length);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(ROOT, rel));
  const relFromRoot = path.relative(ROOT, file);
  if (relFromRoot.startsWith("..") || path.isAbsolute(relFromRoot) || relFromRoot.split(path.sep).some((p) => HIDDEN.test(p))) {
    return send(res, 404, "text/plain; charset=utf-8", "Not found");
  }
  try {
    const data = await fs.readFile(file);
    send(res, 200, MIME[path.extname(file).toLowerCase()] || "application/octet-stream", data);
  } catch {
    send(res, 404, "text/plain; charset=utf-8", "Not found");
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "text/plain; charset=utf-8", "Method not allowed");
  for (const { prefix, upstream, strip } of ROUTES) {
    if (url.pathname.startsWith(prefix)) {
      const key = url.pathname.slice(strip.length) + url.search;
      return proxy(req, res, upstream, key);
    }
  }
  serveStatic(res, url.pathname);
}).listen(PORT, "127.0.0.1", () => console.log(`http://localhost:${PORT}`));
