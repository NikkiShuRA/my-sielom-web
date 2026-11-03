/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "../shared/styles/tokens.css";
import "../shared/styles/base.css";
import { ApiProvider } from "./api";
import { clearLegacyStorage } from "./legacyStorage";
import { placeholderApi } from "./placeholderApi";
import { restoreRedirect } from "./restoreRedirect";
import { routes } from "./routes";

const basename = import.meta.env.BASE_URL;

// Порядок важен: адрес чиним до создания роутера, иначе он успеет отрисовать NotFound
const restored = restoreRedirect(window.location, basename);
if (restored !== null) window.history.replaceState(null, "", restored);
clearLegacyStorage(window.localStorage);

// networkMode "always": без этого запросы встают на паузу офлайн и не доходят до сохранённых копий
const queryClient = new QueryClient({
  defaultOptions: { queries: { networkMode: "always", retry: 1 } },
});
const router = createBrowserRouter(routes, { basename });

const root = document.getElementById("root");
if (root === null) throw new Error("В index.html нет #root");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApiProvider api={placeholderApi}>
        <RouterProvider router={router} />
      </ApiProvider>
    </QueryClientProvider>
  </StrictMode>,
);
