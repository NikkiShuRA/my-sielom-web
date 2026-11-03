/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it } from "vitest";
import { addDays, isoDate, isWeekStart, parseIsoDate, toMinutes, weekStart } from "../src/dates.ts";

describe("isoDate / parseIsoDate", () => {
  it("форматирует локальную дату с нулями", () => {
    expect(isoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("разбирает дату в локальную полночь и игнорирует хвост времени", () => {
    const d = parseIsoDate("2026-03-02T10:30:00");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 2, 0]);
  });

  it("round-trip не сдвигает день", () => {
    expect(isoDate(parseIsoDate("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("addDays", () => {
  it("переходит через границу месяца и года", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("учитывает високосный год", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("не ломается на сутках перевода часов", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });
});

describe("weekStart", () => {
  it("понедельник остаётся собой", () => {
    expect(weekStart("2026-03-02")).toBe("2026-03-02");
  });

  it("воскресенье относится к неделе, которая началась в прошлый понедельник", () => {
    expect(weekStart("2026-03-08")).toBe("2026-03-02");
  });

  it("находит понедельник в прошлом месяце", () => {
    expect(weekStart("2026-04-01")).toBe("2026-03-30");
  });

  it("находит понедельник в прошлом году", () => {
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });

  it("принимает Date и отбрасывает время", () => {
    expect(weekStart(new Date(2026, 2, 8, 23, 59))).toBe("2026-03-02");
  });
});

describe("isWeekStart", () => {
  it("понедельник — да", () => {
    expect(isWeekStart("2026-03-02")).toBe(true);
  });

  it("другие дни, несуществующие даты и мусор — нет", () => {
    expect(isWeekStart("2026-03-03")).toBe(false);
    expect(isWeekStart("2026-03-08")).toBe(false);
    expect(isWeekStart("2026-02-30")).toBe(false);
    expect(isWeekStart("2026-3-2")).toBe(false);
    expect(isWeekStart("2026-03-02T00:00")).toBe(false);
    expect(isWeekStart("")).toBe(false);
  });
});

describe("toMinutes", () => {
  it("переводит HH:MM в минуты", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("08:30")).toBe(510);
    expect(toMinutes("23:59")).toBe(1439);
  });
});
