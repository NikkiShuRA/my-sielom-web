/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Даты считаем в локальном времени: расписание привязано к дню на часах пользователя,
// а перевод через UTC сдвигает день около полуночи
import type { ClockTime, IsoDate } from "./contract/index.ts";

const pad = (n: number) => String(n).padStart(2, "0");

export const isoDate = (d: Date): IsoDate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Локальная полночь; хвост со временем (`2026-03-02T00:00`) отбрасывается, как в старом коде */
export const parseIsoDate = (s: IsoDate): Date => {
  const [y = 0, m = 1, d = 1] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (date: IsoDate, n: number): IsoDate => {
  const d = parseIsoDate(date);
  // setDate, а не +n*86400000: в дни перевода часов сутки бывают не по 24 часа
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

/** Понедельник недели, в которую попадает дата */
export const weekStart = (date: IsoDate | Date): IsoDate => {
  const d =
    typeof date === "string" ? parseIsoDate(date) : new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDate(d);
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Корректная дата вида `YYYY-MM-DD`, и это понедельник; 2026-02-30 не проходит */
export const isWeekStart = (s: string): boolean => {
  if (!ISO_DATE.test(s)) return false;
  const d = parseIsoDate(s);
  return isoDate(d) === s && d.getDay() === 1;
};

export const toMinutes = (t: ClockTime): number => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};
