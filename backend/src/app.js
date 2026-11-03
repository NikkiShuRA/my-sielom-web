/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Обработчик запросов без запуска сервера: так его можно поднять в тестах на любом порту
const { sendText } = require("./http");
const { createProxy } = require("./proxy");
const { createStatic } = require("./static");
const { createVersions } = require("./versions");

function createHandler(options) {
  const proxy = createProxy(options);
  const serveStatic = createStatic(options);
  const sendVersions = createVersions(options);

  return function handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method not allowed");
    for (const { prefix, upstream, strip } of options.routes) {
      if (url.pathname.startsWith(prefix)) {
        return proxy(res, upstream + url.pathname.slice(strip.length) + url.search);
      }
    }
    if (url.pathname === "/versions.json") return sendVersions(res);
    serveStatic(res, url.pathname);
  };
}

module.exports = { createHandler };
