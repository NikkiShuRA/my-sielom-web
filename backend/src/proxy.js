/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Прокси к sielom.ru schedule API и strapi.sielom.ru (CORS-обход) с кешем в памяти.
// Если источник недоступен, отдаём последний удачный ответ, даже устаревший
const { send } = require("./http");

function createProxy({ cacheTtl, upstreamTimeout }) {
  const cache = new Map(); // url → { at, status, type, body }

  return async function proxy(res, url) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < cacheTtl) return send(res, hit.status, hit.type, hit.body, "HIT");

    try {
      const r = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(upstreamTimeout),
      });
      const body = Buffer.from(await r.arrayBuffer());
      const type = r.headers.get("content-type") || "application/json";
      if (r.ok) cache.set(url, { at: Date.now(), status: r.status, type, body });
      send(res, r.status, type, body, "MISS");
    } catch (err) {
      if (hit) return send(res, hit.status, hit.type, hit.body, "STALE");
      send(res, 502, "application/json", JSON.stringify({ error: "upstream_unavailable", detail: String(err.message || err) }));
    }
  };
}

module.exports = { createProxy };
