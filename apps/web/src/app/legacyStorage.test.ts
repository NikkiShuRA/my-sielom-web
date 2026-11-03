/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it, vi } from "vitest";
import { clearLegacyStorage } from "./legacyStorage";

describe("clearLegacyStorage", () => {
  it("удаляет ключи sielom.* и не трогает sielom2.* и чужие", () => {
    localStorage.clear();
    localStorage.setItem("sielom.theme", '"dark"');
    localStorage.setItem("sielom.favorites", "[]");
    localStorage.setItem("sielom.", "x");
    localStorage.setItem("sielom2.theme", '"light"');
    localStorage.setItem("sielom2.profile", "{}");
    localStorage.setItem("sielomX", "1");
    localStorage.setItem("other", "1");

    clearLegacyStorage(localStorage);

    expect(Object.keys(localStorage).sort()).toEqual(["other", "sielom2.profile", "sielom2.theme", "sielomX"]);
  });

  it("не падает, если хранилище бросает исключения", () => {
    const broken = {
      get length(): number {
        throw new Error("denied");
      },
      key: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;
    expect(() => clearLegacyStorage(broken)).not.toThrow();
  });
});
