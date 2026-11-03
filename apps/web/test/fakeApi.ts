/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { Result, SielomApi } from "@sielom/api";

const result = <T>(data: T): Promise<Result<T>> =>
  Promise.resolve({ data, meta: { source: "network", fetchedAt: "2026-11-04T08:00:00.000Z" } });

/** Минимальная подделка API для тестов: пустые данные. Нужное поведение подменяйте через overrides. */
export function createFakeApi(overrides: Partial<SielomApi> = {}): SielomApi {
  const emptyWeek = { weekStart: "2026-11-02", published: false, days: [] };
  return {
    catalog: { divisions: () => result([]), groups: () => result([]), search: () => result([]) },
    schedule: {
      group: () => result(emptyWeek),
      teacher: () => result(emptyWeek),
      room: () => result(emptyWeek),
      building: () => result({ ...emptyWeek, divisionId: "d", rooms: [] }),
    },
    rooms: { free: () => result([]) },
    people: { photo: () => result(null) },
    offline: { status: () => Promise.resolve({ enabled: false, weeks: [] }), setEnabled: () => Promise.resolve() },
    stats: { subjects: () => result([]) },
    ...overrides,
  };
}
