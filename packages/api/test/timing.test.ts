/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it } from "vitest";
import { lessonTiming } from "../src/timing.ts";

const lesson = { date: "2026-03-02", start: "09:00", end: "10:30" };
const at = (h: number, m: number, day = 2) => new Date(2026, 2, day, h, m);

describe("lessonTiming", () => {
  it("прошедший день — past", () => {
    expect(lessonTiming(lesson, at(8, 0, 3))).toEqual({ kind: "past" });
  });

  it("будущий день — null", () => {
    expect(lessonTiming(lesson, at(12, 0, 1))).toBeNull();
  });

  it("до начала — soon с остатком минут", () => {
    expect(lessonTiming(lesson, at(8, 15))).toEqual({ kind: "soon", minutesLeft: 45 });
  });

  it("ровно в начало — now, прогресс 0", () => {
    expect(lessonTiming(lesson, at(9, 0))).toEqual({ kind: "now", minutesLeft: 90, progress: 0 });
  });

  it("середина пары, прогресс округляется", () => {
    expect(lessonTiming(lesson, at(9, 45))).toEqual({ kind: "now", minutesLeft: 45, progress: 50 });
    expect(lessonTiming(lesson, at(9, 20))).toEqual({ kind: "now", minutesLeft: 70, progress: 22 });
  });

  it("ровно в конец — ещё now, прогресс 100", () => {
    expect(lessonTiming(lesson, at(10, 30))).toEqual({ kind: "now", minutesLeft: 0, progress: 100 });
  });

  it("после конца — past", () => {
    expect(lessonTiming(lesson, at(10, 31))).toEqual({ kind: "past" });
  });
});
