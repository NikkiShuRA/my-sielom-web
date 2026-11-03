/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { Link } from "react-router";
import { PlaceholderPage } from "../shared/ui/PlaceholderPage";

export function NotFoundPage() {
  return (
    <PlaceholderPage title="Страница не найдена" note="Такого адреса нет.">
      <p>
        <Link to="/">На главную</Link>
      </p>
    </PlaceholderPage>
  );
}
