/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it, vi } from "vitest";
import { fetchJson, HttpError } from "../src/http.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const respondWith = (response: Response) => vi.fn<typeof fetch>(() => Promise.resolve(response));
const initOf = (doFetch: ReturnType<typeof respondWith>) => doFetch.mock.calls[0]?.[1];

describe("fetchJson", () => {
  it("возвращает разобранный JSON и передаёт сигнал таймаута", async () => {
    const doFetch = respondWith(json({ a: 1 }));
    await expect(fetchJson("https://x/y", { fetch: doFetch })).resolves.toEqual({ a: 1 });
    expect(initOf(doFetch)?.signal).toBeInstanceOf(AbortSignal);
    expect(initOf(doFetch)).not.toHaveProperty("priority");
  });

  it("передаёт priority, если задан", async () => {
    const doFetch = respondWith(json([]));
    await fetchJson("https://x/y", { fetch: doFetch, priority: "low" });
    expect(initOf(doFetch)).toMatchObject({ priority: "low" });
  });

  it("не-ok ответ — HttpError со статусом", async () => {
    const doFetch = respondWith(json({}, 503));
    const error = await fetchJson("https://x/y", { fetch: doFetch }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(503);
  });

  it("зависший запрос обрывается по таймауту", async () => {
    const hang = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted", { cause: init.signal?.reason }));
          });
        }),
    );
    const error = await fetchJson("https://x/y", { fetch: hang, timeoutMs: 10 }).catch((e: unknown) => e);
    expect(((error as Error).cause as Error).name).toBe("TimeoutError");
  });

  it("сетевая ошибка пробрасывается как есть", async () => {
    const failure = new TypeError("Failed to fetch");
    const doFetch = vi.fn<typeof fetch>(() => Promise.reject(failure));
    await expect(fetchJson("https://x/y", { fetch: doFetch })).rejects.toBe(failure);
  });
});
