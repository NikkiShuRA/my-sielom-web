/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Настройки dev-сервера. Всё, что зависит от окружения, читается только здесь
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

module.exports = {
  port: Number(process.env.PORT) || 5500,
  host: process.env.HOST || "127.0.0.1",
  cacheTtl: 5 * 60 * 1000,
  upstreamTimeout: 20000,
  repoRoot: REPO_ROOT,
  frontendDir: path.join(REPO_ROOT, "frontend"),
  docsDir: path.join(REPO_ROOT, "docs"),
  routes: [
    // /schedule/api/groups → https://sielom.ru/schedule/api/groups (полный путь)
    { prefix: "/schedule/api/", upstream: "https://sielom.ru", strip: "" },
    // /strapi/api/employees → https://strapi.sielom.ru/api/employees (убираем /strapi)
    { prefix: "/strapi/",       upstream: "https://strapi.sielom.ru", strip: "/strapi" },
  ],
};
