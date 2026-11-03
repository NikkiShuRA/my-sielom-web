/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it } from "vitest";
import { restoreRedirect } from "./restoreRedirect";

const BASE = "/my-sielom-web/next/";
const at = (search: string, hash = "") => ({ pathname: BASE, search, hash });

describe("restoreRedirect", () => {
  it("возвращает null без параметра from", () => {
    expect(restoreRedirect(at(""), BASE)).toBeNull();
    expect(restoreRedirect(at("?week=2026-11-02"), BASE)).toBeNull();
  });

  it("восстанавливает простой путь", () => {
    expect(restoreRedirect(at("?from=%2Fgroup%2Fabc"), BASE)).toBe("/my-sielom-web/next/group/abc");
  });

  it("сохраняет query и hash вложенного пути", () => {
    const from = encodeURIComponent("/teacher/Иванов И. И.?week=2026-11-02&view=day#lesson");
    expect(restoreRedirect(at(`?from=${from}`), BASE)).toBe(
      "/my-sielom-web/next/teacher/%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2%20%D0%98.%20%D0%98.?week=2026-11-02&view=day#lesson",
    );
  });

  it("работает с корневым base", () => {
    expect(restoreRedirect({ pathname: "/", search: "?from=%2Fsettings", hash: "" }, "/")).toBe("/settings");
  });

  it("сохраняет прочие параметры, не затирая параметры пути", () => {
    const from = encodeURIComponent("/search?q=abc");
    expect(restoreRedirect(at(`?utm=1&from=${from}&q=zzz`), BASE)).toBe("/my-sielom-web/next/search?q=abc&utm=1");
  });

  it("берёт hash адреса, если в from его нет", () => {
    expect(restoreRedirect(at("?from=%2Fsettings", "#top"), BASE)).toBe("/my-sielom-web/next/settings#top");
  });

  it.each([
    "//evil.com",
    "//evil.com/path",
    "https://evil.com/",
    "javascript:alert(1)",
    "group/abc",
    "",
    "/\\evil.com",
    "/a://b",
  ])("отбрасывает небезопасный from %j и убирает параметр", (from) => {
    expect(restoreRedirect(at(`?from=${encodeURIComponent(from)}&keep=1`, "#h"), BASE)).toBe(`${BASE}?keep=1#h`);
  });

  it("убирает единственный небезопасный параметр без хвоста ?", () => {
    expect(restoreRedirect(at("?from=%2F%2Fevil.com"), BASE)).toBe(BASE);
  });

  it("разрешает схему в query: это не часть пути", () => {
    const from = encodeURIComponent("/search?q=https://x.y");
    expect(restoreRedirect(at(`?from=${from}`), BASE)).toBe("/my-sielom-web/next/search?q=https://x.y");
  });
});
