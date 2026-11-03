/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useParams } from "react-router";
import { PlaceholderPage } from "../shared/ui/PlaceholderPage";

export function TeacherPage() {
  // react-router уже декодирует параметр: «Иванов%20И.%20И.» приходит как «Иванов И. И.»
  const { name = "" } = useParams();
  return <PlaceholderPage title={name} />;
}
