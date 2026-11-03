/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Локальный сервер для разработки: статика из frontend/ и docs/ + прокси к API.
// Запуск из корня репозитория: npm start  →  http://localhost:5500
const http = require("node:http");
const config = require("./src/config");
const { createHandler } = require("./src/app");

const server = http.createServer(createHandler(config));

server.listen(config.port, config.host, () => console.log(`http://localhost:${config.port}`));

// Ctrl+C и остановка из IDE закрывают сервер, а не обрывают его
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
