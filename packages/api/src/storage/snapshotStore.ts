/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { createStore, delMany, entries, get, set, type UseStore } from "idb-keyval";

export type SnapshotRecord<T = unknown> = { data: T; fetchedAt: string; savedAt: string; pinned: boolean };

export type SnapshotStore = {
  get<T>(key: string): Promise<SnapshotRecord<T> | null>;
  put<T>(key: string, data: T, info: { fetchedAt: string; pinned?: boolean }): Promise<void>;
  prune(): Promise<void>;
  clear(): Promise<void>;
};

export type SnapshotStoreOptions = { dbName: string; maxEntries?: number; now?: () => Date };

// Версия формата записей: при смене формата новый код не прочитает старые данные
const PREFIX = "v1:";

const isRecord = (v: unknown): v is SnapshotRecord =>
  typeof v === "object" &&
  v !== null &&
  "data" in v &&
  typeof (v as SnapshotRecord).fetchedAt === "string" &&
  typeof (v as SnapshotRecord).savedAt === "string";

const isOwnKey = (k: unknown): k is string => typeof k === "string" && k.startsWith(PREFIX);

/** Любая ошибка хранилища (нет IndexedDB, приватный режим, квота) гасится: копии на устройстве — бонус, не необходимость */
export const createSnapshotStore = ({
  dbName,
  maxEntries = 200,
  now = () => new Date(),
}: SnapshotStoreOptions): SnapshotStore => {
  // createStore открывает базу сразу и без IndexedDB бросает: создаём лениво, внутри try
  let store: UseStore | undefined;
  const db = () => (store ??= createStore(dbName, "snapshots"));

  return {
    async get<T>(key: string) {
      try {
        const record: unknown = await get(PREFIX + key, db());
        return isRecord(record) ? (record as SnapshotRecord<T>) : null;
      } catch {
        return null;
      }
    },

    async put(key, data, { fetchedAt, pinned = false }) {
      try {
        const record: SnapshotRecord = { data, fetchedAt, savedAt: now().toISOString(), pinned };
        await set(PREFIX + key, record, db());
      } catch {
        // не сохранилось — не страшно
      }
    },

    async prune() {
      try {
        const own = (await entries(db())).filter(
          (e): e is [string, SnapshotRecord] => isOwnKey(e[0]) && isRecord(e[1]),
        );
        const excess = own.length - maxEntries;
        if (excess <= 0) return;
        const victims = own
          .filter(([, r]) => !r.pinned)
          .sort(([, a], [, b]) => a.savedAt.localeCompare(b.savedAt))
          .slice(0, excess)
          .map(([k]) => k);
        if (victims.length) await delMany(victims, db());
      } catch {
        // см. выше
      }
    },

    async clear() {
      try {
        const keys = (await entries(db())).map(([k]) => k).filter(isOwnKey);
        await delMany(keys, db());
      } catch {
        // см. выше
      }
    },
  };
};
