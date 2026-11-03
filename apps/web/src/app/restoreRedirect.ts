/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// 404.html на GitHub Pages присылает пользователя на корень канала с ?from=<исходный путь>.
// Здесь решаем, куда сделать replaceState, чтобы роутер увидел настоящий адрес.

type LocationParts = { pathname: string; search: string; hash: string };

const FROM_PARAM = "from";
const PROBE_ORIGIN = "http://probe.invalid";

// Принимаем только внутренний путь: иначе ?from=//evil.com превратился бы в открытый редирект
const isSafeFrom = (from: string): boolean => {
  if (!from.startsWith("/") || from.startsWith("//")) return false;
  // eslint-disable-next-line no-control-regex -- управляющие символы в пути как раз и отбраковываем
  if (from.includes("\\") || /[\u0000-\u001f]/.test(from)) return false;
  const pathPart = from.split(/[?#]/, 1)[0] ?? "";
  if (pathPart.includes("://")) return false;
  return new URL(from, PROBE_ORIGIN).origin === PROBE_ORIGIN;
};

/** URL для history.replaceState или null, если менять адрес не нужно. `base` — как BASE_URL, например `/my-sielom-web/next/`. */
export function restoreRedirect(location: LocationParts, base: string): string | null {
  const params = new URLSearchParams(location.search);
  const from = params.get(FROM_PARAM);
  if (from === null) return null;
  params.delete(FROM_PARAM);

  if (!isSafeFrom(from)) {
    // Подозрительный параметр просто убираем, остальное оставляем как есть
    const rest = params.toString();
    return `${location.pathname}${rest ? `?${rest}` : ""}${location.hash}`;
  }

  const target = new URL(from, PROBE_ORIGIN);
  // Прочие параметры не теряем, но параметры самого пути в приоритете
  for (const [key, value] of params) {
    if (!target.searchParams.has(key)) target.searchParams.append(key, value);
  }
  const hash = target.hash || location.hash;
  return `${base.replace(/\/$/, "")}${target.pathname}${target.search}${hash}`;
}
