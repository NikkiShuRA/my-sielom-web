/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// На сайте versions.json создаёт сборка, локально берём последнюю версию из тегов git
const { execFile } = require("node:child_process");
const { MIME, send, sendText } = require("./http");

function createVersions({ repoRoot }) {
  return function sendVersions(res) {
    execFile("git", ["tag", "--list", "v*", "--sort=-v:refname"], { cwd: repoRoot }, (err, out) => {
      const latest = err ? "" : out.split("\n")[0].trim().slice(1);
      if (!latest) return sendText(res, 404, "Not found");
      send(res, 200, MIME[".json"], JSON.stringify([
        { label: "Предпросмотр", note: `новее ${latest}`, path: "next/" },
        { label: latest, note: "актуальная", path: "" },
      ]));
    });
  };
}

module.exports = { createVersions };
