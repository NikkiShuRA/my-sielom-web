/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { ApiError, type Result } from "../contract/index.ts";
import type { SnapshotStore } from "../storage/snapshotStore.ts";
import type { FailureReason } from "./classify.ts";

export type WithSnapshotOptions<T> = {
  key: string;
  request: () => Promise<T>;
  store: Pick<SnapshotStore, "get" | "put">;
  classify: (error: unknown) => Promise<FailureReason>;
  now: () => Date;
  pinned?: boolean;
};

/** Сохранённая копия как готовый ответ; null, если её нет */
export const readSnapshot = async <T>(store: Pick<SnapshotStore, "get">, key: string): Promise<Result<T> | null> => {
  const snapshot = await store.get<T>(key);
  return snapshot ? { data: snapshot.data, meta: { source: "saved", fetchedAt: snapshot.fetchedAt } } : null;
};

/** Сеть в приоритете; при сбое показываем сохранённую копию, а ошибка бросается, только когда показать нечего */
export const withSnapshot = async <T>({
  key,
  request,
  store,
  classify,
  now,
  pinned,
}: WithSnapshotOptions<T>): Promise<Result<T>> => {
  let data: T;
  try {
    data = await request();
  } catch (error) {
    if (error instanceof ApiError && error.kind === "not_found") throw error;
    const invalid = error instanceof ApiError && error.kind === "invalid_response";
    const reason = invalid ? "upstream" : await classify(error);
    const snapshot = await store.get<T>(key);
    if (snapshot) return { data: snapshot.data, meta: { source: "saved", fetchedAt: snapshot.fetchedAt, reason } };
    if (invalid) throw error;
    throw new ApiError(reason, reason === "offline" ? "Нет подключения к интернету" : "Сервер расписания не отвечает", {
      cause: error,
    });
  }
  const fetchedAt = now().toISOString();
  // Запись не ждём, и её сбой в ответ не пускаем
  store.put(key, data, { fetchedAt, ...(pinned === undefined ? {} : { pinned }) }).catch(() => {});
  return { data, meta: { source: "network", fetchedAt } };
};
