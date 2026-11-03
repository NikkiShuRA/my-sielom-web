/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../src/http.ts";
import { classifyError } from "../src/offline/classify.ts";

const timeout = () => new DOMException("timed out", "TimeoutError");

describe("classifyError", () => {
  it("браузер сообщает об отсутствии сети — offline без проб", async () => {
    const probe = vi.fn(() => Promise.resolve(true));
    expect(await classifyError(new HttpError(500), { isOnline: () => false, probe })).toBe("offline");
    expect(probe).not.toHaveBeenCalled();
  });

  it("HTTP-ошибка — upstream без проб", async () => {
    const probe = vi.fn(() => Promise.resolve(false));
    expect(await classifyError(new HttpError(502), { isOnline: () => true, probe })).toBe("upstream");
    expect(probe).not.toHaveBeenCalled();
  });

  it("таймаут — upstream без проб", async () => {
    const probe = vi.fn(() => Promise.resolve(false));
    expect(await classifyError(timeout(), { isOnline: () => true, probe })).toBe("upstream");
    expect(probe).not.toHaveBeenCalled();
  });

  it("сетевая ошибка и свой сайт достижим — upstream", async () => {
    const probe = vi.fn(() => Promise.resolve(true));
    expect(await classifyError(new TypeError("Failed to fetch"), { isOnline: () => true, probe })).toBe("upstream");
    expect(probe).toHaveBeenCalledOnce();
  });

  it("сетевая ошибка и свой сайт недостижим — offline", async () => {
    expect(
      await classifyError(new TypeError("Failed to fetch"), {
        isOnline: () => true,
        probe: () => Promise.resolve(false),
      }),
    ).toBe("offline");
  });

  it("проба бросает — offline", async () => {
    const probe = (): Promise<boolean> => Promise.reject(new TypeError("Failed to fetch"));
    expect(await classifyError("что-то", { isOnline: () => true, probe })).toBe("offline");
  });
});
