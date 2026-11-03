/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { Lesson } from "./contract/index.ts";
import { isoDate, toMinutes } from "./dates.ts";

export type LessonTiming =
  { kind: "past" } | { kind: "soon"; minutesLeft: number } | { kind: "now"; minutesLeft: number; progress: number };

/** Где пара относительно `now`; null — пара в будущем дне, показывать нечего */
export const lessonTiming = (lesson: Pick<Lesson, "date" | "start" | "end">, now: Date): LessonTiming | null => {
  const today = isoDate(now);
  if (lesson.date < today) return { kind: "past" }; // пары прошедших дней — прошедшие
  if (lesson.date > today) return null;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(lesson.start);
  const end = toMinutes(lesson.end);
  if (current < start) return { kind: "soon", minutesLeft: start - current };
  if (current <= end) {
    return { kind: "now", minutesLeft: end - current, progress: Math.round(((current - start) / (end - start)) * 100) };
  }
  return { kind: "past" };
};
