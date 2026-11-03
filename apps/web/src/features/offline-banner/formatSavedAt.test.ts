/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it } from "vitest";
import { formatSavedAt } from "./formatSavedAt";

// Даты строим в местном времени, чтобы тест не зависел от часового пояса машины
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const fmt = (saved: Date, now: Date) => formatSavedAt(saved.toISOString(), now);

describe("formatSavedAt", () => {
  const now = local(2026, 11, 4, 12, 0);

  it("сегодня", () => {
    expect(fmt(local(2026, 11, 4, 8, 12), now)).toBe("сегодня в 08:12");
  });

  it("вчера", () => {
    expect(fmt(local(2026, 11, 3, 18, 40), now)).toBe("вчера в 18:40");
  });

  it("раньше в этом году", () => {
    expect(fmt(local(2026, 11, 2, 18, 40), now)).toBe("2 ноября в 18:40");
    expect(fmt(local(2026, 1, 9, 7, 5), now)).toBe("9 января в 07:05");
  });

  it("в другом году добавляет год", () => {
    expect(fmt(local(2025, 11, 2, 18, 40), now)).toBe("2 ноября 2025 в 18:40");
  });

  it("через полночь: 23:59 и 00:01 — разные дни", () => {
    expect(fmt(local(2026, 11, 3, 23, 59), local(2026, 11, 4, 0, 1))).toBe("вчера в 23:59");
    expect(fmt(local(2026, 11, 4, 0, 1), local(2026, 11, 4, 0, 2))).toBe("сегодня в 00:01");
  });

  it("менее 24 часов назад, но вчера по календарю", () => {
    expect(fmt(local(2026, 11, 3, 20, 0), local(2026, 11, 4, 9, 0))).toBe("вчера в 20:00");
  });

  it("вчера через границу года остаётся «вчера»", () => {
    expect(fmt(local(2025, 12, 31, 22, 15), local(2026, 1, 1, 10, 0))).toBe("вчера в 22:15");
  });

  it("позавчера — уже дата", () => {
    expect(fmt(local(2026, 11, 2, 10, 0), now)).toBe("2 ноября в 10:00");
  });

  it("время из будущего не даёт «завтра»", () => {
    expect(fmt(local(2026, 11, 5, 9, 0), now)).toBe("сегодня в 09:00");
  });

  it("некорректная строка не ломает интерфейс", () => {
    expect(formatSavedAt("не дата", now)).toBe("ранее");
  });
});
