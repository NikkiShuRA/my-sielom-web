/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it } from "vitest";
import * as api from "../src/index.ts";

describe("публичная точка входа", () => {
  it("экспортирует только предусмотренные значения", () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        "ApiError",
        "HttpError",
        "addDays",
        "createFakeApi",
        "isApiError",
        "isWeekStart",
        "isoDate",
        "lessonTiming",
        "parseIsoDate",
        "toMinutes",
        "weekStart",
      ].sort(),
    );
  });
});
