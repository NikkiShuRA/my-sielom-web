/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number): string => String(n).padStart(2, "0");

// Полночь по местному времени: «вчера» считаем по календарю, а не по 24 часам
const dayNumber = (d: Date): number =>
  Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY_MS);

/** «сегодня в 08:12», «вчера в 18:40», «2 ноября в 18:40», «2 ноября 2025 в 18:40» (местное время) */
export function formatSavedAt(iso: string, now: Date): string {
  const saved = new Date(iso);
  if (Number.isNaN(saved.getTime())) return "ранее";

  const time = `${pad(saved.getHours())}:${pad(saved.getMinutes())}`;
  const daysAgo = dayNumber(now) - dayNumber(saved);

  // Отрицательное значение — часы устройства ушли назад; не придумываем «завтра»
  if (daysAgo <= 0) return `сегодня в ${time}`;
  if (daysAgo === 1) return `вчера в ${time}`;

  const date = `${saved.getDate()} ${MONTHS[saved.getMonth()] ?? ""}`;
  const year = saved.getFullYear() === now.getFullYear() ? "" : ` ${saved.getFullYear()}`;
  return `${date}${year} в ${time}`;
}
