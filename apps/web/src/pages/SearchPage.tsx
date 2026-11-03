/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useSearchParams } from "react-router";
import { PlaceholderPage } from "../shared/ui/PlaceholderPage";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  return <PlaceholderPage title={q ? `Поиск: ${q}` : "Поиск"} />;
}
