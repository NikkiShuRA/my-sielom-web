/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { routes } from "./routes";

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

const heading = () => screen.getByRole("heading", { level: 1 });

describe("routes", () => {
  it("главная", () => {
    renderAt("/");
    expect(heading()).toHaveTextContent("Расписание");
    expect(screen.getByText("Расписание появится на следующем этапе")).toBeInTheDocument();
  });

  it("группа показывает id", () => {
    renderAt("/group/abc");
    expect(heading()).toHaveTextContent("Группа abc");
  });

  it("преподаватель показывает декодированное имя", () => {
    renderAt("/teacher/Иванов%20И.%20И.");
    expect(heading()).toHaveTextContent("Иванов И. И.");
  });

  it("кабинет, корпус, настройки", () => {
    renderAt("/room/101");
    expect(heading()).toHaveTextContent("Кабинет 101");
  });

  it("корпус", () => {
    renderAt("/building/b1");
    expect(heading()).toHaveTextContent("Корпус b1");
  });

  it("поиск читает ?q=", () => {
    renderAt("/search?q=матем");
    expect(heading()).toHaveTextContent("Поиск: матем");
  });

  it("настройки", () => {
    renderAt("/settings");
    expect(heading()).toHaveTextContent("Настройки");
  });

  it("неизвестный путь — NotFound со ссылкой на главную", () => {
    renderAt("/no/such/page");
    expect(heading()).toHaveTextContent("Страница не найдена");
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
  });

  it("шапка: ориентиры и ссылки", () => {
    renderAt("/");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Основная навигация" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Поиск" })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("href", "/settings");
  });

  it("название вкладки задаётся страницей", async () => {
    renderAt("/group/abc");
    await waitFor(() => {
      expect(document.title).toBe("Группа abc — Мой Сиелом");
    });
  });

  it("переход по ссылке и navigate(-1) возвращают на прошлую страницу", async () => {
    const user = userEvent.setup();
    const router = renderAt("/");

    await user.click(screen.getByRole("link", { name: "Настройки" }));
    expect(router.state.location.pathname).toBe("/settings");
    expect(heading()).toHaveTextContent("Настройки");

    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/");
    expect(heading()).toHaveTextContent("Расписание");
  });
});
