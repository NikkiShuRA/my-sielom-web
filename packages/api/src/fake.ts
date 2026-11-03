/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import {
  ApiError,
  type ApiErrorKind,
  type BuildingWeek,
  type Division,
  type Group,
  type IsoDate,
  type OfflineStatus,
  type Result,
  type ResultMeta,
  type SearchHit,
  type SielomApi,
  type WeekSchedule,
} from "./contract/index.ts";
import { addDays } from "./dates.ts";

export type FakeApiOptions = {
  divisions?: Division[];
  groups?: Group[];
  /** Ключи: `group:<id>:<weekStart>`, `teacher:<name>:<weekStart>`, `room:<id>:<weekStart>` */
  weeks?: Record<string, WeekSchedule>;
  meta?: Partial<ResultMeta>;
  /** Все запросы данных падают с этой ошибкой */
  fail?: ApiErrorKind;
  delayMs?: number;
};

const emptyWeek = (weekStart: IsoDate): WeekSchedule => ({
  weekStart,
  published: true,
  days: Array.from({ length: 6 }, (_, i) => ({ date: addDays(weekStart, i), lessons: [], breaks: [] })),
});

/** API в памяти для тестов интерфейса и демо-стенда: без сети, детерминированный */
export const createFakeApi = ({
  divisions = [],
  groups = [],
  weeks = {},
  meta = {},
  fail,
  delayMs = 0,
}: FakeApiOptions = {}): SielomApi => {
  const resultMeta: ResultMeta = { source: "network", fetchedAt: "2026-01-01T00:00:00.000Z", ...meta };
  let offlineEnabled = false;

  const respond = async <T>(make: () => T): Promise<Result<T>> => {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (fail) throw new ApiError(fail, `Заглушка: ${fail}`);
    return { data: make(), meta: { ...resultMeta } };
  };

  const week = (kind: string, id: string, start: IsoDate) =>
    respond(() => weeks[`${kind}:${id}:${start}`] ?? emptyWeek(start));

  return {
    catalog: {
      divisions: () => respond(() => divisions),
      groups: () => respond(() => groups),
      search: (query) =>
        respond(() => {
          const q = query.trim().toLowerCase();
          return groups
            .filter((g) => g.name.toLowerCase().includes(q))
            .map((g): SearchHit => ({ kind: "group", id: g.id, title: g.name }));
        }),
    },
    schedule: {
      group: (id, start) => week("group", id, start),
      teacher: (name, start) => week("teacher", name, start),
      room: (id, start) => week("room", id, start),
      building: (divisionId, start) => respond((): BuildingWeek => ({ ...emptyWeek(start), divisionId, rooms: [] })),
    },
    rooms: { free: () => respond(() => []) },
    people: { photo: () => respond(() => null) },
    offline: {
      status: (): Promise<OfflineStatus> => Promise.resolve({ enabled: offlineEnabled, weeks: [] }),
      setEnabled: (on) => {
        offlineEnabled = on;
        return Promise.resolve();
      },
    },
    stats: { subjects: () => respond(() => []) },
  };
};
