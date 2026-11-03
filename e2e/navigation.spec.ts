/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Сайт раздаётся как на GitHub Pages (e2e/site.ts): корень и next/ — отдельные сборки, неизвестный адрес — 404.html
import { expect, test, type Page } from "@playwright/test";

const ROOT = "/my-sielom-web/";
const heading = (page: Page) => page.getByRole("heading", { level: 1 });

test("главная открывается, у вкладки есть название", async ({ page }) => {
  await page.goto(ROOT);
  await expect(heading(page)).toHaveText("Расписание");
  await expect(page).toHaveTitle("Расписание — Мой Сиелом");
});

test("«Назад» и «Вперёд» браузера переключают экраны", async ({ page }) => {
  await page.goto(ROOT);
  await page.getByRole("link", { name: "Поиск" }).click();
  await expect(page).toHaveURL(`${ROOT}search`);
  await expect(heading(page)).toHaveText("Поиск");

  await page.goBack();
  await expect(page).toHaveURL(ROOT);
  await expect(heading(page)).toHaveText("Расписание");

  await page.goForward();
  await expect(page).toHaveURL(`${ROOT}search`);
  await expect(heading(page)).toHaveText("Поиск");
});

test("прямая ссылка открывает свой экран и сохраняет адрес", async ({ page }) => {
  await page.goto(`${ROOT}group/abc?week=2026-11-02#top`);
  await expect(heading(page)).toHaveText("Группа abc");
  await expect(page).toHaveURL(`${ROOT}group/abc?week=2026-11-02#top`);
});

test("перенаправление через 404.html не оставляет лишней записи в истории", async ({ page }) => {
  await page.goto(ROOT);
  await page.goto(`${ROOT}room/101`);
  await expect(heading(page)).toHaveText("Кабинет 101");
  await page.goBack();
  await expect(page).toHaveURL(ROOT);
});

test("прямая ссылка в предпросмотре next/ открывает сборку next/", async ({ page }) => {
  await page.goto(`${ROOT}next/teacher/${encodeURIComponent("Иванов И. И.")}`);
  await expect(heading(page)).toHaveText("Иванов И. И.");
  await expect(page).toHaveURL(new RegExp(`^[^?]*${ROOT}next/teacher/`));
  await expect(page.locator('script[type="module"]')).toHaveAttribute("src", /^\/my-sielom-web\/next\/assets\//);
});

test("неизвестный адрес внутри приложения показывает «Страница не найдена»", async ({ page }) => {
  await page.goto(`${ROOT}no/such/page`);
  await expect(heading(page)).toHaveText("Страница не найдена");
  await page.getByRole("link", { name: "На главную" }).click();
  await expect(heading(page)).toHaveText("Расписание");
});

test("подозрительный ?from= не уводит с сайта", async ({ page }) => {
  await page.goto(`${ROOT}?from=${encodeURIComponent("//evil.example/")}`);
  await expect(page).toHaveURL(ROOT);
  await expect(heading(page)).toHaveText("Расписание");
});

test("старые ключи профиля удаляются, новые остаются", async ({ page }) => {
  await page.goto(ROOT);
  await page.evaluate(() => {
    localStorage.setItem("sielom.profile.v1", "{}");
    // Настройки хранятся в JSON, как и всё в sielom2.*
    localStorage.setItem("sielom2.theme", JSON.stringify("dark"));
  });
  await page.reload();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toEqual(["sielom2.theme"]);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
