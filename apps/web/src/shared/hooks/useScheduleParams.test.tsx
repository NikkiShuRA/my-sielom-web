/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { act, render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { useScheduleParams } from "./useScheduleParams";

type Params = ReturnType<typeof useScheduleParams>;

// Хук читает адрес из роутера, поэтому гоняем его внутри маршрута и забираем последнее значение
const setup = (search: string) => {
  const box: { current: Params | null } = { current: null };
  const Probe = () => {
    box.current = useScheduleParams();
    return null;
  };
  const router = createMemoryRouter([{ path: "*", Component: Probe }], {
    initialEntries: ["/prev", `/group/abc${search}`],
    initialIndex: 1,
  });
  render(<RouterProvider router={router} />);
  const params = (): Params => {
    if (box.current === null) throw new Error("хук не отрисован");
    return box.current;
  };
  return { router, params };
};

// 2026-11-02 — понедельник, 2026-11-03 — вторник
describe("useScheduleParams: чтение", () => {
  it("значения по умолчанию", () => {
    const { params } = setup("");
    expect(params()).toMatchObject({ week: null, view: "week", day: null, lesson: null });
  });

  it("читает корректные параметры", () => {
    const { params } = setup("?week=2026-11-02&view=day&day=2026-11-03&lesson=L1");
    expect(params()).toMatchObject({ week: "2026-11-02", view: "day", day: "2026-11-03", lesson: "L1" });
  });

  it.each(["2026-11-03", "2026-02-30", "2026-13-01", "02-11-2026", "2026-11-2", "abc", ""])(
    "week=%j не понедельник или не дата — считается отсутствующим",
    (week) => {
      expect(setup(`?week=${week}`).params().week).toBeNull();
    },
  );

  it("невалидные view и day игнорируются", () => {
    const { params } = setup("?view=month&day=2026-02-30");
    expect(params()).toMatchObject({ view: "week", day: null });
  });

  it("day может быть любым днём недели", () => {
    expect(setup("?day=2026-11-08").params().day).toBe("2026-11-08");
  });
});

describe("useScheduleParams: запись", () => {
  it("смена недели добавляет запись в историю", () => {
    const { router, params } = setup("?view=day");
    act(() => {
      params().setWeek("2026-11-09");
    });
    expect(router.state.historyAction).toBe("PUSH");
    expect(router.state.location.search).toBe("?view=day&week=2026-11-09");
    expect(params().week).toBe("2026-11-09");
  });

  it("открытие пары добавляет запись, закрытие заменяет", async () => {
    const { router, params } = setup("");
    act(() => {
      params().setLesson("L7");
    });
    expect(router.state.historyAction).toBe("PUSH");
    expect(params().lesson).toBe("L7");

    act(() => {
      params().setLesson(null);
    });
    expect(router.state.historyAction).toBe("REPLACE");
    expect(router.state.location.search).toBe("");

    // Запись с парой заменена, поэтому «назад» ведёт на страницу до неё
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/group/abc");
  });

  it("смена вида и дня заменяет запись", async () => {
    const { router, params } = setup("");
    act(() => {
      params().setView("day");
    });
    expect(router.state.historyAction).toBe("REPLACE");
    expect(router.state.location.search).toBe("?view=day");

    act(() => {
      params().setDay("2026-11-03");
    });
    expect(router.state.historyAction).toBe("REPLACE");
    expect(router.state.location.search).toBe("?view=day&day=2026-11-03");

    // История не засорена: «назад» сразу выходит с экрана расписания
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/prev");
  });

  it("возврат к виду «неделя» убирает параметр, null убирает день", () => {
    const { router, params } = setup("?view=day&day=2026-11-03");
    act(() => {
      params().setView("week");
    });
    act(() => {
      params().setDay(null);
    });
    expect(router.state.location.search).toBe("");
  });

  it("не трогает посторонние параметры", () => {
    const { router, params } = setup("?q=abc");
    act(() => {
      params().setWeek("2026-11-02");
    });
    expect(router.state.location.search).toBe("?q=abc&week=2026-11-02");
  });
});
