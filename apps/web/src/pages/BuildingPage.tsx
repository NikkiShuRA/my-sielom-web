/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useParams } from "react-router";
import { PlaceholderPage } from "../shared/ui/PlaceholderPage";

export function BuildingPage() {
  const { id = "" } = useParams();
  return <PlaceholderPage title={`Корпус ${id}`} />;
}
