/*
 * Мой Сиелом — неофициальное расписание СИЭУиП
 * Copyright © 2026 NikkiShuRA · https://github.com/NikkiShuRA/my-sielom-web
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Контракт внутреннего API: всё, что видит фронт. Формат sielom.ru сюда не попадает.
// Поля доменных типов предварительные: их сверяем с живыми ответами sielom.ru на этапе 1

/** Дата без времени, `YYYY-MM-DD` */
export type IsoDate = string;
/** Время суток, `HH:MM` */
export type ClockTime = string;

export type ResultMeta = {
  /** network — свежий ответ, saved — сохранённая копия на устройстве */
  source: "network" | "saved";
  /** ISO-время, когда данные получены с sielom.ru */
  fetchedAt: string;
  /** Почему показана копия; только при source = saved */
  reason?: "offline" | "upstream";
};

/** Обёртка любого ответа: данные + откуда они и когда получены */
export type Result<T> = { data: T; meta: ResultMeta };

export type ApiErrorKind = "offline" | "upstream" | "invalid_response" | "not_found";

/** Бросается, только когда показать нечего: запрос не удался и сохранённой копии нет */
export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.kind = kind;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

export type Division = { id: string; name: string };

export type Group = { id: string; name: string; course: number | null; divisionId: string };

export type SearchHit =
  | { kind: "group"; id: string; title: string }
  | { kind: "teacher"; id: string; title: string }
  | { kind: "room"; id: string; title: string; divisionId: string };

/** Площадка вне корпусов колледжа, например больница */
export type ExternalPlace = { name: string; address: string };

export type Lesson = {
  id: string;
  date: IsoDate;
  number: number;
  start: ClockTime;
  end: ClockTime;
  subject: string;
  note: string | null;
  subgroup: string | null;
  group: { id: string; name: string };
  teacher: { name: string } | null;
  room: { id: string; name: string; place: ExternalPlace | null } | null;
};

export type Break = { afterLesson: number; minutes: number };

export type DaySchedule = { date: IsoDate; lessons: Lesson[]; breaks: Break[] };

export type WeekSchedule = {
  /** Понедельник недели */
  weekStart: IsoDate;
  /** false — расписание на неделю ещё не опубликовано */
  published: boolean;
  days: DaySchedule[];
};

export type BuildingWeek = WeekSchedule & { divisionId: string; rooms: { id: string; name: string }[] };

export type RoomStatus = { room: { id: string; name: string }; free: boolean; lesson: Lesson | null };

export type Owner = { kind: "group"; id: string } | { kind: "teacher"; name: string };

export type SubjectTally = { subject: string; pairs: number; hours: number };

export type OfflineStatus = {
  enabled: boolean;
  /** Недели, сохранённые целиком для всех корпусов */
  weeks: { weekStart: IsoDate; fetchedAt: string }[];
};

export interface SielomApi {
  catalog: {
    divisions(): Promise<Result<Division[]>>;
    groups(): Promise<Result<Group[]>>;
    search(query: string): Promise<Result<SearchHit[]>>;
  };
  schedule: {
    group(groupId: string, week: IsoDate): Promise<Result<WeekSchedule>>;
    teacher(teacherName: string, week: IsoDate): Promise<Result<WeekSchedule>>;
    room(roomId: string, week: IsoDate): Promise<Result<WeekSchedule>>;
    building(divisionId: string, week: IsoDate): Promise<Result<BuildingWeek>>;
  };
  rooms: {
    free(divisionId: string, date: IsoDate, lesson: number): Promise<Result<RoomStatus[]>>;
  };
  people: {
    /** URL фото или null; без фото интерфейс рисует инициалы */
    photo(teacherName: string): Promise<Result<string | null>>;
  };
  offline: {
    status(): Promise<OfflineStatus>;
    setEnabled(on: boolean): Promise<void>;
  };
  stats: {
    /** Пары и часы по дисциплинам с начала учебного года до даты включительно */
    subjects(owner: Owner, until: IsoDate): Promise<Result<SubjectTally[]>>;
  };
}
