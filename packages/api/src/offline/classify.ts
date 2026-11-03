/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { HttpError } from "../http.ts";

export type FailureReason = "offline" | "upstream";

export type ClassifyDeps = {
  isOnline: () => boolean;
  /** Запрос к нашему же сайту мимо кэша: true — сайт достижим */
  probe: () => Promise<boolean>;
};

/** Отличает «нет интернета» от «sielom.ru не отвечает» */
export const classifyError = async (error: unknown, { isOnline, probe }: ClassifyDeps): Promise<FailureReason> => {
  if (!isOnline()) return "offline";
  if (error instanceof HttpError || (error instanceof Error && error.name === "TimeoutError")) return "upstream";
  // Сетевая ошибка без статуса: либо интернета нет, либо API недоступен — проверяем свой сайт
  try {
    return (await probe()) ? "upstream" : "offline";
  } catch {
    return "offline";
  }
};
