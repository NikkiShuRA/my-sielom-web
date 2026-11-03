/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Раздача статики с теми же адресами, что на GitHub Pages:
// приложение из frontend/ в корне и в /next/, презентация из docs/ в /about/
const fs = require("node:fs/promises");
const path = require("node:path");
const { MIME, send, sendText, redirect } = require("./http");

const HIDDEN = /^(\.|node_modules$)/;

function createStatic({ frontendDir, docsDir }) {
  // Первый подходящий префикс выигрывает, поэтому корень идёт последним
  const mounts = [
    { prefix: "/about/", dir: docsDir },
    { prefix: "/", dir: frontendDir },
  ];

  // Возвращает путь к файлу или null, если адрес ведёт за пределы папки или к скрытому файлу
  function resolve(dir, rel) {
    const file = path.normalize(path.join(dir, rel));
    const fromDir = path.relative(dir, file);
    if (fromDir.startsWith("..") || path.isAbsolute(fromDir)) return null;
    if (fromDir.split(path.sep).some((p) => HIDDEN.test(p))) return null;
    return file;
  }

  return async function serveStatic(res, pathname) {
    let rel;
    try {
      rel = decodeURIComponent(pathname);
    } catch {
      return sendText(res, 400, "Bad request");
    }
    // предпросмотр на GitHub Pages лежит в /next/; локально это те же файлы
    if (rel === "/next") return redirect(res, "/next/");
    if (rel.startsWith("/next/")) rel = rel.slice("/next".length);
    if (rel === "/about") return redirect(res, "/about/");
    if (rel.endsWith("/")) rel += "index.html";

    const mount = mounts.find((m) => rel.startsWith(m.prefix));
    const file = resolve(mount.dir, rel.slice(mount.prefix.length));
    if (!file) return sendText(res, 404, "Not found");
    try {
      const data = await fs.readFile(file);
      send(res, 200, MIME[path.extname(file).toLowerCase()] || "application/octet-stream", data);
    } catch {
      sendText(res, 404, "Not found");
    }
  };
}

module.exports = { createStatic };
