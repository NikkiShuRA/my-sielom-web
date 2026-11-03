/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { ReactNode } from "react";
import styles from "./PlaceholderPage.module.css";

type Props = {
  /** Заголовок страницы; он же попадает в document.title */
  title: string;
  /** Текст под заголовком; по умолчанию — заглушка этапа 0 */
  note?: string;
  children?: ReactNode;
};

// Заглушка до появления настоящих страниц: заголовок, заметка и название вкладки в одном месте
export function PlaceholderPage({ title, note = "Расписание появится на следующем этапе", children }: Props) {
  return (
    <section className={styles.page}>
      <title>{`${title} — Мой Сиелом`}</title>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.note}>{note}</p>
      {children}
    </section>
  );
}
