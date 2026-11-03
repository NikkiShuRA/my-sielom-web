/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Общие ответы сервера и типы файлов
const TEXT = "text/plain; charset=utf-8";

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
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function send(res, status, type, body, cacheState) {
  const headers = { "content-type": type, "access-control-allow-origin": "*" };
  if (cacheState) headers["x-cache"] = cacheState;
  res.writeHead(status, headers);
  res.end(body);
}

function sendText(res, status, text) {
  send(res, status, TEXT, text);
}

function redirect(res, location) {
  res.writeHead(301, { location });
  res.end();
}

module.exports = { MIME, send, sendText, redirect };
