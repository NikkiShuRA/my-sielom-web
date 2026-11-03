/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Сервер поднимается на свободном порту, вместо sielom.ru — локальный поддельный источник
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const config = require("../src/config");
const { createHandler } = require("../src/app");

let server, upstream, base, upstreamHits = 0;

function listen(srv) {
  return new Promise((resolve) => srv.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${srv.address().port}`)));
}

// fetch склеивает "/a/../b", поэтому опасные адреса шлём как есть
function rawGet(pathname) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const socket = net.connect(port, "127.0.0.1", () => socket.write(`GET ${pathname} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`));
    let data = "";
    socket.on("data", (chunk) => (data += chunk));
    socket.on("end", () => resolve(Number(data.split(" ")[1])));
    socket.on("error", reject);
  });
}

before(async () => {
  upstream = http.createServer((req, res) => {
    upstreamHits++;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ path: req.url }));
  });
  const upstreamUrl = await listen(upstream);
  server = http.createServer(createHandler({
    ...config,
    routes: [
      { prefix: "/schedule/api/", upstream: upstreamUrl, strip: "" },
      { prefix: "/strapi/", upstream: upstreamUrl, strip: "/strapi" },
      { prefix: "/down/", upstream: "http://127.0.0.1:1", strip: "/down" },
    ],
  }));
  base = await listen(server);
});

after(() => {
  server.close();
  upstream.close();
});

test("отдаёт приложение из frontend/ в корне и в /next/", async () => {
  for (const p of ["/", "/next/"]) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /^text\/html/);
    assert.match(await r.text(), /<script src="app\.js/);
  }
});

test("отдаёт презентацию из docs/ по /about/", async () => {
  const r = await fetch(base + "/about/");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /\.\.\/demo\.html/);
});

test("перенаправляет /next и /about на адрес со слешем", async () => {
  for (const p of ["/next", "/about"]) {
    const r = await fetch(base + p, { redirect: "manual" });
    assert.equal(r.status, 301);
    assert.equal(r.headers.get("location"), p + "/");
  }
});

test("шрифты отдаются с типом font/woff2", async () => {
  const r = await fetch(base + "/assets/fonts/inter-latin.woff2");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "font/woff2");
});

test("не выпускает за пределы frontend/ и docs/", async () => {
  assert.equal(await rawGet("/../backend/server.js"), 404);
  assert.equal(await rawGet("/..%2fpackage.json"), 404);
  assert.equal(await rawGet("/about/..%2f..%2fREADME.md"), 404);
});

test("не отдаёт скрытые файлы", async () => {
  assert.equal((await fetch(base + "/about/.nojekyll")).status, 404);
});

test("битый адрес — 400, а не падение сервера", async () => {
  assert.equal(await rawGet("/%E0%A4%A"), 400);
  assert.equal((await fetch(base + "/")).status, 200);
});

test("принимает только GET и HEAD", async () => {
  assert.equal((await fetch(base + "/", { method: "POST" })).status, 405);
  assert.equal((await fetch(base + "/", { method: "HEAD" })).status, 200);
});

test("проксирует API и кеширует ответ", async () => {
  const before = upstreamHits;
  const first = await fetch(base + "/schedule/api/groups?x=1");
  assert.equal(first.headers.get("x-cache"), "MISS");
  assert.deepEqual(await first.json(), { path: "/schedule/api/groups?x=1" });
  const second = await fetch(base + "/schedule/api/groups?x=1");
  assert.equal(second.headers.get("x-cache"), "HIT");
  assert.equal(upstreamHits, before + 1);
});

test("убирает префикс /strapi", async () => {
  const r = await fetch(base + "/strapi/api/employees");
  assert.deepEqual(await r.json(), { path: "/api/employees" });
});

test("недоступный источник — 502", async () => {
  const r = await fetch(base + "/down/anything");
  assert.equal(r.status, 502);
  assert.equal((await r.json()).error, "upstream_unavailable");
});
