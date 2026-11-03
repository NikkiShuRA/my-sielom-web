/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/contract/index.ts";
import { readSnapshot, withSnapshot } from "../src/offline/withSnapshot.ts";
import type { SnapshotRecord } from "../src/storage/index.ts";

const NOW = new Date("2026-03-02T10:00:00.000Z");
const SAVED_AT = "2026-03-01T08:00:00.000Z";

const makeStore = (snapshot: SnapshotRecord | null = null) => ({
  get: vi.fn(() => Promise.resolve(snapshot)) as never,
  put: vi.fn(() => Promise.resolve()),
});

const snapshot: SnapshotRecord<string> = { data: "старое", fetchedAt: SAVED_AT, savedAt: SAVED_AT, pinned: false };

const run = (
  request: () => Promise<string>,
  store: ReturnType<typeof makeStore>,
  reason: "offline" | "upstream" = "upstream",
  pinned?: boolean,
) =>
  withSnapshot({
    key: "k",
    request,
    store,
    classify: () => Promise.resolve(reason),
    now: () => NOW,
    ...(pinned === undefined ? {} : { pinned }),
  });

describe("withSnapshot", () => {
  it("успех: отдаёт данные из сети и сохраняет копию", async () => {
    const store = makeStore();
    const result = await run(() => Promise.resolve("свежее"), store);
    expect(result).toEqual({ data: "свежее", meta: { source: "network", fetchedAt: NOW.toISOString() } });
    expect(store.put).toHaveBeenCalledWith("k", "свежее", { fetchedAt: NOW.toISOString() });
  });

  it("передаёт pinned в хранилище", async () => {
    const store = makeStore();
    await run(() => Promise.resolve("x"), store, "upstream", true);
    expect(store.put).toHaveBeenCalledWith("k", "x", { fetchedAt: NOW.toISOString(), pinned: true });
  });

  it("сбой записи копии не ломает ответ", async () => {
    const store = makeStore();
    store.put.mockRejectedValue(new Error("quota"));
    await expect(run(() => Promise.resolve("ok"), store)).resolves.toMatchObject({ data: "ok" });
  });

  it("not_found пробрасывается как есть, копия не используется", async () => {
    const store = makeStore(snapshot);
    const error = new ApiError("not_found", "нет такой группы");
    await expect(run(() => Promise.reject(error), store)).rejects.toBe(error);
    expect(store.get).not.toHaveBeenCalled();
  });

  it("invalid_response с копией — копия с причиной upstream, без вызова classify", async () => {
    const store = makeStore(snapshot);
    const classify = vi.fn(() => Promise.resolve("offline" as const));
    const result = await withSnapshot({
      key: "k",
      request: () => Promise.reject(new ApiError("invalid_response", "формат")),
      store,
      classify,
      now: () => NOW,
    });
    expect(result).toEqual({ data: "старое", meta: { source: "saved", fetchedAt: SAVED_AT, reason: "upstream" } });
    expect(classify).not.toHaveBeenCalled();
  });

  it("invalid_response без копии — исходная ошибка", async () => {
    const error = new ApiError("invalid_response", "формат");
    await expect(run(() => Promise.reject(error), makeStore())).rejects.toBe(error);
  });

  it("сбой с копией — копия и причина от classify", async () => {
    const result = await run(() => Promise.reject(new Error("boom")), makeStore(snapshot), "offline");
    expect(result).toEqual({ data: "старое", meta: { source: "saved", fetchedAt: SAVED_AT, reason: "offline" } });
  });

  it("сбой без копии — ApiError с kind от classify и причиной в cause", async () => {
    const cause = new Error("boom");
    const error = await run(() => Promise.reject(cause), makeStore(), "offline").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe("offline");
    expect((error as ApiError).cause).toBe(cause);

    const upstream = await run(() => Promise.reject(cause), makeStore(), "upstream").catch((e: unknown) => e);
    expect((upstream as ApiError).kind).toBe("upstream");
  });
});

describe("readSnapshot", () => {
  it("отдаёт копию как Result без reason", async () => {
    expect(await readSnapshot(makeStore(snapshot), "k")).toEqual({
      data: "старое",
      meta: { source: "saved", fetchedAt: SAVED_AT },
    });
  });

  it("нет копии — null", async () => {
    expect(await readSnapshot(makeStore(), "k")).toBeNull();
  });
});
