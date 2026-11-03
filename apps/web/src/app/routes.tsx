/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { RouteObject } from "react-router";
import { BuildingPage } from "../pages/BuildingPage";
import { GroupPage } from "../pages/GroupPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RoomPage } from "../pages/RoomPage";
import { SearchPage } from "../pages/SearchPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TeacherPage } from "../pages/TeacherPage";
import { Layout } from "./Layout";

// Массив, а не готовый роутер: тесты собирают его через createMemoryRouter
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "group/:id", element: <GroupPage /> },
      { path: "teacher/:name", element: <TeacherPage /> },
      { path: "room/:id", element: <RoomPage /> },
      { path: "building/:id", element: <BuildingPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
