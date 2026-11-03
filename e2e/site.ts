/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Собирает сайт в раскладке GitHub Pages (корень и next/) и раздаёт его как Pages:
// неизвестный адрес получает 404.html с кодом 404, папка без слеша перенаправляется на адрес со слешем.
// Запуск: node e2e/site.ts [--no-build]
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, normalize, relative, sep } from "node:path";

export const REPO_BASE = "/my-sielom-web/";
export const PORT = 4174;

const root = join(import.meta.dirname, "..");
const out = join(import.meta.dirname, ".site");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function build(base: string, dest: string) {
  execFileSync("npm", ["run", "build", "--workspace", "@sielom/web", "--", `--base=${base}`], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  cpSync(join(root, "apps/web/dist"), dest, { recursive: true });
}

function assemble() {
  rmSync(out, { recursive: true, force: true });
  const site = join(out, REPO_BASE);
  build(REPO_BASE, site);
  build(`${REPO_BASE}next/`, join(site, "next"));
  const notFound = readFileSync(join(root, "scripts/pages/404.html"), "utf8").replaceAll("__BASE__", REPO_BASE);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "404.html"), notFound);
}

function serve() {
  createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = normalize(join(out, pathname));
    if (relative(out, file).split(sep).includes("..")) {
      res.writeHead(404).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(301, { location: `${url.pathname}/${url.search}` }).end();
        return;
      }
      void send(res, join(file, "index.html"), 200);
      return;
    }
    void send(res, file, 200);
  }).listen(PORT, "127.0.0.1", () => console.log(`http://127.0.0.1:${PORT}${REPO_BASE}`));
}

async function send(res: ServerResponse, file: string, status: number) {
  try {
    const body = await readFile(file);
    res.writeHead(status, { "content-type": MIME[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    const body = await readFile(join(out, "404.html"));
    res.writeHead(404, { "content-type": MIME[".html"] }).end(body);
  }
}

if (!process.argv.includes("--no-build")) assemble();
serve();
