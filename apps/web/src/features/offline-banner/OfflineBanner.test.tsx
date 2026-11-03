/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { ResultMeta } from "@sielom/api";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { HomePage } from "../../pages/HomePage";
import { OfflineBanner } from "./OfflineBanner";

const now = new Date(2026, 10, 4, 12, 0);
const fetchedAt = new Date(2026, 10, 4, 8, 12).toISOString();

const saved = (extra: Partial<ResultMeta> = {}): ResultMeta => ({ source: "saved", fetchedAt, ...extra });

describe("OfflineBanner", () => {
  it("ничего не рисует для свежих данных", () => {
    const { container } = render(<OfflineBanner meta={{ source: "network", fetchedAt }} now={now} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offline", () => {
    render(<OfflineBanner meta={saved({ reason: "offline" })} now={now} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Нет интернета · Сохранено сегодня в 08:12, могли быть замены",
    );
  });

  it("upstream", () => {
    render(<OfflineBanner meta={saved({ reason: "upstream" })} now={now} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "sielom.ru не отвечает · Сохранено сегодня в 08:12, могли быть замены",
    );
  });

  it("refreshing перекрывает причину", () => {
    render(<OfflineBanner meta={saved({ reason: "offline" })} refreshing now={now} />);
    expect(screen.getByRole("status")).toHaveTextContent(/^Обновляем… · Сохранено сегодня в 08:12$/);
  });

  it("без причины — «Обновляем…»", () => {
    render(<OfflineBanner meta={saved()} now={now} />);
    expect(screen.getByRole("status")).toHaveTextContent(/^Обновляем… · Сохранено сегодня в 08:12$/);
  });

  it("свежая копия не помечается как устаревшая", () => {
    render(<OfflineBanner meta={saved({ reason: "offline" })} now={now} />);
    expect(screen.getByRole("status")).not.toHaveAttribute("data-variant");
  });

  it("копия старше суток получает data-variant=stale", () => {
    const old = new Date(2026, 10, 3, 11, 0).toISOString();
    render(<OfflineBanner meta={saved({ reason: "upstream", fetchedAt: old })} now={now} />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("data-variant", "stale");
    expect(banner).toHaveTextContent("вчера в 11:00");
  });

  it("не закрывается: кнопок нет", () => {
    render(<OfflineBanner meta={saved({ reason: "offline" })} now={now} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("встаёт над страницей Home (только в тесте)", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <>
              <OfflineBanner meta={saved({ reason: "offline" })} now={now} />
              <HomePage />
            </>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
