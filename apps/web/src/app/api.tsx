/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { SielomApi } from "@sielom/api";
import { createContext, use, type ReactNode } from "react";

const ApiContext = createContext<SielomApi | null>(null);

// Реализацию подаёт точка входа, поэтому в тестах её легко заменить подделкой
export function ApiProvider({ api, children }: { api: SielomApi; children: ReactNode }) {
  return <ApiContext value={api}>{children}</ApiContext>;
}

// eslint-disable-next-line react-refresh/only-export-components -- хук живёт рядом с контекстом, который он читает
export function useApi(): SielomApi {
  const api = use(ApiContext);
  if (api === null) throw new Error("useApi вызван вне ApiProvider: оберните приложение в <ApiProvider api={...}>");
  return api;
}
