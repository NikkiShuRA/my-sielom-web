/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useSearchParams } from "react-router";

export type ScheduleView = "week" | "day";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Своя проверка вместо Date.parse: «2026-02-30» не должна превращаться в 2 марта
const toUtcDate = (value: string): Date | null => {
  const m = ISO_DATE.exec(value);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const same = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return same ? date : null;
};

const isIsoDate = (value: string): boolean => toUtcDate(value) !== null;
const isMonday = (value: string): boolean => toUtcDate(value)?.getUTCDay() === 1;

type Patch = { week?: string | null; view?: ScheduleView | null; day?: string | null; lesson?: string | null };

/**
 * Состояние расписания в адресной строке: ссылкой можно поделиться, а кнопка «назад» работает.
 * Смена недели и открытие пары добавляют запись в историю, переключение вида и дня её заменяют,
 * чтобы «назад» не приходилось жать десять раз.
 */
export function useScheduleParams() {
  const [params, setParams] = useSearchParams();

  const rawWeek = params.get("week");
  const rawView = params.get("view");
  const rawDay = params.get("day");
  const rawLesson = params.get("lesson");

  const week = rawWeek !== null && isMonday(rawWeek) ? rawWeek : null;
  const view: ScheduleView = rawView === "day" ? "day" : "week";
  const day = rawDay !== null && isIsoDate(rawDay) ? rawDay : null;
  const lesson = rawLesson ? rawLesson : null;

  // Остальные параметры (например q) не трогаем; null удаляет параметр
  const update = (patch: Patch, replace: boolean) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === undefined) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace },
    );
  };

  return {
    week,
    view,
    day,
    lesson,
    setWeek: (value: string | null) => {
      update({ week: value }, false);
    },
    setView: (value: ScheduleView) => {
      update({ view: value === "week" ? null : value }, true);
    },
    setDay: (value: string | null) => {
      update({ day: value }, true);
    },
    // Закрытие заменяет запись с открытой парой, поэтому «назад» не возвращает на неё
    setLesson: (value: string | null) => {
      update({ lesson: value }, value === null);
    },
  };
}
