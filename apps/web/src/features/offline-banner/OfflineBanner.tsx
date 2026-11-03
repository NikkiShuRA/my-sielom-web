/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { ResultMeta } from "@sielom/api";
import { useState } from "react";
import { formatSavedAt } from "./formatSavedAt";
import styles from "./OfflineBanner.module.css";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

type Props = {
  meta: ResultMeta;
  /** Идёт обновление с сети: вместо причины показываем «Обновляем…» */
  refreshing?: boolean;
  /** Текущее время; нужно только тестам, в приложении берётся время монтирования */
  now?: Date;
};

// Не закрывается: пока данные не свежие, об этом нельзя забыть
export function OfflineBanner({ meta, refreshing = false, now }: Props) {
  const [mountedAt] = useState(() => new Date());
  if (meta.source === "network") return null;

  const current = now ?? mountedAt;
  const when = formatSavedAt(meta.fetchedAt, current);
  const stale = current.getTime() - new Date(meta.fetchedAt).getTime() > STALE_AFTER_MS;

  let text: string;
  if (refreshing || meta.reason === undefined) text = `Обновляем… · Сохранено ${when}`;
  else if (meta.reason === "offline") text = `Нет интернета · Сохранено ${when}, могли быть замены`;
  else text = `sielom.ru не отвечает · Сохранено ${when}, могли быть замены`;

  return (
    <div role="status" className={styles.banner} data-variant={stale ? "stale" : undefined}>
      {text}
    </div>
  );
}
