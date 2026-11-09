/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Откуда берутся данные. Единственное место с адресами API: его читают и сайт (app.js), и локальный сервер (server.js).
// Если институт снова переедет, правится только этот файл.
//
// Каждый сервис — это одна задача и список адресов, которые её решают. Адреса пробуются по порядку: первый — основной,
// остальные — резерв. Подходящим адрес считается, только если на проверочный запрос (probe) пришёл JSON нужной формы,
// а не страница «не найдено» или чужой ответ с кодом 200.
const SIELOM_SOURCES = {
  schedule: {
    purpose: "Расписание из 1С: корпуса, группы, недели и пары",
    // этот же запрос сайт делает при каждом открытии, поэтому проверка не стоит лишнего запроса
    probe: {
      path: "/divisions",
      valid: (data) => Array.isArray(data) && data.length > 0 && typeof data[0]?.id_1c === "string",
    },
    mirrors: [
      { id: "timetable", role: "primary", base: "https://timetable.sielom.ru/api", note: "API расписания нового сайта sielom.ru (с ноября 2026)" },
      // Тот же сервер под старым доменом. Сейчас отвечает редиректом 301 на основной адрес без CORS-заголовков, и браузер
      // его не проходит. Оставлен на случай, когда сломается только домен sielom.ru; при живом основном не запрашивается
      { id: "sieup", role: "backup", base: "https://timetable.sieup.ru/api", note: "старый домен того же сервера" },
    ],
  },
  employees: {
    purpose: "Сотрудники из CMS сайта института: фото преподавателей",
    probe: {
      path: "/employees?pagination[limit]=1",
      valid: (data) => Array.isArray(data?.data) && typeof data?.meta?.pagination?.total === "number",
    },
    mirrors: [
      // CMS отдаёт пути к файлам вида /uploads/<файл>, а сами файлы лежат в хранилище media
      { id: "cms", role: "primary", base: "https://cms.sielom.ru/api", media: "https://s3.ru1.storage.beget.cloud/6d6934ceaabf-sielom-s3", note: "Strapi нового сайта sielom.ru (с ноября 2026)" },
    ],
  },
};

if (typeof module === "object" && module.exports) module.exports = SIELOM_SOURCES;
