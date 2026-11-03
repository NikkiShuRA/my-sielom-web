/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { ApiError } from "@sielom/api";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createFakeApi } from "../../test/fakeApi";
import { ApiProvider, useApi } from "./api";
import { placeholderApi } from "./placeholderApi";

describe("useApi", () => {
  it("отдаёт переданную реализацию", () => {
    const api = createFakeApi();
    const wrapper = ({ children }: { children: ReactNode }) => <ApiProvider api={api}>{children}</ApiProvider>;
    const { result } = renderHook(() => useApi(), { wrapper });
    expect(result.current).toBe(api);
  });

  it("бросает понятную ошибку вне провайдера", () => {
    // React логирует ошибку рендера в консоль: глушим, чтобы не шуметь в выводе
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useApi())).toThrow(/ApiProvider/);
    spy.mockRestore();
  });
});

describe("placeholderApi", () => {
  it("отклоняет запросы ошибкой upstream", async () => {
    const error: unknown = await placeholderApi.catalog.groups().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: "upstream", message: "Данные появятся на этапе 1" });
  });
});
