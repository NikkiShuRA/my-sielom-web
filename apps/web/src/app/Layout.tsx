/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { NavLink, Outlet } from "react-router";
import styles from "./Layout.module.css";

// noUncheckedIndexedAccess делает styles.link необязательным, а NavLink ждёт строку
const linkClass = styles.link ?? "";

export function Layout() {
  return (
    <>
      <header className={styles.header}>
        <span className={styles.brand}>Мой Сиелом</span>
        <nav aria-label="Основная навигация" className={styles.nav}>
          <NavLink to="/" end className={linkClass}>
            Главная
          </NavLink>
          <NavLink to="/search" className={linkClass}>
            Поиск
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Настройки
          </NavLink>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
