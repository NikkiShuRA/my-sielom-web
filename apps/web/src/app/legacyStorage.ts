/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
const LEGACY_PREFIX = "sielom.";

/** Удаляет ключи старой версии сайта. Префикс с точкой, поэтому `sielom2.*` не затрагивается. Старые данные не читаем. */
export function clearLegacyStorage(storage: Storage): void {
  try {
    // Сначала собираем ключи: удаление во время обхода сдвигает индексы
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(LEGACY_PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // Хранилище может быть недоступно (приватный режим, запрет cookies): это не повод падать на старте
  }
}
