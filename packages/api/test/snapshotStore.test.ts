/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import "fake-indexeddb/auto";
import { createStore, entries, set } from "idb-keyval";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSnapshotStore } from "../src/storage/index.ts";

let counter = 0;
const freshDb = () => `test-db-${++counter}`;

/** Часы, тикающие на секунду при каждом вызове: savedAt получается строго возрастающим */
const ticking = () => {
  let t = Date.UTC(2026, 0, 1);
  return () => new Date((t += 1000));
};

const fetchedAt = "2026-01-01T00:00:00.000Z";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createSnapshotStore", () => {
  it("кладёт и читает запись со всеми полями", async () => {
    const store = createSnapshotStore({ dbName: freshDb(), now: ticking() });
    await store.put("a", { x: 1 }, { fetchedAt });
    expect(await store.get("a")).toEqual({
      data: { x: 1 },
      fetchedAt,
      savedAt: "2026-01-01T00:00:01.000Z",
      pinned: false,
    });
  });

  it("отсутствующий ключ — null", async () => {
    const store = createSnapshotStore({ dbName: freshDb() });
    expect(await store.get("nope")).toBeNull();
  });

  it("ключи получают префикс версии формата и чужие версии не читаются", async () => {
    const dbName = freshDb();
    const store = createSnapshotStore({ dbName });
    await store.put("a", 1, { fetchedAt });
    const raw = createStore(dbName, "snapshots");
    expect((await entries(raw)).map(([k]) => k)).toEqual(["v1:a"]);

    await set("v0:b", { data: 2, fetchedAt, savedAt: fetchedAt, pinned: false }, raw);
    expect(await store.get("b")).toBeNull();
  });

  it("повреждённая запись читается как null", async () => {
    const dbName = freshDb();
    const store = createSnapshotStore({ dbName });
    await set("v1:bad", "мусор", createStore(dbName, "snapshots"));
    expect(await store.get("bad")).toBeNull();
  });

  it("prune удаляет самые старые непривязанные записи сверх лимита", async () => {
    const store = createSnapshotStore({ dbName: freshDb(), maxEntries: 2, now: ticking() });
    await store.put("old", 1, { fetchedAt });
    await store.put("mid", 2, { fetchedAt });
    await store.put("new", 3, { fetchedAt });
    await store.prune();
    expect(await store.get("old")).toBeNull();
    expect(await store.get("mid")).not.toBeNull();
    expect(await store.get("new")).not.toBeNull();
  });

  it("prune не трогает pinned, даже когда они самые старые", async () => {
    const store = createSnapshotStore({ dbName: freshDb(), maxEntries: 2, now: ticking() });
    await store.put("pinned", 1, { fetchedAt, pinned: true });
    await store.put("a", 2, { fetchedAt });
    await store.put("b", 3, { fetchedAt });
    await store.put("c", 4, { fetchedAt });
    await store.prune();
    expect(await store.get("pinned")).not.toBeNull();
    expect(await store.get("a")).toBeNull();
    expect(await store.get("b")).toBeNull();
    expect(await store.get("c")).not.toBeNull();
  });

  it("prune без превышения лимита ничего не делает", async () => {
    const store = createSnapshotStore({ dbName: freshDb(), maxEntries: 5 });
    await store.put("a", 1, { fetchedAt });
    await store.prune();
    expect(await store.get("a")).not.toBeNull();
  });

  it("clear удаляет записи", async () => {
    const store = createSnapshotStore({ dbName: freshDb() });
    await store.put("a", 1, { fetchedAt });
    await store.put("b", 2, { fetchedAt, pinned: true });
    await store.clear();
    expect(await store.get("a")).toBeNull();
    expect(await store.get("b")).toBeNull();
  });
});

describe("деградация при сбоях хранилища", () => {
  it("без IndexedDB все методы молча отрабатывают", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const store = createSnapshotStore({ dbName: freshDb() });
    await expect(store.put("a", 1, { fetchedAt })).resolves.toBeUndefined();
    await expect(store.get("a")).resolves.toBeNull();
    await expect(store.prune()).resolves.toBeUndefined();
    await expect(store.clear()).resolves.toBeUndefined();
  });

  it("если IndexedDB бросает при открытии, ошибка не выходит наружу", async () => {
    vi.stubGlobal("indexedDB", {
      open: () => {
        throw new DOMException("denied", "SecurityError");
      },
    });
    const store = createSnapshotStore({ dbName: freshDb() });
    await expect(store.put("a", 1, { fetchedAt })).resolves.toBeUndefined();
    await expect(store.get("a")).resolves.toBeNull();
  });
});
