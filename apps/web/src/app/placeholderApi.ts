/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { ApiError, type SielomApi } from "@sielom/api";

// Заглушка этапа 0: настоящая реализация появится на этапе 1, тогда этот файл удаляется,
// а main.tsx получает API из пакета
const notReady = (): Promise<never> => Promise.reject(new ApiError("upstream", "Данные появятся на этапе 1"));

export const placeholderApi: SielomApi = {
  catalog: { divisions: notReady, groups: notReady, search: notReady },
  schedule: { group: notReady, teacher: notReady, room: notReady, building: notReady },
  rooms: { free: notReady },
  people: { photo: notReady },
  offline: { status: notReady, setEnabled: notReady },
  stats: { subjects: notReady },
};
