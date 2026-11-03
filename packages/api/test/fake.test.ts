/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createFakeApi, type Group, type WeekSchedule } from "../src/index.ts";

const groups: Group[] = [
  { id: "g1", name: "ИС-21", course: 2, divisionId: "d1" },
  { id: "g2", name: "Мед-11", course: 1, divisionId: "d1" },
];

afterEach(() => {
  vi.useRealTimers();
});

describe("createFakeApi", () => {
  it("отдаёт каталог с мета по умолчанию", async () => {
    const api = createFakeApi({ groups, divisions: [{ id: "d1", name: "Корпус 1" }] });
    expect(await api.catalog.groups()).toEqual({
      data: groups,
      meta: { source: "network", fetchedAt: "2026-01-01T00:00:00.000Z" },
    });
    expect((await api.catalog.divisions()).data).toHaveLength(1);
  });

  it("применяет переопределённое мета", async () => {
    const api = createFakeApi({ meta: { source: "saved", reason: "offline" } });
    expect((await api.catalog.groups()).meta).toEqual({
      source: "saved",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      reason: "offline",
    });
  });

  it("поиск — по подстроке группы без учёта регистра", async () => {
    const api = createFakeApi({ groups });
    expect((await api.catalog.search("ис")).data).toEqual([{ kind: "group", id: "g1", title: "ИС-21" }]);
    expect((await api.catalog.search("zzz")).data).toEqual([]);
  });

  it("неделя из опций возвращается по ключу", async () => {
    const week: WeekSchedule = { weekStart: "2026-03-02", published: false, days: [] };
    const api = createFakeApi({ weeks: { "group:g1:2026-03-02": week } });
    expect((await api.schedule.group("g1", "2026-03-02")).data).toBe(week);
  });

  it("отсутствующая неделя — опубликованная, 6 дней Пн–Сб без пар", async () => {
    const api = createFakeApi();
    const { data } = await api.schedule.teacher("Иванов И.И.", "2026-03-02");
    expect(data.published).toBe(true);
    expect(data.weekStart).toBe("2026-03-02");
    expect(data.days.map((d) => d.date)).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
    ]);
    expect(data.days.every((d) => d.lessons.length === 0)).toBe(true);
  });

  it("корпус, свободные аудитории, фото, статистика — пустые значения", async () => {
    const api = createFakeApi();
    expect((await api.schedule.building("d1", "2026-03-02")).data).toMatchObject({ divisionId: "d1", rooms: [] });
    expect((await api.rooms.free("d1", "2026-03-02", 1)).data).toEqual([]);
    expect((await api.people.photo("Иванов")).data).toBeNull();
    expect((await api.stats.subjects({ kind: "group", id: "g1" }, "2026-03-02")).data).toEqual([]);
  });

  it("fail: запросы данных падают с ApiError нужного вида", async () => {
    const api = createFakeApi({ fail: "upstream" });
    const error = await api.catalog.groups().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe("upstream");
  });

  it("офлайн-режим переключается в памяти", async () => {
    const api = createFakeApi();
    expect(await api.offline.status()).toEqual({ enabled: false, weeks: [] });
    await api.offline.setEnabled(true);
    expect((await api.offline.status()).enabled).toBe(true);
  });

  it("delayMs откладывает ответ", async () => {
    vi.useFakeTimers();
    const api = createFakeApi({ delayMs: 500 });
    let done = false;
    const pending = api.catalog.groups().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
  });
});
