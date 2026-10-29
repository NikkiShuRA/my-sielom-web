(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // Оба API отдают CORS для любого Origin, поэтому ходим напрямую — сайт работает на любом статическом хостинге
  const API = "https://sielom.ru/schedule/api";
  const STRAPI = "https://strapi.sielom.ru/api";
  const DEFAULT_SELECTION = { kind: "group", id: "f961b5a2-26f7-11ee-9f9a-c08a77b51a65", divisionId: "2b807ff8-81a9-11f0-9fba-e029e7085e0b" };
  const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const WEEKDAYS_FULL = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const KIND_LABEL = { group: "Группа", teacher: "Преподаватель", room: "Кабинет", building: "Корпус · все кабинеты", profile: "Профиль" };
  // Между парами показываем длинный перерыв (от 25 мин) разделителем «Перерыв N мин». Он берётся из самих данных,
  // поэтому не зависит от того, как называть смены и каким бывает график звонков в корпусе
  const LONG_BREAK = 25;
  // В режиме «День» подписываем и обычные перемены (от 5 мин): строк мало, и видно, сколько отдыхать между парами
  const SHOW_BREAK = 5;
  const EMPLOYEE_CACHE_KEY = "sielom.employees.v1";
  const EMPLOYEE_CACHE_TTL = 24 * 60 * 60 * 1000;

  // «Кабинеты» вне корпусов колледжа: в расписании они числятся за корпусом, но находятся по своему адресу
  const EXTERNAL_PLACES = {
    "СОКБ": { name: "Сургутская окружная клиническая больница", address: "Энергетиков 24" },
  };
  const externalPlace = (room) => EXTERNAL_PLACES[String(room || "").trim()] || null;

  const ICON = {
    bookmark: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 2.75C4 2.34 4.34 2 4.75 2h6.5c.41 0 .75.34.75.75V14l-4-2.25L4 14V2.75z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    chevron: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    alert: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.75V8.5M8 11h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gear: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M8.4 2.75h3.2l.45 2.1c.5.2.97.47 1.4.8l2.05-.66 1.6 2.77-1.6 1.44a5.6 5.6 0 0 1 0 1.6l1.6 1.44-1.6 2.77-2.05-.66c-.43.33-.9.6-1.4.8l-.45 2.1H8.4l-.45-2.1a5.6 5.6 0 0 1-1.4-.8l-2.05.66-1.6-2.77 1.6-1.44a5.6 5.6 0 0 1 0-1.6L2.9 7.76l1.6-2.77 2.05.66c.43-.33.9-.6 1.4-.8l.45-2.1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.4" stroke="currentColor" stroke-width="1.5"/></svg>',
    calendar: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5.5 1.75v2.5M10.5 1.75v2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.75V8l2.25 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    grid: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.6"/><rect x="11" y="3" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="11" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.6"/><rect x="11" y="11" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.6"/></svg>',
    door: '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 14V3.5c0-.55.45-1 1-1h5.5c.55 0 1 .45 1 1V14M1.5 14h13M10.5 5.5H12c.55 0 1 .45 1 1V14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8.5" r=".9" fill="currentColor"/></svg>',
    search: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.75" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    calClock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="16" cy="16" r="3.6" fill="var(--c-bg)" stroke="currentColor" stroke-width="1.5"/><path d="M16 14.5V16l1 .8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    wifiOff: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9.5a13 13 0 0 1 18 0M6 13a8.5 8.5 0 0 1 12 0M9.2 16.4a4 4 0 0 1 5.6 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    coffee: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M12 3.5v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* приватный режим */ }
    },
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Профиль живёт только в этом браузере: роль, своя группа или своё расписание и группы, которые курирует преподаватель.
  // Роль никто не проверяет — это настройка удобства, а не доступ к закрытым данным
  const PROFILE_KEY = "sielom.profile.v1";
  // home — с чего открывается сайт: "profile" (страница профиля), "schedule" (своё расписание), "curated:<id>" (курируемая группа), "last" (что смотрели в прошлый раз)
  const EMPTY_PROFILE = { role: null, group: null, teacher: null, curated: [], home: "profile" };
  let profile = { ...EMPTY_PROFILE, ...store.get(PROFILE_KEY, {}) };
  // Своё расписание: группа студента или расписание преподавателя
  function profileHome() {
    if (profile.role === "student" && profile.group) return { kind: "group", id: profile.group.id, title: profile.group.title, divisionId: profile.group.divisionId };
    if (profile.role === "teacher" && profile.teacher) return { kind: "teacher", id: profile.teacher.id, title: profile.teacher.id, divisionId: profile.teacher.divisionId };
    return null;
  }
  // Страница профиля — отдельный «вид» со своей выборкой; в последний выбор она не сохраняется
  const profileSel = () => ({ kind: "profile", id: "me", divisionId: profileHome()?.divisionId || null });
  const lastSelection = () => store.get("sielom.selection", DEFAULT_SELECTION);

  function startSelection() {
    const home = profileHome();
    if (!home) return lastSelection();
    const h = profile.home || "profile";
    if (h === "schedule") return home;
    if (h === "last") return lastSelection();
    if (h.startsWith("curated:")) {
      const g = profile.role === "teacher" && profile.curated.find((x) => `curated:${x.id}` === h);
      if (g) return { kind: "group", id: g.id, title: g.title, divisionId: g.divisionId };
    }
    return profileSel();
  }

  const state = {
    tab: "group",
    selected: startSelection(),
    divisionId: null,
    courseFilter: null,
    favourites: new Set(store.get("sielom.favourites.v2", [])),
    query: "",
    view: "week",
    weekOffset: 0,
    dayIndex: null,
    divisions: [],
    groups: [],
    week: null,
    lessons: [],
    curatedLessons: new Map(), // страница профиля: id курируемой группы → её пары за неделю
    divisionLessons: [],
    cabinets: new Map(),
    bells: new Map(),
    breaks: new Map(), // номер пары → типичный перерыв до следующей, мин
    lessonNums: [],
    employeePhotos: new Map(),
    searchIndex: null, // { weekId, teachers: [], rooms: [] } — для глобального поиска
    error: null,
    loadingWeek: true,
    divisionLoaded: false,
    // «Весь корпус»: вид (все кабинеты / свободные), выбранная пара и фильтры шахматки
    building: { view: store.get("sielom.buildingView", "all") === "free" ? "free" : "all", pair: null, find: "", floor: "all", onlyFree: false },
  };
  const isProfile = () => state.selected.kind === "profile";
  const tabFor = (sel) => sel.kind === "building" ? "room" : sel.kind === "profile" ? (profileHome()?.kind || "group") : sel.kind;
  state.tab = tabFor(state.selected);
  // Раздел панели: «Моё» (профиль и избранное) или «Все расписания» (поиск и каталог); без профиля по умолчанию — каталог
  state.sideTab = store.get("sielom.sideTab", profileHome() ? "mine" : "all") === "mine" ? "mine" : "all";
  const isBuilding = () => state.selected.kind === "building";
  state.divisionId = state.selected.divisionId || null;

  // ---------- Даты и время ----------
  const pad = (n) => String(n).padStart(2, "0");
  const parseISO = (s) => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const nowMin = (now) => now.getHours() * 60 + now.getMinutes();
  const dayDiff = (a, b) => Math.round((parseISO(isoDate(a)) - parseISO(isoDate(b))) / 864e5);

  function plural(n, [one, few, many]) {
    if (n % 10 === 1 && n % 100 !== 11) return one;
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return few;
    return many;
  }
  const pluralGroups = (n) => plural(n, ["группа", "группы", "групп"]);
  const fmtDuration = (min) => min < 60 ? `${min} мин` : `${Math.floor(min / 60)} ч${min % 60 ? ` ${min % 60} мин` : ""}`;

  // Пара относительно текущего момента: ещё не началась / идёт / прошла
  function timing(lesson, date, now) {
    const day = isoDate(date), today = isoDate(now);
    if (day < today) return { kind: "past" }; // пары прошедших дней — прошедшие
    if (day > today) return null;
    const cur = nowMin(now), s = toMin(lesson.timeStart), e = toMin(lesson.timeEnd);
    if (cur < s) return { kind: "soon", left: s - cur };
    if (cur <= e) return { kind: "now", left: e - cur, progress: Math.round((cur - s) / (e - s) * 100) };
    return { kind: "past" };
  }

  // ---------- API ----------
  const apiCache = new Map();
  async function apiFetch(url) {
    if (apiCache.has(url)) return apiCache.get(url);
    const p = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch((e) => { apiCache.delete(url); throw e; });
    apiCache.set(url, p);
    return p;
  }

  const q = (s) => encodeURIComponent(s);
  const loadDivisions = () => apiFetch(`${API}/divisions`);
  const loadGroups    = () => apiFetch(`${API}/groups`);
  const loadWeek = async (offset) => {
    const d = new Date(); d.setDate(d.getDate() + offset * 7);
    const list = await apiFetch(`${API}/weeks/date/${isoDate(d)}`);
    return list[0] || null;
  };
  const loadLessonsFor = (sel, week, divName) => {
    if (sel.kind === "group")   return apiFetch(`${API}/lessons/group/${q(sel.id)}?week_id=${week.id}`);
    if (sel.kind === "teacher") return apiFetch(`${API}/lessons/teacher?teacherName=${q(sel.id)}&week_id=${week.id}`);
    // весь корпус — тот же запрос, что и для списка кабинетов, без фильтра (apiFetch отдаст его из кэша)
    if (sel.kind === "building") return apiFetch(`${API}/lessons/division?divisionName=${q(divName)}&week_id=${week.id}`);
    return apiFetch(`${API}/lessons/division?divisionName=${q(divName)}&week_id=${week.id}`)
      .then((all) => all.filter((l) => l.cabinet && l.cabinet.id_1c === sel.id));
  };

  // ---------- Сотрудники (Strapi) ----------
  let employeeLoadPromise = null;
  async function ensureEmployees() {
    if (employeeLoadPromise) return employeeLoadPromise;
    const cached = store.get(EMPLOYEE_CACHE_KEY, null);
    if (cached && Date.now() - cached.at < EMPLOYEE_CACHE_TTL) {
      state.employeePhotos = new Map(cached.data);
      return;
    }
    employeeLoadPromise = (async () => {
      const map = new Map();
      let start = 0; const limit = 100;
      for (;;) {
        const res = await apiFetch(`${STRAPI}/employees?populate=photo&pagination[limit]=${limit}&pagination[start]=${start}`);
        for (const e of res.data) {
          const url = e.attributes?.photo?.data?.attributes?.url;
          if (url) map.set(e.attributes.name, url);
        }
        start += limit;
        if (start >= res.meta.pagination.total) break;
      }
      state.employeePhotos = map;
      store.set(EMPLOYEE_CACHE_KEY, { at: Date.now(), data: [...map.entries()] });
      renderList();
      renderWeek();
    })().catch(() => { employeeLoadPromise = null; }); // без фото — инициалы; повторим при следующем вызове
    return employeeLoadPromise;
  }

  // ---------- Вспомогательные ----------
  const divisionById = (id) => state.divisions.find((d) => d.id_1c === id);

  // «№7, Пролетарский,3» → «№7 Пролетарский 3»
  function divisionDisplayLabel(d) {
    if (!d) return "";
    return d.name
      .replace(/^(№\d+),\s*/, "$1 ")   // убираем запятую после номера корпуса
      .replace(/,\s*/g, " ");            // убираем все оставшиеся запятые
  }
  // «№7 Пролетарский,3» → «Пролетарский,3»
  function divisionAddrPart(d) {
    if (!d) return "";
    const m = divisionDisplayLabel(d).match(/^№\d+\s+(.+)$/);
    return m ? m[1] : divisionDisplayLabel(d);
  }
  const divisionFullName = (d) => d ? d.name : "";

  const naturalSort = (a, b) => a.localeCompare(b, "ru", { numeric: true });
  const initials = (parts) => parts.filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const abbName = (name) => { const p = name.trim().split(/\s+/); return p.length < 2 ? name : p[0] + " " + p.slice(1).map((w) => w[0] + ".").join(""); };
  // Буквенный префикс корпуса перед номером кабинета: с дефисом («Р-207») или без («МК101-102»)
  const ROOM_PREFIX = /^[А-Яа-яA-Za-z]+-?(?=\d)/;
  const roomFull = (l) => (l.cabinet && (l.cabinet.number || l.cabinet.name)) || "—"; // кабинет не указан — «—»
  // «Своего» корпуса у преподавателя в данных нет, а ездят они по нескольким. Поэтому смотрим на саму неделю:
  // все пары в одном корпусе (так почти у всех групп) — просто номера; корпусов несколько — у каждого кабинета виден корпус
  let divisionsOf = { lessons: null, multi: false };
  function multiDivision() {
    if (divisionsOf.lessons !== state.lessons) {
      divisionsOf = { lessons: state.lessons, multi: new Set(state.lessons.map((l) => l.division?.id_1c).filter(Boolean)).size > 1 };
    }
    return divisionsOf.multi;
  }
  const roomOf = (l) => {
    const full = roomFull(l);
    const num = full.replace(ROOM_PREFIX, "");
    if (!multiDivision()) return num;
    // корпус — номером, а не буквенным кодом: «№5 · 208» понятнее «МК-208», и у №7 кода нет вовсе
    const corps = /^\d/.test(num) && l.division?.name?.match(/^№\d+/)?.[0];
    return corps ? `${corps} · ${num}` : full;
  };

  // Стабильный оттенок аватарки из имени
  function hue(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
  function avatarHTML(name, cls = "avatar") {
    const url = state.employeePhotos.get(name);
    return url
      ? `<span class="${cls}"><img src="${esc(url)}" alt="" loading="lazy"></span>`
      : `<span class="${cls}" style="--h:${hue(name)}" aria-hidden="true">${esc(initials(name.split(/\s+/)))}</span>`;
  }

  // ---------- Сегмент-контрол: бегунок под активной кнопкой ----------
  function syncThumb(seg) {
    const active = seg.querySelector(".segmented__btn.is-active");
    const thumb = seg.querySelector(".segmented__thumb");
    if (!active || !thumb || !active.offsetWidth) return;
    thumb.style.width = `${active.offsetWidth}px`;
    thumb.style.transform = `translateX(${active.offsetLeft}px)`;
    requestAnimationFrame(() => seg.classList.add("is-ready"));
  }
  const thumbObserver = new ResizeObserver((entries) => entries.forEach((e) => syncThumb(e.target)));
  $$(".segmented").forEach((s) => thumbObserver.observe(s));

  // ---------- Сущности для списка ----------
  function entitiesForTab() {
    const tab = state.tab;

    if (!state.divisionId) {
      return state.divisions.map((d) => {
        const label = divisionDisplayLabel(d);
        const m = label.match(/^(№\d+)\s+(.+)$/);
        return { type: "division", id: d.id_1c, title: label, numPart: m?.[1], addrPart: m?.[2] };
      });
    }

    if (tab === "group") {
      const divGroups = state.groups.filter((g) => g.divisionId === state.divisionId);
      if (state.courseFilter === null) {
        const courses = [...new Set(divGroups.map((g) => g.course))]
          .filter(Boolean)
          .sort((a, b) => Number(a) - Number(b));
        return courses.map((c) => {
          const cnt = divGroups.filter((g) => g.course === c).length;
          return { type: "course", id: String(c), title: `${c} курс`, num: String(c), hint: `${cnt} ${pluralGroups(cnt)}` };
        });
      }
      return divGroups
        .filter((g) => String(g.course) === String(state.courseFilter))
        .sort((a, b) => naturalSort(a.name, b.name))
        .map((g) => ({ type: "group", id: g.id_1c, title: g.name }));
    }

    if (tab === "teacher") {
      const map = new Map();
      for (const l of state.divisionLessons) if (l.teacher && !isVacancy(l.teacher) && !map.has(l.teacher.name)) map.set(l.teacher.name, l.teacher);
      return [...map.values()]
        .sort((a, b) => naturalSort(a.name, b.name))
        .map((t) => ({ type: "teacher", id: t.name, title: t.name, parts: t.name.split(/\s+/) }));
    }

    const map = new Map();
    for (const l of state.divisionLessons) if (l.cabinet && !map.has(l.cabinet.id_1c)) map.set(l.cabinet.id_1c, l.cabinet);
    const rooms = [...map.values()]
      .sort((a, b) => naturalSort(a.number || a.name, b.number || b.name))
      .filter((c) => !isRemote(c))
      .map((c) => {
        const num = c.number || c.name || "—";
        const stripped = num.replace(ROOM_PREFIX, "");
        // подсказка — полный номер («МК-409»), только если он отличается от номера в значке; адрес не нужен, корпус уже выбран
        const ext = externalPlace(c.number || c.name);
        const hint = ext ? ext.address : c.number ? (c.number !== stripped ? c.number : "") : c.name;
        return { type: "room", id: c.id_1c, title: stripped, hint };
      });
    if (!rooms.length) return rooms;
    // первым пунктом — общий вид всех кабинетов корпуса
    const d = divisionById(state.divisionId);
    const free = freeRoomsNow(state.divisionLessons, rooms.map((r) => r.id));
    const hint = `${rooms.length} ${plural(rooms.length, ["кабинет", "кабинета", "кабинетов"])}${free !== null ? ` · свободно сейчас ${free}` : ""}`;
    return [{ type: "building", id: state.divisionId, title: divisionDisplayLabel(d), name: "Весь корпус", hint }, ...rooms];
  }

  const isRemote = (c) => /^дистант$/i.test(c.number || c.name || "");

  // Сколько из кабинетов свободно прямо сейчас; null — если сейчас в корпусе не идёт ни одна пара
  function freeRoomsNow(lessons, roomIds) {
    const now = new Date(), today = isoDate(now);
    const busy = new Set();
    let anyNow = false;
    for (const l of lessons) {
      if (l.date !== today || timing(l, now, now)?.kind !== "now") continue;
      anyNow = true;
      if (l.cabinet) busy.add(l.cabinet.id_1c);
    }
    return anyNow ? roomIds.filter((id) => !busy.has(id)).length : null;
  }

  function selectedTitle() {
    const s = isProfile() ? profileHome() : state.selected;
    if (!s) return "Профиль";
    if (isProfile() && s.kind === "teacher") return abbName(s.id);
    if (s.kind === "group") {
      const g = state.groups.find((x) => x.id_1c === s.id);
      return g ? g.name : "";
    }
    if (s.kind === "teacher") {
      const t = state.divisionLessons.find((x) => x.teacher && x.teacher.name === s.id);
      return t && isVacancy(t.teacher) ? teacherLabel(t.teacher) : abbName(s.id);
    }
    return s.title || "";
  }

  // ---------- Рендер: список ----------
  function listMessage(title, hint = "") {
    return `<li class="list__empty"><b>${esc(title)}</b>${hint ? `<span>${esc(hint)}</span>` : ""}</li>`;
  }

  function entityItemHTML(e) {
    const key = `${e.type}:${e.id}`;
    const fav = state.favourites.has(key);
    const isSelected = state.selected.kind === e.type && state.selected.id === e.id;
    const isNav = e.type === "division" || e.type === "course";
    const divAttr = (e.divisionId ? ` data-division-id="${esc(e.divisionId)}"` : "") + (e.course ? ` data-course="${esc(e.course)}"` : "");
    const attrs = `class="entity entity--${e.type}${isSelected ? " is-selected" : ""}" data-type="${e.type}" data-id="${esc(e.id)}" data-title="${esc(e.title)}"${divAttr} tabindex="0"${isSelected ? ' aria-current="true"' : ""}`;
    const tail = isNav
      ? `<span class="entity__chev">${ICON.chevron}</span>`
      : `<button class="entity__fav" data-fav="${esc(key)}" aria-pressed="${fav}" aria-label="${fav ? "Убрать из избранного" : "В избранное"}" title="${fav ? "Убрать из избранного" : "В избранное"}">${ICON.bookmark}</button>`;
    let lead = "", text;
    if (e.type === "teacher") {
      lead = avatarHTML(e.id);
      text = `<span class="entity__title">${esc(e.parts[0])}</span><span class="entity__hint">${esc(e.parts.slice(1).join(" "))}</span>`;
    } else if (e.type === "division") {
      lead = `<span class="entity__badge">${esc(e.numPart || "—")}</span>`;
      text = `<span class="entity__title">${esc(e.addrPart || e.title)}</span>`;
    } else if (e.type === "course") {
      lead = `<span class="entity__badge">${esc(e.num)}</span>`;
      text = `<span class="entity__title">${esc(e.title)}</span><span class="entity__hint">${esc(e.hint)}</span>`;
    } else if (e.type === "building") {
      lead = `<span class="entity__badge">${ICON.grid}</span>`;
      text = `<span class="entity__title">${esc(e.name)}</span><span class="entity__hint">${esc(e.hint)}</span>`;
    } else if (e.type === "room") {
      lead = `<span class="entity__badge">${esc(e.title)}</span>`;
      text = `<span class="entity__title">Кабинет ${esc(e.title)}</span><span class="entity__hint">${esc(e.hint)}</span>`;
    } else if (e.type === "group") {
      // префикс группы — в значке, в названии остаётся остаток («ЮСО-25/11» → «ЮСО» и «25/11»)
      const g = groupParts(e.title);
      lead = `<span class="entity__badge">${esc(g.mark)}</span>`;
      text = `<span class="entity__title">${esc(g.rest)}</span>${e.hint ? `<span class="entity__hint">${esc(e.hint)}</span>` : ""}`;
    } else {
      text = `<span class="entity__title">${esc(e.title)}</span>${e.hint ? `<span class="entity__hint">${esc(e.hint)}</span>` : ""}`;
    }
    return `<li ${attrs}>${lead}<span class="entity__text">${text}</span>${tail}</li>`;
  }

  function buildFavItems() {
    const byType = { teacher: [], group: [], room: [], building: [] };
    for (const key of state.favourites) {
      const colon = key.indexOf(":");
      const type  = key.slice(0, colon);
      const id    = key.slice(colon + 1);
      if (type === "teacher") {
        byType.teacher.push({ type: "teacher", id, title: id, parts: id.split(/\s+/), divisionId: null });
      } else if (type === "group") {
        const g = state.groups.find((x) => x.id_1c === id);
        if (g) {
          const div = divisionById(g.divisionId);
          byType.group.push({ type: "group", id: g.id_1c, title: g.name, hint: div ? divisionDisplayLabel(div) : "", divisionId: g.divisionId, course: g.course });
        }
      } else if (type === "room") {
        // кабинеты известны по занятиям; кабинет другого корпуса появится, когда соберётся индекс всех корпусов
        const cab = state.cabinets.get(id);
        const num = cab ? (cab.number || cab.name) : "…";
        const stripped = num.replace(ROOM_PREFIX, "");
        const div = cab ? divisionById(cab.divisionId) : null;
        const hint = div ? divisionDisplayLabel(div) : cab ? "" : state.searchIndex ? "Нет занятий на этой неделе" : "Загружаем…";
        byType.room.push({ type: "room", id, title: stripped, hint, divisionId: cab?.divisionId || null });
      } else if (type === "building") {
        const div = divisionById(id);
        if (div) byType.building.push({ type: "building", id, title: divisionDisplayLabel(div), name: divisionDisplayLabel(div), hint: "Все кабинеты", divisionId: id });
      }
    }
    Object.values(byType).forEach((arr) => arr.sort((a, b) => naturalSort(a.title, b.title)));
    return byType;
  }

  // ---------- Глобальный поиск ----------
  // Группы берём из общего списка, преподавателей и кабинеты — из занятий всех корпусов за текущую неделю
  const normText = (t) => String(t || "").toLowerCase().replace(/ё/g, "е");
  const SEARCH_LIMIT = 25;
  let searchIndexPromise = null, searchIndexWeek = null;

  function ensureSearchIndex() {
    const weekId = state.week?.id;
    if (!weekId || !state.divisions.length || searchIndexWeek === weekId) return searchIndexPromise;
    searchIndexWeek = weekId;
    searchIndexPromise = (async () => {
      const parts = await Promise.all(state.divisions.map((d) =>
        apiFetch(`${API}/lessons/division?divisionName=${q(d.name)}&week_id=${weekId}`).then((l) => [d, l]).catch(() => [d, []])));
      const teachers = new Map(), rooms = new Map();
      for (const [d, lessons] of parts) {
        for (const l of lessons) {
          if (l.teacher?.name && !isVacancy(l.teacher)) {
            const t = teachers.get(l.teacher.name) || { name: l.teacher.name, byDiv: new Map() };
            t.byDiv.set(d.id_1c, (t.byDiv.get(d.id_1c) || 0) + 1);
            teachers.set(l.teacher.name, t);
          }
          if (l.cabinet && !rooms.has(l.cabinet.id_1c)) {
            rooms.set(l.cabinet.id_1c, { ...l.cabinet, divisionId: d.id_1c });
            if (!state.cabinets.has(l.cabinet.id_1c)) state.cabinets.set(l.cabinet.id_1c, { ...l.cabinet, divisionId: d.id_1c });
          }
        }
      }
      state.searchIndex = {
        weekId,
        teachers: [...teachers.values()].map((t) => ({ name: t.name, divisionId: [...t.byDiv.entries()].sort((a, b) => b[1] - a[1])[0][0] })),
        rooms: [...rooms.values()],
      };
      if (state.query.trim()) renderList();
    })().catch(() => { searchIndexWeek = null; });
    return searchIndexPromise;
  }

  function searchResults(needle) {
    const tokens = normText(needle).split(/\s+/).filter(Boolean);
    // знаки препинания не важны: «ис 24 9 2», «ис24/9-2» и «ис-24/9-2» — один запрос
    const squash = (s) => normText(s).replace(/[^a-zа-я0-9]+/g, "");
    const whole = squash(needle);
    // по названию ищем любой фрагмент, по подсказке (корпус, адрес) — только от 3 символов, чтобы «1» не цеплял адреса
    const test = (title, hint = "") => {
      const a = normText(title), b = normText(hint), sa = squash(title);
      return { w: !!whole && sa.includes(whole), t: tokens.every((t) => a.includes(t) || sa.includes(squash(t)) || (t.length >= 3 && b.includes(t))) };
    };
    // точное совпадение (без учёта знаков) важнее; если его нет совсем, берём совпадение по словам
    const pick = (items, fields) => {
      const r = items.map((e) => [e, test(...fields(e))]);
      const exact = r.filter(([, x]) => x.w);
      return (exact.length ? exact : r.filter(([, x]) => x.t)).map(([e]) => e);
    };
    const rank = (title) => (squash(title).startsWith(squash(tokens[0])) ? 0 : 1);
    const sortHits = (arr) => arr.sort((a, b) => rank(a.title) - rank(b.title) || naturalSort(a.title, b.title));

    const groups = sortHits(pick(state.groups.map((g) => {
      const div = divisionById(g.divisionId);
      return { type: "group", id: g.id_1c, title: g.name, hint: [div ? divisionDisplayLabel(div) : "", g.course ? `${g.course} курс` : ""].filter(Boolean).join(" · "), divisionId: g.divisionId, course: g.course };
    }), (e) => [e.title, e.hint]));

    const idx = state.searchIndex;
    const teachers = idx ? sortHits(pick(idx.teachers.map((t) => ({ type: "teacher", id: t.name, title: t.name, parts: t.name.split(/\s+/), divisionId: t.divisionId })),
      (e) => [e.title])) : [];
    const rooms = idx ? sortHits(pick(idx.rooms
      .filter((c) => !isRemote(c))
      .map((c) => {
        const num = c.number || c.name || "—";
        const addr = externalPlace(num)?.address || divisionAddrPart(divisionById(c.divisionId));
        // в общем поиске корпусов много, поэтому адрес в подсказке остаётся
        return { type: "room", id: c.id_1c, title: num.replace(ROOM_PREFIX, ""), hint: c.number ? `${c.number}${addr ? " · " + addr : ""}` : c.name, divisionId: c.divisionId, full: num };
      })
      , (e) => [`${e.title} ${e.full}`, e.hint])) : [];
    return { groups, teachers, rooms, ready: !!idx };
  }

  function renderSearchResults(list, needle) {
    const { groups, teachers, rooms, ready } = searchResults(needle);
    const sections = [["Группы", groups], ["Преподаватели", teachers], ["Кабинеты", rooms]];
    let html = "";
    for (const [label, items] of sections) {
      if (!items.length) continue;
      html += `<li class="list-sep" aria-hidden="true"><span>${esc(label)}</span></li>`;
      html += items.slice(0, SEARCH_LIMIT).map((e) => entityItemHTML(e)).join("");
      if (items.length > SEARCH_LIMIT) html += `<li class="list__more">Ещё ${items.length - SEARCH_LIMIT} — уточните запрос</li>`;
    }
    if (!ready) {
      html += state.week
        ? '<li class="list__more"><span class="spin spin--sm"></span>Ищем преподавателей и кабинеты…</li>'
        : '<li class="list__more">Преподаватели и кабинеты недоступны: расписание на эту неделю ещё не опубликовано</li>';
    }
    list.innerHTML = html || listMessage("Ничего не найдено", "Попробуйте изменить запрос");
  }

  function renderList() {
    const list = $("#list");
    $("#sidebar").classList.toggle("is-searching", !!state.query.trim() && state.sideTab === "all");
    const needle = state.query.trim().toLowerCase();

    // Избранное смотрят в одном месте — во вкладке «Моё»; в каталоге закладка у элемента только добавляет и убирает
    if (state.sideTab === "mine") {
      if (state.error && !state.divisions.length) {
        list.innerHTML = listMessage("Не удалось загрузить данные", "Проверьте соединение и обновите страницу");
        return;
      }
      const byType = buildFavItems();
      // кабинет из другого корпуса ещё не встречался в загруженных занятиях — собираем индекс всех корпусов и перерисовываем
      if (!state.searchIndex && byType.room.some((r) => !state.cabinets.has(r.id))) ensureSearchIndex()?.then(() => { if (state.sideTab === "mine") renderList(); });
      const items = ["group", "teacher", "room", "building"].flatMap((t) => byType[t]);
      const head = `<li class="list-head"><span class="list-head__icon">${ICON.bookmark}</span>Избранное${items.length ? `<span class="list-head__count">${items.length}</span>` : ""}</li>`;
      list.innerHTML = head + (items.length ? items.map((e) => entityItemHTML(e)).join("")
        : listMessage("Избранного пока нет", "Во вкладке «Все расписания» нажмите на закладку рядом с группой, преподавателем или кабинетом"));
      return;
    }

    if (state.error && !state.divisions.length) {
      list.innerHTML = listMessage("Не удалось загрузить данные", "Проверьте соединение и обновите страницу");
      return;
    }
    if (needle) { renderSearchResults(list, needle); return; }

    const items = entitiesForTab();
    if (!items.length) {
      const loading = !state.divisions.length || (state.divisionId && state.tab !== "group" && !state.divisionLoaded);
      list.innerHTML = loading
        ? '<li class="sk sk--row"></li>'.repeat(6)
        : listMessage("Ничего не найдено", "");
      return;
    }

    list.innerHTML = items.map((e) => entityItemHTML(e)).join("");
  }

  function renderCrumb() {
    const d = divisionById(state.divisionId);
    const crumbs = [{ label: "Корпуса", go: "toBuildings" }];
    if (d) crumbs.push({ label: divisionDisplayLabel(d), go: "toCourses" });
    if (d && state.tab === "group" && state.courseFilter !== null) crumbs.push({ label: `${state.courseFilter} курс` });
    $("#crumb").innerHTML = crumbs.map((c, i) => i === crumbs.length - 1
      ? `<span class="crumb__cur" aria-current="page">${esc(c.label)}</span>`
      : `<button class="crumb__btn" data-crumb="${c.go}">${esc(c.label)}</button><span class="crumb__sep" aria-hidden="true">/</span>`
    ).join("");
    $("#crumbBack").disabled = !d;
  }

  // ---------- Рендер: карточки пар ----------
  // Дни недели, когда данных недели ещё нет (загрузка, «не опубликовано», ошибка): по смещению от сегодня
  function placeholderDays() {
    if (state.week) return weekDates();
    const d = new Date(); d.setDate(d.getDate() + state.weekOffset * 7);
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return Array.from({ length: 6 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return x; });
  }

  // Пустые состояния: загрузка / расписание не опубликовано / пар нет / ошибка
  function stateHTML(kind, mode) {
    const s = {
      loading: { icon: '<span class="spin"></span>', title: "Загружаем расписание…", text: "Обычно это пара секунд", attrs: ' role="status"' },
      unpublished: { icon: ICON.calClock, cls: " empty__icon--muted", title: "Расписание ещё не опубликовано", text: `На ${mode === "day" ? "этот день" : "эту неделю"} данных нет. Загляните позже.` },
      free: { icon: ICON.coffee, title: "Пар нет", text: "Расписание есть, занятий нет — можно выдохнуть" },
      error: { icon: ICON.wifiOff, cls: " empty__icon--warn", title: "Не удалось загрузить", text: "Проверьте подключение к интернету", retry: true },
    }[kind];
    return `<div class="empty"${s.attrs || ""}>
      <span class="empty__icon${s.cls || ""}">${s.icon}</span>
      <b>${s.title}</b>
      <span>${s.text}</span>
      ${s.retry ? '<button class="btn btn--accent" id="retry">Повторить</button>' : ""}
    </div>`;
  }

  function weekDates() {
    const start = parseISO(state.week.dateStart);
    return Array.from({ length: 6 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }

  // Чьими глазами показывать пару: на странице профиля — как в своём расписании (группа или преподаватель)
  const viewKind = () => isProfile() ? (profileHome()?.kind || "group") : state.selected.kind;

  // В одной паре у подгрупп бывают разные предметы (одна на практике, другая на занятии) и, изредка, разное время —
  // показываем их все, а не первый попавшийся
  const subjectName = (l) => l.subject?.name || "Предмет не указан";
  const subjectGroups = (lessons) => {
    const m = new Map();
    for (const l of lessons) (m.get(subjectName(l)) || m.set(subjectName(l), []).get(subjectName(l))).push(l);
    return [...m.entries()];
  };
  const timeLabel = (lessons) => uniq(lessons.map((l) => `${l.timeStart} – ${l.timeEnd}`)).join(" / ");
  const mixedTime = (lessons) => timeLabel(lessons).includes(" / ");
  // Слот целиком: у групп и подгрупп одного номера время в API может различаться — от раннего начала до позднего конца
  const spanOf = (lessons) => ({
    date: lessons[0].date, lessonNumber: lessons[0].lessonNumber,
    timeStart: lessons.map((l) => l.timeStart).sort()[0], timeEnd: lessons.map((l) => l.timeEnd).sort().at(-1),
  });
  // «ВАКАНСИЯ» в данных — не фамилия, а незакрытая ставка
  const isVacancy = (t) => /^вакансия$/i.test(String(t?.name || "").trim());
  // сокращаем сами, а не берём abb_name из API: там бывает «Джафарли Асмар Б.К.», а в остальных местах — «Джафарли А.Б.К.»
  const teacherLabel = (t, full = false) => !t ? "" : isVacancy(t) ? "Преподаватель не назначен" : full ? t.name : abbName(t.name);

  function whoLabel(l, full = false, kind = viewKind()) {
    const teacher = l.teacher && teacherLabel(l.teacher, full);
    const group = l.group && l.group.name;
    const base = kind === "group" ? teacher : kind === "teacher" ? group : kind === "room" ? group : [teacher, group].filter(Boolean).join(" · ");
    return base || "";
  }

  // Строки «кабинет + кто» — по одной на подгруппу. При общем кабинете он показан один раз.
  // forceSg — номер подгруппы даже у одиночной строки: в паре с разными предметами иначе не понять, чья это строка
  function partsHTML(lessons, full, kind = viewKind(), withAvatar = full && kind === "group", forceSg = false) {
    const sameRoom = lessons.every((l) => roomOf(l) === roomOf(lessons[0]));
    const roomMode = kind === "room";
    const primaryOf = (l) => roomMode
      ? (l.teacher ? teacherLabel(l.teacher) : "—")
      : roomOf(l);

    if (lessons.length > 1) {
      const l0 = lessons[0];
      const sameTeacher = roomMode && lessons.every((l) => l.teacher?.name === l0.teacher?.name);
      if ((sameRoom && !roomMode) || sameTeacher) {
        const rows = lessons.map((l) => {
          const who = whoLabel(l, full, kind);
          const sg = l.subgroup ? `<span class="sg" title="${esc(l.subgroup)} подгруппа">${esc(l.subgroup)}</span>` : "";
          const av = withAvatar && l.teacher && !isVacancy(l.teacher) ? avatarHTML(l.teacher.name, "avatar avatar--xs") : "";
          return `<span class="who-row">${sg}${av}<span class="who" title="${esc(who)}">${esc(who)}</span></span>`;
        }).join("");
        const badge = roomMode ? primaryOf(l0) : roomOf(l0);
        return `<ul class="parts"><li class="part"><span class="room${l0.note ? " is-changed" : ""}">${esc(badge)}</span><span class="who-stack">${rows}</span></li></ul>`;
      }
    }

    return `<ul class="parts">${lessons.map((l) => {
      const who = whoLabel(l, full, kind);
      return `<li class="part">
        ${(lessons.length > 1 || forceSg) && l.subgroup ? `<span class="sg" title="${esc(l.subgroup)} подгруппа">${esc(l.subgroup)}</span>` : ""}
        <span class="room${l.note ? " is-changed" : ""}">${esc(primaryOf(l))}</span>
        ${withAvatar && l.teacher && !isVacancy(l.teacher) ? avatarHTML(l.teacher.name, "avatar avatar--xs") : ""}
        <span class="who" title="${esc(who)}">${esc(who)}</span>
      </li>`;
    }).join("")}</ul>`;
  }

  function lessonCardHTML(lessons, date, now, { next = false, full = false } = {}) {
    const l0 = lessons[0];
    const subjects = subjectGroups(lessons);
    const subject = subjects.map(([s]) => s).join(" / ");
    const t = timing(spanOf(lessons), date, now);
    const notes = lessons.filter((l) => l.note);

    let chip = "";
    if (t?.kind === "now") chip = `<span class="chip chip--live">Идёт · ещё ${fmtDuration(t.left)}</span>`;
    else if (next && t?.kind === "soon") chip = `<span class="chip chip--next">${t.left <= 180 ? `Через ${fmtDuration(t.left)}` : "Следующая"}</span>`;

    const cls = ["lesson", full && "lesson--full", t?.kind === "now" && "is-now", next && "is-next", t?.kind === "past" && "is-past", notes.length && "has-note"]
      .filter(Boolean).join(" ");
    const meta = [
      full ? (mixedTime(lessons) ? `<span class="lesson__time">${esc(timeLabel(lessons))}</span>` : "") : `<span class="lesson__num">${l0.lessonNumber}</span><span class="lesson__time">${esc(timeLabel(lessons))}</span>`,
      chip,
      notes.length ? '<span class="grow"></span>' : (chip ? '<span class="grow"></span>' : ""),
      notes.length ? `<span class="lesson__note" title="Есть примечание">${ICON.alert}</span>` : "",
    ].join("");

    return `
      <article class="${cls}" data-detail="${esc(lessons.map((l) => l.id).join(","))}" tabindex="0" role="button"
        aria-label="${esc(`${l0.lessonNumber}-я пара, ${timeLabel(lessons)}: ${subject}. Подробнее`)}"
        ${t?.kind === "now" ? `style="--progress:${t.progress}%"` : ""}>
        ${meta.trim() ? `<div class="lesson__meta">${meta}</div>` : ""}
        ${subjects.length === 1
          ? `<h3 class="lesson__title" title="${esc(subject)}">${esc(subject)}</h3>${partsHTML(lessons, full)}`
          : subjects.map(([s, ls]) => `<div class="lesson__block"><h3 class="lesson__title" title="${esc(s)}">${esc(s)}</h3>${partsHTML(ls, full, viewKind(), full && viewKind() === "group", true)}</div>`).join("")}
        ${full && notes.length ? `<p class="lesson__notes">${notes.map((l) => esc(l.note)).join("<br>")}</p>` : ""}
      </article>`;
  }

  // Пустая пара: в API у неё нет ни времени, ни занятия, поэтому и время не подставляем — только номер
  function slotHTML(num) {
    return `<div class="slot" aria-hidden="true">
      <span class="slot__num">${num}</span>
      <span class="slot__time">нет пары</span>
    </div>`;
  }

  function lessonsByNum(iso) {
    const byNum = new Map();
    state.lessons
      .filter((l) => l.date === iso)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart) || (a.subgroup || 0) - (b.subgroup || 0))
      .forEach((l) => { if (!byNum.has(l.lessonNumber)) byNum.set(l.lessonNumber, []); byNum.get(l.lessonNumber).push(l); });
    return byNum;
  }

  // Номер ближайшей пары сегодня (если сейчас ничего не идёт)
  function nextNum(byNum, date, now) {
    if (isoDate(date) !== isoDate(now)) return null;
    const nums = [...byNum.keys()].sort((a, b) => a - b);
    if (nums.some((n) => timing(spanOf(byNum.get(n)), date, now).kind === "now")) return null;
    return nums.find((n) => timing(spanOf(byNum.get(n)), date, now).kind === "soon") ?? null;
  }

  function noticeHTML(lessons) {
    const notes = lessons.filter((l) => l.note);
    if (!notes.length) return "";
    const text = notes.length === 1 ? notes[0].note : `Примечаний: ${notes.length} — откройте пару, чтобы прочитать`;
    return `<div class="callout callout--warn">${ICON.alert}<span>${esc(text)}</span></div>`;
  }

  // ---------- Режим «Неделя» ----------
  function dayColumnHTML(date, index, now) {
    const iso = isoDate(date);
    const isToday = iso === isoDate(now);
    const byNum = lessonsByNum(iso);
    const next = nextNum(byNum, date, now);
    const weekDays = weekDates();

    // Карточки лежат прямо в колонке: строки сетки общие для всех дней (subgrid),
    // поэтому высота строки равна самой высокой карточке среди дней
    const items = [];
    let prevNum = null;
    for (const num of state.lessonNums) {
      if (prevNum !== null && breakRow(prevNum, num, weekDays)) {
        // строка-разделитель общая для всех дней (чтобы сетка была ровной); подпись — только если с обеих сторон
        // реальные пары этого дня: время пустой пары в API нет, и перерыв от него был бы выдуманным
        const a = byNum.get(prevNum)?.[0], b = byNum.get(num)?.[0];
        items.push(a && b ? breakDividerHTML(toMin(b.timeStart) - toMin(a.timeEnd)) : '<div class="shift-divider" role="separator"></div>');
      }
      prevNum = num;

      const lessons = byNum.get(num);
      if (!lessons) { items.push(slotHTML(num, iso)); continue; }
      items.push(lessonCardHTML(lessons, date, now, { next: num === next }));
    }
    const rows = 1 + items.length; // шапка + строки пар
    const body = byNum.size ? items.join("") : `<div class="day__empty"><span class="empty__icon">${ICON.coffee}</span><b>Пар нет</b></div>`;

    return `
      <section class="day${isToday ? " is-today" : iso < isoDate(now) ? " is-past" : ""}" style="--rows:${rows}">
        <div class="day__head">
          <button class="day-head" data-open-day="${index}" title="Открыть день">
            <span class="day-head__wd">${WEEKDAYS[date.getDay()]}</span>
            <span class="day-head__date">${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}</span>
            ${isToday ? '<span class="chip chip--today">Сегодня</span>' : ""}
            <span class="day-head__go">${ICON.chevron}</span>
          </button>
          ${noticeHTML([...byNum.values()].flat())}
        </div>
        ${body}
      </section>`;
  }

  // ---------- Режим «День» ----------
  function stripHTML(days, now, mod = "") {
    const segments = [[]];
    state.lessonNums.forEach((n, i) => {
      if (i && breakRow(state.lessonNums[i - 1], n, days)) segments.push([]);
      segments.at(-1).push(n);
    });
    return `<div class="strip${mod ? ` strip--${mod}` : ""}" role="tablist" aria-label="Дни недели">${days.map((d, i) => {
      const have = new Set(lessonsByNum(isoDate(d)).keys());
      const count = have.size;
      // на каждую пару сетки — точка (свободная — пустая); ряды разделены теми же длинными перерывами, что и в расписании
      const rows = segments.map((seg) => `<span>${seg.map((n) => `<i${have.has(n) ? "" : ' class="is-empty"'}></i>`).join("")}</span>`).join("");
      const active = i === state.dayIndex;
      return `<button class="strip__day${active ? " is-active" : ""}${isoDate(d) === isoDate(now) ? " is-today" : ""}" data-pick-day="${i}" role="tab" aria-selected="${active}"
          aria-label="${esc(`${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}: ${count ? `${count} ${plural(count, ["пара", "пары", "пар"])}` : "пар нет"}`)}">
        <span class="strip__wd">${WEEKDAYS[d.getDay()]}</span>
        <span class="strip__num">${d.getDate()}</span>
        <span class="strip__dots" aria-hidden="true">${rows}</span>
      </button>`;
    }).join("")}</div>`;
  }

  // kind — принудительное состояние (loading / unpublished / error) вместо расписания
  function dayViewHTML(days, now, kind = null) {
    const date = days[state.dayIndex];
    const iso = isoDate(date);
    const byNum = lessonsByNum(iso);
    const present = state.lessonNums.filter((n) => byNum.has(n));
    const diff = dayDiff(date, now);
    const rel = { 0: "сегодня", 1: "завтра", [-1]: "вчера" }[diff];

    let summary = "";
    if (present.length) {
      const first = spanOf(byNum.get(present[0])), last = spanOf(byNum.get(present.at(-1)));
      summary = `${present.length} ${plural(present.length, ["пара", "пары", "пар"])} · ${first.timeStart} – ${last.timeEnd}`;
    }

    let content;
    if (kind) {
      summary = "";
      content = stateHTML(kind, "day");
    } else if (!present.length) {
      content = stateHTML("free", "day");
    } else {
      const next = nextNum(byNum, date, now);
      const from = state.lessonNums.indexOf(present[0]), to = state.lessonNums.indexOf(present.at(-1));
      // Только реальные пары из API и промежутки между ними. Пропущенные номера — «окно» без своего времени
      // (в API его нет), а свободное время считается от конца предыдущей пары до начала следующей
      let rows = "";
      let prev = null;
      for (const num of state.lessonNums.slice(from, to + 1)) {
        const lessons = byNum.get(num);
        if (!lessons) continue;
        const time = spanOf(lessons);
        if (prev) {
          const gap = toMin(time.timeStart) - toMin(prev.time.timeEnd);
          const gapTiming = gap > 0 ? timing({ timeStart: prev.time.timeEnd, timeEnd: time.timeStart }, date, now) : null;
          const gp = gapTiming?.kind === "now" ? ` style="--p:${gapTiming.progress / 100}"` : "";
          const missed = state.lessonNums.filter((n) => n > prev.num && n < num);
          if (missed.length) {
            rows += `<li class="tl-row tl-row--window${gapTiming ? ` is-${gapTiming.kind}` : ""}"${gp}>
              <div class="tl-time"></div>
              <span class="tl-rail"><span class="tl-dot"></span></span>
              <div class="tl-body">
                <span class="tl-num">${missed.join(", ")} ${missed.length > 1 ? "пары" : "пара"}</span>
                <div class="window">Окно${gap > 0 ? ` · свободно ${esc(prev.time.timeEnd)} – ${esc(time.timeStart)}, ${fmtDuration(gap)}` : ""}</div>
              </div>
            </li>`;
          } else if (gap >= SHOW_BREAK || gap < 0) {
            // перерыв — тоже «момент» на линии: ещё не начался / идёт / прошёл, со своей точкой и прогрессом
            rows += `<li class="tl-row tl-row--shift${gapTiming ? ` is-${gapTiming.kind}` : ""}"${gp}><span></span><span class="tl-rail"><span class="tl-dot tl-dot--break"></span></span>${breakDividerHTML(gap)}</li>`;
          }
        }
        prev = { num, time };
        const t = timing(time, date, now);
        const rowCls = ["tl-row", t && `is-${t.kind}`].filter(Boolean).join(" ");
        const rp = t?.kind === "now" ? ` style="--p:${t.progress / 100}"` : "";
        rows += `<li class="${rowCls}"${rp}>
          <div class="tl-time">
            <span class="tl-start">${esc(time.timeStart)}</span>
            <span class="tl-end">${esc(time.timeEnd)}</span>
          </div>
          <span class="tl-rail"><span class="tl-dot"></span></span>
          <div class="tl-body">
            <span class="tl-num">${num} пара</span>
            ${lessonCardHTML(lessons, date, now, { next: num === next, full: true })}
          </div>
        </li>`;
      }
      content = `${noticeHTML([...byNum.values()].flat())}<ol class="timeline">${rows}</ol>`;
    }

    const stripMod = { loading: "still", unpublished: "off", error: "off" }[kind] || "";
    return `<div class="dayview">
      ${stripHTML(days, now, stripMod)}
      <div class="dv-content">
        <header class="dv-head">
          <div>
            <h2 class="dv-title">${WEEKDAYS_FULL[date.getDay()]}</h2>
            <span class="dv-date">${date.getDate()} ${MONTHS[date.getMonth()]}${rel ? ` · ${rel}` : ""}</span>
          </div>
          ${summary ? `<span class="dv-summary">${ICON.clock}${esc(summary)}</span>` : ""}
        </header>
        ${content}
      </div>
    </div>`;
  }

  // ---------- Весь корпус ----------
  // Номер кабинета без буквенного префикса корпуса («Р-213» → «213»)
  const roomShort = (c) => String(c.number || c.name || "—").replace(ROOM_PREFIX, "");
  // Этаж — первая цифра трёхзначного номера («МК-409» → 4, «003» → цоколь); «Спортзал», «З-7/1» и т. п. — в «Другие»
  function roomFloor(c) {
    const m = String(c.number || c.name || "").replace(/^[А-Яа-яA-Za-z]+-?/, "").match(/^(\d)\d\d/);
    return m ? m[1] : "x";
  }
  const FLOOR_LABEL = (f) => f === "0" ? "Цокольный этаж" : f === "x" ? "Другие помещения" : `${f} этаж`;
  const FLOOR_SHORT = (f) => f === "0" ? "Цок." : f === "x" ? "Др." : `${f} эт.`;
  const surname = (t) => isVacancy(t) ? "не назначен" : (t?.name || "").split(/\s+/)[0];
  const narrowMQ = matchMedia("(max-width: 720px)");

  // Пары дня в корпусе: все варианты времени каждого номера ровно как в API (в корпусе №1 7-я пара бывает 18:00 и 18:20).
  // Колонка охватывает их все — от самого раннего начала до самого позднего конца, ничего не усредняем
  function dayBells(iso) {
    const byNum = new Map();
    for (const l of state.lessons) {
      if (l.date !== iso) continue;
      if (!byNum.has(l.lessonNumber)) byNum.set(l.lessonNumber, new Set());
      byNum.get(l.lessonNumber).add(`${l.timeStart}-${l.timeEnd}`);
    }
    return [...byNum].sort((a, b) => a[0] - b[0]).map(([num, set]) => {
      const variants = [...set].sort().map((t) => { const [timeStart, timeEnd] = t.split("-"); return { timeStart, timeEnd }; });
      const timeStart = variants.map((v) => v.timeStart).sort()[0], timeEnd = variants.map((v) => v.timeEnd).sort().at(-1);
      return { num, timeStart, timeEnd, variants };
    });
  }
  const bellLabel = (b) => b.variants.map((v) => `${v.timeStart} – ${v.timeEnd}`).join(" / ");

  // Кабинеты корпуса за всю неделю (чтобы и пустой сегодня кабинет был в сетке), разложенные по этажам
  function buildingRooms() {
    const map = new Map();
    for (const l of state.lessons) if (l.cabinet && !isRemote(l.cabinet) && !map.has(l.cabinet.id_1c)) map.set(l.cabinet.id_1c, l.cabinet);
    const floors = new Map();
    for (const c of [...map.values()].sort((a, b) => naturalSort(roomShort(a), roomShort(b)))) {
      const f = roomFloor(c);
      if (!floors.has(f)) floors.set(f, []);
      floors.get(f).push(c);
    }
    return [...floors].sort((a, b) => (a[0] === "x") - (b[0] === "x") || a[0].localeCompare(b[0]));
  }

  function buildingDay(date, now) {
    const iso = isoDate(date);
    const slots = new Map(); // «кабинет|пара» → пары (подгруппы и потоки в одном кабинете)
    for (const l of state.lessons) {
      if (l.date !== iso || !l.cabinet) continue;
      const k = `${l.cabinet.id_1c}|${l.lessonNumber}`;
      if (!slots.has(k)) slots.set(k, []);
      slots.get(k).push(l);
    }
    const bells = dayBells(iso);
    const floors = buildingRooms();
    const rooms = floors.flatMap(([, list]) => list);
    const nowBell = bells.find((b) => timing(b, date, now)?.kind === "now") || null;
    // выбранная пара для «Свободных» и телефона: явно выбранная → идущая → ближайшая сегодня → первая
    const pick = bells.find((b) => b.num === state.building.pair) || nowBell
      || (isoDate(date) === isoDate(now) && bells.find((b) => timing(b, date, now)?.kind === "soon")) || bells[0] || null;
    const at = (c, num) => slots.get(`${c.id_1c}|${num}`);
    // занят ли кабинет во время пары — по времени, а не по номеру: в корпусе №1 7-я пара (18:00) начинается раньше,
    // чем кончается 6-я (18:10), и кабинет с 6-й парой в начале 7-й не свободен
    const over = (c, b) => b ? state.lessons.filter((l) => l.date === iso && l.cabinet?.id_1c === c.id_1c
      && toMin(l.timeStart) < toMin(b.timeEnd) && toMin(l.timeEnd) > toMin(b.timeStart)) : [];
    const isFree = (c, b) => !over(c, b).length;
    // до какого времени кабинет свободен после указанного момента
    const freeUntil = (c, fromMin) => {
      const next = state.lessons
        .filter((l) => l.date === iso && l.cabinet?.id_1c === c.id_1c && toMin(l.timeStart) >= fromMin)
        .sort((a, b) => a.timeStart.localeCompare(b.timeStart))[0];
      return next ? next.timeStart : null;
    };
    return { iso, slots, bells, floors, rooms, nowBell, pick, at, over, isFree, freeUntil };
  }

  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const findText = (lessons) => normText(lessons.map((l) => [l.group?.name, l.teacher?.name, l.subject?.name].join(" ")).join(" "));

  function bcellHTML(lessons, date, now, bell = null) {
    const l0 = lessons[0];
    const t = timing(l0, date, now);
    const subjects = subjectGroups(lessons).map(([n]) => n);
    // время колонки — самое частое в корпусе; если у этой пары своё, показываем его прямо в ячейке
    const own = timeLabel(lessons);
    const ownTime = bell && own !== bellLabel(bell) ? `<span class="bcell__time">${esc(own)}</span>` : "";
    const groups = uniq(lessons.map((l) => l.group?.name));
    const note = lessons.some((l) => l.note);
    const cls = ["bcell", t?.kind === "now" && "is-now", t?.kind === "past" && "is-past", note && "has-note"].filter(Boolean).join(" ");
    const label = `${l0.lessonNumber}-я пара, кабинет ${roomShort(l0.cabinet)}: ${subjects.join(", ")}, ${groups.join(", ")}. Подробнее`;
    return `<article class="${cls}" data-detail="${esc(lessons.map((l) => l.id).join(","))}" data-find="${esc(findText(lessons))}" tabindex="0" role="button"
        aria-label="${esc(label)}" title="${esc(`${subjects.join(" / ")}\n${groups.join(", ")}\n${uniq(lessons.map((l) => l.teacher?.name)).join(", ")}`)}"
        ${t?.kind === "now" ? `style="--progress:${t.progress}%"` : ""}>
      ${ownTime}<span class="bcell__subj">${esc(subjects[0])}${subjects.length > 1 ? ` <span class="bcell__more">+${subjects.length - 1}</span>` : ""}</span>
      <span class="bcell__meta">${btileWho(lessons)}${btileGroups(groups)}</span>
      ${note ? `<span class="lesson__note" title="Есть примечание">${ICON.alert}</span>` : ""}
    </article>`;
  }

  function buildingGridHTML(date, now, B) {
    let html = `<div class="bhead bhead--corner"><span class="bhead__in">Кабинет</span></div>`;
    for (const b of B.bells) {
      const t = timing(b, date, now);
      html += `<div class="bhead${t?.kind === "now" ? " is-now" : t?.kind === "past" ? " is-past" : ""}"${t?.kind === "now" ? ` style="--progress:${t.progress}%"` : ""}><span class="bhead__in">
        <b>${b.num} пара${t?.kind === "now" ? ' <span class="chip chip--live chip--xs">идёт</span>' : ""}</b>
        <span>${esc(bellLabel(b))}</span></span></div>`;
    }
    for (const [floor, rooms] of B.floors) {
      const freeNow = B.nowBell ? rooms.filter((c) => B.isFree(c, B.nowBell)).length : null;
      html += `<div class="bfloor" data-floor="${floor}">
        <div class="bfloor__label">${esc(FLOOR_LABEL(floor))}<em>${rooms.length} каб.${freeNow !== null ? ` · свободно сейчас ${freeNow}` : ""}</em></div>`;
      for (const c of rooms) {
        const count = B.bells.filter((b) => B.at(c, b.num)).length;
        const freeNowRoom = B.nowBell && B.isFree(c, B.nowBell);
        html += `<div class="broom${freeNowRoom ? " is-free" : ""}"><button data-room="${esc(c.id_1c)}" data-room-title="${esc(roomShort(c))}" title="Расписание кабинета ${esc(roomShort(c))}">
          <b>${esc(roomShort(c))}</b><span>${count ? `${count} ${plural(count, ["пара", "пары", "пар"])}` : "свободен весь день"}</span></button></div>`;
        for (const b of B.bells) {
          const lessons = B.at(c, b.num);
          if (lessons) { html += bcellHTML(lessons, date, now, b); continue; }
          const t = timing(b, date, now);
          // номер этой пары свободен, но кабинет ещё занят предыдущей, которая заходит на её время
          const tail = B.over(c, b);
          if (tail.length) {
            const end = tail.map((l) => l.timeEnd).sort().at(-1);
            html += `<div class="bfree is-tail${t?.kind === "now" ? " is-now" : t?.kind === "past" ? " is-past" : ""}" title="Занят до ${esc(end)}">Занят до ${esc(end)}</div>`;
            continue;
          }
          const until = B.freeUntil(c, toMin(b.timeEnd));
          const text = `Свободен${until ? ` до ${until}` : ""}`;
          html += `<div class="bfree${t?.kind === "now" ? " is-now" : t?.kind === "past" ? " is-past" : ""}" title="${esc(text)}">${t?.kind === "now" ? esc(text) : "Свободен"}</div>`;
        }
      }
      html += `</div>`;
    }
    return `<div class="bscroll"><div class="bgrid" style="--cols:${B.bells.length}">${B.nowBell ? '<div class="bcol-now" aria-hidden="true"></div>' : ""}${html}</div></div>`;
  }

  function pairPickerHTML(date, now, B) {
    return `<div class="bpairs" role="tablist" aria-label="Пара">${B.bells.map((b) => {
      const isNow = timing(b, date, now)?.kind === "now", on = b.num === B.pick?.num;
      return `<button class="bpair${on ? " is-active" : ""}" data-bpair="${b.num}" role="tab" aria-selected="${on}">
        <b>${b.num}<span class="bpair__long"> пара</span>${isNow ? '<i class="bpair__dot" title="Идёт сейчас"></i>' : ""}</b>
        <span>${esc(bellLabel(b))}</span></button>`;
    }).join("")}</div>`;
  }

  // преподаватель плитки: фото и «Фамилия И.О.», по строке на каждого
  function btileWho(lessons) {
    const ts = [...new Map(lessons.filter((l) => l.teacher?.name).map((l) => [l.teacher.name, l.teacher])).values()];
    if (!ts.length) return "";
    return ts.map((t) => `<span class="btile__who">${isVacancy(t) ? "" : avatarHTML(t.name, "avatar avatar--xs")}<span>${esc(teacherLabel(t))}</span></span>`).join("");
  }

  // группа как в парах: значок кафедры и номер
  const btileGroups = (groups) => `<span class="btile__grps">${groups.filter(Boolean).map((g) => { const p = groupParts(g); return `<span class="btile__grp" title="${esc(g)}"><span class="sg sg--tag">${esc(p.mark)}</span><span>${esc(p.rest)}</span></span>`; }).join("")}</span>`;

  // разделитель «·» между группами нужен только внутри строки: у последней группы строки перед переносом он убирается
  function trimGroupSeparators() {
    $$("#week .btile__grps").forEach((box) => {
      const items = [...box.children];
      items.forEach((el, i) => el.classList.toggle("no-sep", i < items.length - 1 && items[i + 1].offsetTop > el.offsetTop + 2));
    });
  }

  // плашка идущей пары позади сетки: по ширине колонки заголовка, с небольшим выступом по бокам
  function placeNowColumn() {
    const col = $("#week .bcol-now"), head = $("#week .bhead.is-now");
    if (!col || !head) return;
    col.style.left = `${head.offsetLeft - 3}px`;
    col.style.width = `${head.offsetWidth + 6}px`;
  }

  function buildingFreeHTML(date, now, B) {
    if (!B.pick) return "";
    let html = "";
    for (const [floor, rooms] of B.floors) {
      const free = rooms.filter((c) => B.isFree(c, B.pick));
      html += `<div class="bboard__floor"><b>${esc(FLOOR_LABEL(floor))}</b><span>свободно ${free.length} из ${rooms.length}</span></div><div class="btiles">`;
      for (const c of [...free, ...rooms.filter((c) => !free.includes(c))]) {
        const lessons = B.at(c, B.pick.num) || B.over(c, B.pick);
        if (!lessons.length) {
          const until = B.freeUntil(c, toMin(B.pick.timeEnd));
          html += `<button class="btile is-free" data-room="${esc(c.id_1c)}" data-room-title="${esc(roomShort(c))}" title="Расписание кабинета ${esc(roomShort(c))}">
            <span class="btile__top"><span class="btile__num">${esc(roomShort(c))}</span>${ICON.door}</span>
            <span class="btile__body">Свободен</span><span class="btile__foot">${until ? `${esc(B.pick.timeStart)} – ${esc(until)}` : `с ${esc(B.pick.timeStart)} до конца дня`}</span></button>`;
          continue;
        }
        const groups = uniq(lessons.map((l) => l.group?.name));
        html += `<article class="btile" data-detail="${esc(lessons.map((l) => l.id).join(","))}" tabindex="0" role="button">
          <span class="btile__top"><span class="btile__num">${esc(roomShort(c))}</span></span>
          <span class="btile__body">${esc(subjectGroups(lessons).map(([n]) => n).join(" / "))}</span>
          <span class="btile__foot">${btileWho(lessons)}
            ${btileGroups(groups)}
            <span class="btile__until">${esc(timeLabel(lessons))}</span></span></article>`;
      }
      html += `</div>`;
    }
    return `${pairPickerHTML(date, now, B)}<div class="bscroll bboard">${html}</div>`;
  }

  // Телефон: шахматка не читается, поэтому — выбор пары и список кабинетов
  function buildingListHTML(date, now, B) {
    if (!B.pick) return "";
    const free = B.rooms.filter((c) => B.isFree(c, B.pick));
    const busy = B.rooms.filter((c) => !B.isFree(c, B.pick));
    const isNow = timing(B.pick, date, now)?.kind === "now";
    let html = `<div class="bfreelist"><h4>Свободны · ${free.length}</h4><div>${free.map((c) =>
      `<button data-room="${esc(c.id_1c)}" data-room-title="${esc(roomShort(c))}">${esc(roomShort(c))}</button>`).join("") || "<span>Свободных кабинетов нет</span>"}</div></div>`;
    html += `<div class="list-sep" aria-hidden="true"><span>Заняты · ${busy.length}</span></div>`;
    html += busy.map((c) => {
      const lessons = B.at(c, B.pick.num) || B.over(c, B.pick);
      return `<article class="brow${isNow ? " is-now" : ""}" data-detail="${esc(lessons.map((l) => l.id).join(","))}" tabindex="0" role="button">
        <span class="brow__num">${esc(roomShort(c))}</span>
        <span class="brow__text"><b>${esc(subjectGroups(lessons).map(([n]) => n).join(" / "))}</b>
        <span class="brow__meta">${btileWho(lessons)}<span class="brow__row">${btileGroups(uniq(lessons.map((l) => l.group?.name)))}<span class="btile__until">${esc(timeLabel(lessons))}</span></span></span></span></article>`;
    }).join("");
    return `${pairPickerHTML(date, now, B)}<div class="bscroll blist">${html}</div>`;
  }

  // сводка: нагруженность на выбранной паре — идущей сейчас, иначе ближайшей (или выбранной вручную)
  function buildingSummaryHTML(date, now, B) {
    if (!B.bells.length) return `<span class="bsummary__text">Пар нет</span>`;
    const today = isoDate(date) === isoDate(now);
    if (today && nowMin(now) > toMin(B.bells.at(-1).timeEnd)) return `<span class="bsummary__text">Пары на сегодня закончились</span>`;
    const p = B.pick;
    if (!p) return "";
    const free = B.rooms.filter((c) => B.isFree(c, p)).length;
    const t = timing(p, date, now);
    let lead;
    if (t?.kind === "now") lead = `<span class="chip chip--live">${p.num} пара · ещё ${fmtDuration(toMin(p.timeEnd) - nowMin(now))}</span>`;
    else if (today && t?.kind === "soon" && state.building.pair === null) lead = `<span class="bsummary__text">Следующая · ${p.num} пара в ${esc(p.timeStart)}</span>`;
    else lead = `<span class="bsummary__text">${p.num} пара · ${esc(bellLabel(p))}</span>`;
    return `${lead}<span class="chip chip--free">Свободно ${free} из ${B.rooms.length}</span>`;
  }

  function buildingHTML(days, now) {
    const date = days[state.dayIndex];
    const B = buildingDay(date, now);
    const narrow = narrowMQ.matches;
    const view = state.building.view;
    const tools = view === "all" && !narrow ? `
      <label class="bfind">${ICON.search}<input id="bfind" type="search" placeholder="Найти группу или преподавателя" value="${esc(state.building.find)}" autocomplete="off" spellcheck="false" aria-label="Подсветить группу или преподавателя"><button type="button" class="bfind__clear" id="bfindClear" aria-label="Очистить поиск"${state.building.find ? "" : " hidden"}><svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></label>
      <div class="bchips" role="group" aria-label="Этаж">${[["all", "Все"], ...B.floors.map(([f]) => [f, FLOOR_SHORT(f)])].map(([v, t]) =>
        `<button class="bchip${state.building.floor === v ? " is-active" : ""}" data-bfloor="${v}" aria-pressed="${state.building.floor === v}">${esc(t)}</button>`).join("")}</div>
      <button class="bchip bchip--free" data-bonly-free aria-pressed="${state.building.onlyFree}">${ICON.door}Только свободные</button>` : "";

    let body;
    if (!B.bells.length) body = stateHTML("free", "day");
    else if (view === "free") body = buildingFreeHTML(date, now, B);
    else body = narrow ? buildingListHTML(date, now, B) : buildingGridHTML(date, now, B);

    return `<div class="bview">
      <div class="bbar">
        ${stripHTML(days, now, "bar")}
        <div class="bsummary">${buildingSummaryHTML(date, now, B)}</div>
        <div class="bbar__tools">
          ${tools}
          <div class="bswitch" role="tablist" aria-label="Вид">
            <button class="${view === "all" ? "is-active" : ""}" data-bview="all" role="tab" aria-selected="${view === "all"}">Все кабинеты</button>
            <button class="${view === "free" ? "is-active" : ""}" data-bview="free" role="tab" aria-selected="${view === "free"}">Свободные</button>
          </div>
        </div>
      </div>
      ${body}
    </div>`;
  }

  // Фильтры шахматки применяем к готовому DOM: поиск печатается без перерисовки и потери фокуса
  function applyBuildingFilters() {
    const grid = $("#week .bgrid");
    if (!grid) return;
    const { find, floor, onlyFree } = state.building;
    const needle = normText(find.trim());
    // гибкий поиск: «ис 24 9 2», «ис24/9-2» и «ис-24/9-2» — одно и то же. Если такой группы нет, ищем по словам вразнобой («мандзюк ис»)
    const squash = (s) => s.replace(/[^a-zа-я0-9]+/g, "");
    const words = needle.split(/\s+/).filter(Boolean);
    const ordered = (hay) => hay.includes(needle) || squash(hay).includes(squash(needle));
    const anyWords = (hay) => words.every((w) => hay.includes(w) || squash(hay).includes(squash(w)));
    const cells = $$(".bcell", grid);
    const matches = cells.some((c) => ordered(c.dataset.find)) ? ordered : anyWords;
    grid.classList.toggle("is-finding", !!needle);
    grid.classList.toggle("only-free", onlyFree);
    $$(".bfloor", grid).forEach((f) => { f.hidden = floor !== "all" && f.dataset.floor !== floor; });
    cells.forEach((c) => c.classList.toggle("is-hit", !!needle && matches(c.dataset.find)));
  }

  // ---------- Шапка: подпись периода ----------
  function weekRangeLabel(days) {
    const a = days[0], b = days[5];
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]}`
      : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`;
  }
  function weekRelLabel(offset) {
    if (offset === 0) return "Эта неделя";
    if (offset === 1) return "Следующая неделя";
    if (offset === -1) return "Прошлая неделя";
    const n = Math.abs(offset);
    return offset > 0 ? `Через ${n} ${plural(n, ["неделю", "недели", "недель"])}` : `${n} ${plural(n, ["неделю", "недели", "недель"])} назад`;
  }

  function renderPeriod(days, now) {
    const label = $("#periodLabel"), sub = $("#periodSub");
    if (!days) { label.textContent = "—"; sub.textContent = weekRelLabel(state.weekOffset); return; }
    if (dayNav() && state.dayIndex != null) {
      const d = days[state.dayIndex];
      const diff = dayDiff(d, now);
      label.textContent = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
      sub.textContent = { 0: "Сегодня", 1: "Завтра", [-1]: "Вчера" }[diff] || weekRelLabel(state.weekOffset);
    } else {
      label.textContent = weekRangeLabel(days);
      sub.textContent = weekRelLabel(state.weekOffset);
    }
  }

  function renderTodayBtn() {
    const todayIdx = state.week ? weekDates().findIndex((d) => isoDate(d) === isoDate(new Date())) : -1;
    const onToday = state.weekOffset === 0 && (!dayNav() || state.dayIndex === todayIdx || todayIdx < 0);
    $("#todayBtn").disabled = onToday;
    const box = $("#periodBox");
    box.classList.toggle("is-away", !onToday);
    if (onToday) box.removeAttribute("role"); else box.setAttribute("role", "button");
  }

  // ---------- Рендер расписания ----------
  let navDir = 0; // направление последнего перехода — для анимации появления
  // Неделю колледж выкладывает по корпусам, не разом: пока у корпуса нет ни одной пары, его расписание не опубликовано,
  // и пустую неделю нельзя показывать как «пар нет, можно выдохнуть»
  const weekPublished = () => !!state.week && (state.lessons.length > 0 || !state.divisionLoaded || state.divisionLessons.length > 0);

  // Листаем по дням: режим «День» и «Весь корпус» (неделя всех кабинетов разом не читается)
  const dayNav = () => !isProfile() && (state.view === "day" || isBuilding()); // профиль — сводка недели, листается по неделям

  function renderWeek({ keepScroll = false } = {}) {
    const week = $("#week");
    const scroll = [week.scrollLeft, week.scrollTop];
    week.removeAttribute("data-anim");
    week.style.gridTemplateColumns = "";
    $("#headStrip").hidden = true;
    // с данными корпуса дни и недели переключаются своими элементами, пейджер не нужен; в состояниях «загрузка / не опубликовано» он остаётся
    $("#app").classList.remove("is-building");
    renderTodayBtn();

    const now = new Date();
    if (isProfile()) { renderProfilePage(now, keepScroll ? scroll : null); return; }
    const isDay = state.view === "day" && !isBuilding();

    // Состояния без расписания: загрузка, ошибка, «не опубликовано». В режиме «День» остаются шапка и полоска дней.
    const kind = state.error ? "error" : state.loadingWeek ? "loading" : !weekPublished() ? "unpublished" : null;
    if (kind) {
      const days = placeholderDays();
      if (dayNav() && state.dayIndex == null) {
        const t = days.findIndex((d) => isoDate(d) === isoDate(now));
        state.dayIndex = t >= 0 ? t : 0;
      }
      if (!state.error) renderPeriod(days, now);
      if (isDay) {
        week.className = `week is-day${kind === "loading" ? " is-loading" : ""}`;
        week.innerHTML = dayViewHTML(days, now, kind);
      } else {
        week.className = `week is-msg${kind === "loading" ? " is-loading" : ""}`;
        week.innerHTML = stateHTML(kind, "week");
      }
      return;
    }

    const days = weekDates();
    if (dayNav() && state.dayIndex == null) {
      const t = days.findIndex((d) => isoDate(d) === isoDate(now));
      state.dayIndex = t >= 0 ? t : 0;
    }
    renderPeriod(days, now);
    renderTodayBtn();

    if (isBuilding() && state.lessons.length) {
      // сохраняем прокрутку шахматки и фокус в поиске: раз в минуту экран перерисовывается
      const prev = week.querySelector(".bscroll");
      const inner = prev ? [prev.scrollLeft, prev.scrollTop] : null;
      const findFocus = document.activeElement?.id === "bfind" ? document.activeElement.selectionStart : null;
      week.className = "week is-building";
      week.innerHTML = buildingHTML(days, now);
      // на десктопе дни выбираются в шапке, на месте пейджера; на телефоне полоса остаётся внизу экрана
      $("#app").classList.add("is-building");
      const headStrip = $("#headStrip");
      headStrip.hidden = mobileMQ.matches;
      headStrip.innerHTML = mobileMQ.matches ? "" : `<button class="head-strip__arrow" data-week-step="-1" aria-label="Предыдущая неделя" title="Предыдущая неделя"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>${stripHTML(days, now, "bar")}<button class="head-strip__arrow" data-week-step="1" aria-label="Следующая неделя" title="Следующая неделя"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
      applyBuildingFilters();
      trimGroupSeparators();
      placeNowColumn();
      // выбранная пара должна быть видна в горизонтальной ленте пар
      const bp = week.querySelector(".bpair.is-active");
      if (bp) { const strip = bp.parentElement; strip.scrollLeft = bp.offsetLeft - (strip.clientWidth - bp.offsetWidth) / 2; }
      const sc = week.querySelector(".bscroll");
      if (sc && keepScroll && inner) [sc.scrollLeft, sc.scrollTop] = inner;
      else if (sc) {
        // к идущей паре, если её колонка за правым краем
        const col = sc.querySelector(".bhead.is-now");
        const corner = sc.querySelector(".bhead--corner");
        if (col && corner) {
          const left = col.getBoundingClientRect().left - sc.getBoundingClientRect().left;
          if (left + col.offsetWidth > sc.clientWidth) sc.scrollLeft = left - corner.offsetWidth - 8;
        }
      }
      if (findFocus !== null) { const inp = $("#bfind"); inp.focus(); inp.setSelectionRange(findFocus, findFocus); }
      if (navDir) { void week.offsetWidth; week.dataset.anim = navDir > 0 ? "next" : "prev"; navDir = 0; }
      return;
    }

    if (!state.lessons.length && !isDay) {
      week.className = "week is-msg";
      week.innerHTML = stateHTML("free", "week");
    } else if (isDay) {
      week.className = "week is-day";
      week.innerHTML = dayViewHTML(days, now);
    } else {
      week.className = "week";
      week.innerHTML = days.map((d, i) => dayColumnHTML(d, i, now)).join("");
      // колонка с чипом («Идёт · ещё N мин», «Через N мин») ровно настолько шире остальных, чтобы шапка пары не ломалась
      const dayEls = [...week.querySelectorAll(":scope > .day")];
      const base = parseFloat(getComputedStyle(week).getPropertyValue("--day-w")) || 220;
      const widths = dayEls.map((d) => {
        let need = 0;
        d.querySelectorAll(".lesson__meta").forEach((m) => {
          if (!m.querySelector(".chip")) return;
          const extra = d.offsetWidth - m.offsetWidth;
          m.style.width = "max-content";
          need = Math.max(need, Math.ceil(m.offsetWidth + extra) + 2);
          m.style.width = "";
        });
        return need;
      });
      if (widths.some((w) => w > base)) week.style.gridTemplateColumns = widths.map((w) => w > base ? `${Math.min(w, 360)}px` : "minmax(var(--day-w), 320px)").join(" ");
    }

    if (navDir) { void week.offsetWidth; week.dataset.anim = navDir > 0 ? "next" : "prev"; navDir = 0; }
    if (keepScroll) [week.scrollLeft, week.scrollTop] = scroll;
    else scrollToToday();
    fitTitles();
  }

  // Название пары по умолчанию — максимум 2 строки. Если карточка растянута строкой сетки
  // и под названием есть свободное место, показываем столько лишних строк, сколько влезает.
  function fitTitles() {
    const titles = $$("#week .day .lesson__title");
    titles.forEach((t) => t.style.removeProperty("--clamp"));
    const plan = titles.map((t) => {
      const parts = t.parentElement.querySelector(".parts");
      if (!parts) return null;
      const lh = parseFloat(getComputedStyle(t).lineHeight);
      const gap = parseFloat(getComputedStyle(t.parentElement).rowGap) || 0;
      const free = parts.getBoundingClientRect().top - t.getBoundingClientRect().bottom - gap;
      return lh > 0 && free >= lh ? 2 + Math.floor((free + 0.5) / lh) : null;
    });
    titles.forEach((t, i) => { if (plan[i]) t.style.setProperty("--clamp", plan[i]); });
  }
  let fitFrame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => { if ($("#week").querySelector(".day .lesson")) fitTitles(); });
  }).observe($("#week"));
  document.fonts?.ready.then(() => fitTitles());

  // В режиме недели прокручиваем к сегодняшнему дню, если он за пределами экрана
  function scrollToToday() {
    const week = $("#week");
    week.scrollLeft = 0; week.scrollTop = 0;
    const today = week.querySelector(".day.is-today");
    if (state.view !== "week" || !today) return;
    // положение колонки внутри прокручиваемой области (offsetLeft считается от body и включает ширину сайдбара)
    const left = today.getBoundingClientRect().left - week.getBoundingClientRect().left;
    if (left + today.offsetWidth > week.clientWidth) week.scrollLeft = left - 8;
  }

  function renderHeader() {
    const title = selectedTitle();
    $("#entityKind").textContent = KIND_LABEL[state.selected.kind];
    $("#entityName").textContent = title || "…";
    document.title = title ? `${title} — Мой Сиелом` : "Мой Сиелом — Расписание";
  }

  function renderChrome() {
    $$(".tabs__btn").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.tab === state.tab);
      b.setAttribute("aria-selected", b.dataset.tab === state.tab);
    });
    $$("#viewSwitch .segmented__btn").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.view === state.view);
      b.setAttribute("aria-selected", b.dataset.view === state.view);
    });
    $("#sidebar").dataset.side = state.sideTab;
    $$("#sideTabs .segmented__btn").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.side === state.sideTab);
      b.setAttribute("aria-selected", b.dataset.side === state.sideTab);
    });
    // у «Всего корпуса» свой переключатель вида внутри экрана, а листается он по дням
    $("#viewSwitch").hidden = isBuilding() || isProfile();
    $$(".segmented").forEach(syncThumb);
    $("#prevWeek").setAttribute("aria-label", dayNav() ? "Предыдущий день" : "Предыдущая неделя");
    $("#nextWeek").setAttribute("aria-label", dayNav() ? "Следующий день" : "Следующая неделя");
    renderHeader();
    renderMine();
    renderCrumb();
    renderList();
  }

  // ---------- Данные ----------
  // Звонки для пустых слотов («окно», сетка недели). В корпусе одновременно живут несколько сеток звонков:
  // пары по 80 мин, по 60 мин (в понедельник весь день), сдвинутая на 10–20 мин. Время «любой» пары с этим номером
  // бывает чужим, поэтому берём: время из самих пар расписания, а для остальных номеров — время из сетки,
  // по которой учатся группы, чьи пары совпадают с выбранными. Нет совпадений (корпус целиком, пустой день) —
  // самое частое время в корпусе. Считается и для недели целиком, и отдельно для каждого дня.
  function gridTimes(own, division) {
    const key = (l) => `${l.lessonNumber}|${l.timeStart}-${l.timeEnd}`;
    const modeOf = (lessons) => {
      const byNum = new Map();
      for (const l of lessons) {
        if (!byNum.has(l.lessonNumber)) byNum.set(l.lessonNumber, new Map());
        const c = byNum.get(l.lessonNumber), t = `${l.timeStart}|${l.timeEnd}`;
        c.set(t, (c.get(t) || 0) + 1);
      }
      return new Map([...byNum].map(([n, c]) => {
        const [timeStart, timeEnd] = [...c].sort((x, y) => y[1] - x[1])[0][0].split("|");
        return [n, { timeStart, timeEnd }];
      }));
    };
    const ownKeys = new Set(own.map(key));
    const groups = new Map();
    for (const l of division) {
      const g = l.group?.id_1c || l.group?.name;
      if (!g) continue;
      if (!groups.has(g)) groups.set(g, { keys: new Set(), lessons: [] });
      const e = groups.get(g);
      e.keys.add(key(l)); e.lessons.push(l);
    }
    const scored = [...groups.values()].map((g) => ({ g, score: [...g.keys].filter((k) => ownKeys.has(k)).length }));
    const best = Math.max(0, ...scored.map((x) => x.score));
    const sameGrid = best ? scored.filter((x) => x.score >= Math.max(1, best / 2)).flatMap((x) => x.g.lessons) : division;
    const fromOwn = modeOf(own), fromGrid = modeOf(sameGrid), fromAll = modeOf([...own, ...division]);
    return new Map([...fromAll.keys()].map((n) => [n, fromOwn.get(n) || fromGrid.get(n) || fromAll.get(n)]));
  }

  function buildBells() {
    const own = state.lessons, division = state.divisionLessons;
    state.bells = gridTimes(own, division);
    state.lessonNums = [...state.bells.keys()].sort((a, b) => a - b);
    state.breaks = computeBreaks([...own, ...division]);
    // у каждого дня своя сетка (понедельник короче остальных), поэтому «окна» подписываем временем этого дня
    state.bellsByDay = new Map();
    for (const iso of new Set([...own, ...division].map((l) => l.date))) {
      state.bellsByDay.set(iso, gridTimes(own.filter((l) => l.date === iso), division.filter((l) => l.date === iso)));
    }
  }
  const bellAt = (iso, num) => state.bellsByDay?.get(iso)?.get(num) || state.bells.get(num);

  // Типичный перерыв после каждой пары: для каждого корпуса берём самое частое время пары,
  // считаем разрыв до следующей и берём медиану по корпусам (в разных корпусах пары идут в разное время)
  function computeBreaks(lessons) {
    const byDiv = new Map();
    for (const l of lessons) {
      const div = l.division?.name || "";
      if (!byDiv.has(div)) byDiv.set(div, new Map());
      const byNum = byDiv.get(div);
      if (!byNum.has(l.lessonNumber)) byNum.set(l.lessonNumber, new Map());
      const counts = byNum.get(l.lessonNumber), t = `${l.timeStart}-${l.timeEnd}`;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    const top = (counts) => [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split("-");
    const gaps = new Map();
    for (const byNum of byDiv.values()) {
      for (const n of byNum.keys()) {
        if (!byNum.has(n + 1)) continue;
        const g = toMin(top(byNum.get(n + 1))[0]) - toMin(top(byNum.get(n))[1]);
        if (!gaps.has(n)) gaps.set(n, []);
        gaps.get(n).push(g);
      }
    }
    const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    return new Map([...gaps].map(([n, a]) => [n, median(a)]));
  }

  // Перерыв между парами prev и num (мин) в указанный день: по звонкам этого дня, а если их нет — по типичному перерыву
  function gapBetween(prev, num, iso) {
    const a = iso ? bellAt(iso, prev) : state.bells.get(prev), b = iso ? bellAt(iso, num) : state.bells.get(num);
    if (a && b) return toMin(b.timeStart) - toMin(a.timeEnd);
    return num === prev + 1 ? state.breaks.get(prev) ?? 0 : 0;
  }
  // Строка «длинный перерыв» общая для всех дней недели (сетка выравнивается по ней): нужна, если хотя бы в один день перерыв не короче LONG_BREAK
  const breakRow = (prev, num, days) => days.some((d) => gapBetween(prev, num, isoDate(d)) >= LONG_BREAK);
  // По времени из API следующая пара может начинаться раньше, чем кончается предыдущая (в корпусе №1 6-я до 18:10, 7-я с 18:00) —
  // так и пишем, а не «перерыв −10 мин»
  const breakDividerHTML = (min) => `<div class="shift-divider${min < 0 ? " is-overlap" : ""}" role="separator">${min > 0 ? `Перерыв ${fmtDuration(min)}` : min < 0 ? `Пары пересекаются на ${fmtDuration(-min)}` : "Без перерыва"}</div>`;

  let weekToken = 0;
  async function refreshWeek() {
    const token = ++weekToken;
    state.loadingWeek = true; state.error = null;
    renderWeek();
    try {
      const week = await loadWeek(state.weekOffset);
      if (token !== weekToken) return;
      state.week = week;
      const divName = divisionFullName(divisionById(state.selected.divisionId));
      // на странице профиля — своё расписание и, у куратора, расписания его групп
      const sel = isProfile() ? profileHome() : state.selected;
      const [lessons, curated] = await Promise.all([
        week && sel ? loadLessonsFor(sel, week, divName) : [],
        week && isProfile() && profile.role === "teacher"
          ? Promise.all(profile.curated.map((g) => apiFetch(`${API}/lessons/group/${q(g.id)}?week_id=${week.id}`).then((l) => [g.id, l]).catch(() => [g.id, []])))
          : [],
      ]);
      if (token !== weekToken) return;
      state.lessons = lessons;
      state.curatedLessons = new Map(curated);
      await refreshDivisionLessons(token);
      buildBells();
      if (state.query.trim()) ensureSearchIndex();
    } catch (e) {
      if (token !== weekToken) return;
      state.error = e;
    }
    state.loadingWeek = false;
    renderChrome();
    renderWeek();
  }

  async function refreshDivisionLessons(token) {
    state.divisionLoaded = false;
    state.divisionLessons = [];
    const d = divisionById(state.divisionId);
    if (!d || !state.week) { state.divisionLoaded = true; return; }
    const lessons = await apiFetch(`${API}/lessons/division?divisionName=${q(d.name)}&week_id=${state.week.id}`);
    if (token !== undefined && token !== weekToken) return;
    state.divisionLessons = lessons;
    for (const l of lessons) {
      if (l.cabinet && !state.cabinets.has(l.cabinet.id_1c))
        state.cabinets.set(l.cabinet.id_1c, { ...l.cabinet, divisionId: state.divisionId });
    }
    state.divisionLoaded = true;
  }

  async function reloadList() {
    const token = weekToken;
    renderChrome();
    try { await refreshDivisionLessons(token); } catch (e) { state.error = e; }
    renderChrome();
  }

  // ---------- Обработчики ----------
  function setSideTab(side) {
    state.sideTab = side;
    store.set("sielom.sideTab", side);
    if (side === "mine" && state.query) clearSearch();
    renderChrome();
  }
  $$("#sideTabs .segmented__btn").forEach((b) => b.addEventListener("click", () => { if (b.dataset.side !== state.sideTab) setSideTab(b.dataset.side); }));

  $$(".tabs__btn").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.tab === state.tab) return;
    state.tab = b.dataset.tab;
    state.courseFilter = null;
    reloadList();
  }));

  $$("#viewSwitch .segmented__btn").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.view === state.view) return;
    state.view = b.dataset.view;
    store.set("sielom.view", state.view);
    if (state.view === "week") state.dayIndex = null;
    renderChrome(); renderWeek();
  }));

  function step(dir) {
    navDir = dir;
    if (dayNav() && state.week) {
      state.dayIndex += dir;
      if (state.dayIndex < 0) { state.weekOffset--; state.dayIndex = 5; }
      else if (state.dayIndex > 5) { state.weekOffset++; state.dayIndex = 0; }
      else { renderWeek(); return; }
    } else {
      state.weekOffset += dir;
    }
    refreshWeek();
  }
  $("#prevWeek").addEventListener("click", () => step(-1));
  $("#nextWeek").addEventListener("click", () => step(1));

  function goToday() {
    const sameWeek = state.weekOffset === 0;
    navDir = Math.sign(-state.weekOffset);
    state.weekOffset = 0; state.dayIndex = null;
    sameWeek ? renderWeek() : refreshWeek();
  }
  $("#todayBtn").addEventListener("click", goToday);
  $("#periodBox").addEventListener("click", () => { if (mobileMQ.matches && $("#periodBox").classList.contains("is-away")) goToday(); });

  // Горячие клавиши: ← / → листают, T — сегодня, / — поиск
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || $("dialog[open]")) return;
    if (e.target.closest("input, textarea")) return;
    if (e.code === "KeyM") { openMe(); return; }
    if (e.code === "Slash") {
      e.preventDefault();
      if (state.sideTab !== "all") setSideTab("all");
      if (mobileMQ.matches) setDrawer(true);
      $("#search").focus();
      return;
    }
    if (e.code === "KeyT") { goToday(); return; }
    if (e.code === "KeyD") { cycleTheme(); return; }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.target.closest("[role=tablist]")) return;
    step(e.key === "ArrowLeft" ? -1 : 1);
  });

  $("#search").addEventListener("input", (e) => {
    state.query = e.target.value;
    $("#searchClear").hidden = !e.target.value;
    if (state.query.trim()) ensureSearchIndex();
    renderList();
  });
  $("#search").addEventListener("focus", () => ensureSearchIndex());
  $("#search").addEventListener("keydown", (e) => {
    if (e.key === "Escape" && e.target.value) { e.stopPropagation(); clearSearch(); renderList(); return; }
    // Enter — открыть первый результат, ↓ — перейти к списку
    const first = $("#list .entity");
    if (e.key === "Enter" && first && state.query.trim()) { e.preventDefault(); first.click(); }
    else if (e.key === "ArrowDown" && first) { e.preventDefault(); first.focus(); }
  });
  $("#searchClear").addEventListener("click", (e) => {
    e.preventDefault();
    clearSearch();
    renderList();
    $("#search").focus();
  });

  function clearSearch() {
    state.query = ""; $("#search").value = ""; $("#searchClear").hidden = true;
  }

  $("#crumbBack").addEventListener("click", () => {
    if (state.tab === "group" && state.divisionId && state.courseFilter !== null) {
      state.courseFilter = null;
    } else {
      state.divisionId = null; state.courseFilter = null;
    }
    clearSearch();
    renderChrome();
  });

  $("#crumb").addEventListener("click", (e) => {
    const btn = e.target.closest(".crumb__btn");
    if (!btn) return;
    if (btn.dataset.crumb === "toCourses") {
      state.courseFilter = null;
    } else {
      state.divisionId = null; state.courseFilter = null;
    }
    clearSearch();
    renderChrome();
  });

  // ---------- Тема: системная → светлая → тёмная ----------
  const THEMES = ["system", "light", "dark"];
  const THEME_LABEL = { system: "Системная", light: "Светлая", dark: "Тёмная" };
  let theme = THEMES.includes(store.get("sielom.theme", "system")) ? store.get("sielom.theme", "system") : "system";

  function applyTheme() {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    $("#themeValue").textContent = THEME_LABEL[theme];
  }
  function cycleTheme() {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    store.set("sielom.theme", theme);
    applyTheme();
  }
  $("#themeBtn").addEventListener("click", cycleTheme);
  applyTheme();

  const mobileMQ = matchMedia("(max-width: 900px)");

  // На узких экранах панель выезжает поверх расписания
  function setDrawer(open) {
    $("#app").classList.toggle("is-drawer-open", open);
    $("#sidebarToggle").setAttribute("aria-expanded", open);
    syncSidebarToggle();
  }
  // Подпись кнопки в шапке по состоянию панели (иконка меняется стилями)
  function syncSidebarToggle() {
    const app = $("#app");
    const open = matchMedia("(max-width: 900px)").matches ? app.classList.contains("is-drawer-open") : !app.classList.contains("is-collapsed");
    const label = open ? "Свернуть панель" : "Открыть панель";
    const btn = $("#sidebarToggle");
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }
  $("#drawerBackdrop").addEventListener("click", () => setDrawer(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("#app").classList.contains("is-drawer-open")) setDrawer(false);
  });
  mobileMQ.addEventListener("change", () => setDrawer(false));
  syncSidebarToggle();

  let _sidebarTimer = null;
  $("#sidebarClose").addEventListener("click", () => $("#sidebarToggle").click());
  $("#sidebarToggle").addEventListener("click", () => {
    const app = $("#app");
    if (mobileMQ.matches) { setDrawer(!app.classList.contains("is-drawer-open")); return; }
    const sidebar = app.querySelector(".sidebar");
    clearTimeout(_sidebarTimer);
    sidebar.classList.remove("sidebar--expanding", "sidebar--collapsing");

    if (app.classList.contains("is-collapsed")) {
      // Expand: снимаем is-collapsed (грид растёт), сразу анимируем элементы внутрь
      app.classList.remove("is-collapsed");
      void sidebar.offsetWidth;
      sidebar.classList.add("sidebar--expanding");
      _sidebarTimer = setTimeout(() => sidebar.classList.remove("sidebar--expanding"), 560);
    } else {
      // Collapse: грид и анимация стартуют одновременно
      sidebar.classList.add("sidebar--collapsing");
      app.classList.add("is-collapsed");
      _sidebarTimer = setTimeout(() => sidebar.classList.remove("sidebar--collapsing"), 400);
    }
    syncSidebarToggle();
  });

  $("#list").addEventListener("click", (e) => {
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      const key = favBtn.dataset.fav;
      state.favourites.has(key) ? state.favourites.delete(key) : state.favourites.add(key);
      store.set("sielom.favourites.v2", [...state.favourites]);
      renderList();
      return;
    }

    const item = e.target.closest(".entity");
    if (!item) return;
    const type = item.dataset.type;

    if (type === "division") {
      state.divisionId = item.dataset.id; state.courseFilter = null;
      clearSearch();
      if (state.tab !== "group") reloadList();
      else renderChrome();
      return;
    }

    if (type === "course") {
      state.courseFilter = item.dataset.id;
      clearSearch();
      renderChrome();
      return;
    }

    const selDivId = item.dataset.divisionId || state.divisionId;
    if (item.dataset.divisionId) {
      // результат поиска или избранное: сайдбар переходит к месту выбранного элемента
      state.divisionId = item.dataset.divisionId;
      state.tab = type === "building" ? "room" : type;
      state.courseFilter = type === "group" ? (item.dataset.course ?? state.courseFilter) : null;
    }
    if (state.query) clearSearch();
    state.selected = { kind: type, id: item.dataset.id, title: item.dataset.title, divisionId: selDivId };
    store.set("sielom.selection", state.selected);
    setDrawer(false);
    refreshWeek();
  });

  $("#list").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("entity")) { e.preventDefault(); e.target.click(); }
  });

  $("#week").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-detail]")) { e.preventDefault(); e.target.click(); }
  });

  // Поиск по шахматке: подсвечиваем пары группы или преподавателя и прокручиваем к первой
  $("#week").addEventListener("input", (e) => {
    if (e.target.id !== "bfind") return;
    state.building.find = e.target.value;
    $("#bfindClear").hidden = !e.target.value;
    applyBuildingFilters();
    // прокручиваем только сетку: scrollIntoView сдвинул бы и #week вместе с панелью инструментов
    const hit = $("#week .bcell.is-hit"), sc = hit?.closest(".bscroll");
    if (!hit || !sc) return;
    const head = sc.querySelector(".bhead")?.offsetHeight || 0, side = sc.querySelector(".broom")?.offsetWidth || 0;
    const r = hit.getBoundingClientRect(), box = sc.getBoundingClientRect();
    const top = r.top - box.top, left = r.left - box.left;
    const to = { behavior: "smooth" };
    if (top < head || r.bottom > box.bottom) to.top = sc.scrollTop + top - head - (sc.clientHeight - head - r.height) / 2;
    if (left < side || r.right > box.right) to.left = sc.scrollLeft + left - side - 8;
    sc.scrollTo(to);
  });
  narrowMQ.addEventListener("change", () => { if (isBuilding() && state.week) renderWeek(); });

  function pickDay(i) {
    navDir = Math.sign(i - state.dayIndex);
    state.dayIndex = i;
    state.building.pair = null;
    renderWeek();
  }
  // «Весь корпус»: неделя целиком, день внутри неё сохраняется
  function stepWeek(dir) {
    navDir = dir;
    state.weekOffset += dir;
    state.building.pair = null;
    refreshWeek();
  }
  $("#headStrip").addEventListener("click", (e) => {
    const stepBtn = e.target.closest("[data-week-step]");
    if (stepBtn) { stepWeek(Number(stepBtn.dataset.weekStep)); return; }
    const pick = e.target.closest("[data-pick-day]");
    if (pick) pickDay(Number(pick.dataset.pickDay));
  });
  window.addEventListener("resize", () => { if (isBuilding()) { trimGroupSeparators(); placeNowColumn(); } });
  mobileMQ.addEventListener("change", () => { if (isBuilding() && state.week) renderWeek({ keepScroll: true }); });

  $("#week").addEventListener("click", (e) => {
    if (e.target.closest("#bfindClear")) {
      const inp = $("#bfind");
      inp.value = "";
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.focus();
      return;
    }
    if (e.target.closest("#retry")) { apiCache.clear(); refreshWeek(); return; }

    const openDay = e.target.closest("[data-open-day]");
    if (openDay) { state.view = "day"; state.dayIndex = Number(openDay.dataset.openDay); renderChrome(); renderWeek(); return; }

    const pick = e.target.closest("[data-pick-day]");
    if (pick) { pickDay(Number(pick.dataset.pickDay)); return; }

    // «Весь корпус»: вид, пара, этаж, «только свободные», переход к расписанию кабинета
    const bview = e.target.closest("[data-bview]");
    if (bview) {
      state.building.view = bview.dataset.bview;
      store.set("sielom.buildingView", state.building.view);
      renderWeek();
      return;
    }
    const bpair = e.target.closest("[data-bpair]");
    if (bpair) { state.building.pair = Number(bpair.dataset.bpair); renderWeek({ keepScroll: true }); return; }
    const bfloor = e.target.closest("[data-bfloor]");
    if (bfloor) {
      state.building.floor = bfloor.dataset.bfloor;
      $$("[data-bfloor]").forEach((b) => { const on = b === bfloor; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on); });
      applyBuildingFilters();
      return;
    }
    const onlyFree = e.target.closest("[data-bonly-free]");
    if (onlyFree) {
      state.building.onlyFree = !state.building.onlyFree;
      onlyFree.setAttribute("aria-pressed", state.building.onlyFree);
      applyBuildingFilters();
      return;
    }
    const room = e.target.closest("[data-room]");
    if (room) {
      state.selected = { kind: "room", id: room.dataset.room, title: room.dataset.roomTitle, divisionId: state.selected.divisionId };
      state.tab = "room";
      store.set("sielom.selection", state.selected);
      refreshWeek();
      return;
    }

    const det = e.target.closest("[data-detail]");
    if (det) {
      const ids = det.dataset.detail.split(",");
      openLesson(ids.map((id) => state.lessons.find((l) => l.id === id)).filter(Boolean));
    }
  });

  // ---------- Детали пары ----------
  function divisionInfo(div) {
    if (!div?.name) return null;
    const comma = div.name.indexOf(",");
    if (comma === -1) return { corps: div.name, address: null };
    return { corps: div.name.slice(0, comma).trim(), address: div.name.slice(comma + 1).trim() };
  }

  function placeHTML(l) {
    const div = divisionInfo(l.division);
    const addr = div?.address ? div.address.replace(/,\s*/g, " ").trim() : null;
    // в плашке — номер без буквенного префикса, полный номер («Р-213») — рядом с адресом
    const full = roomFull(l), short = full.replace(ROOM_PREFIX, "");
    const ext = externalPlace(full);
    const line = ext ? ext.address : [addr, full !== short ? full : ""].filter(Boolean).join(" · ");
    // плашка ведёт в расписание кабинета (кроме случая, когда оно уже открыто)
    const nav = l.cabinet && state.selected.kind !== "room"
      ? ` nav-item" data-nav-type="room" data-nav-id="${esc(l.cabinet.id_1c)}" data-nav-title="${esc(short)}" data-nav-division="${esc(l.division?.id_1c || "")}" tabindex="0" role="button" aria-label="Расписание кабинета ${esc(full)}`
      : "";
    return `<div class="place${l.note ? " is-changed" : ""}${nav}">
      <span class="place__room" aria-label="Кабинет ${esc(full)}">${esc(short)}</span>
      <div class="place__text">
        <span class="place__corps">${ext ? esc(ext.name) : div ? esc("Корпус " + div.corps) : "Кабинет"}</span>
        ${line ? `<span class="place__addr">${esc(line)}</span>` : ""}
      </div>
    </div>`;
  }

  function personHTML(teacher, label = "") {
    if (!teacher) return "";
    if (isVacancy(teacher)) return `<div class="person"><span class="avatar avatar--lg" aria-hidden="true">?</span><div class="person__text"><span class="person__name">Преподаватель не назначен</span><span class="person__label">В расписании колледжа — «вакансия»</span></div></div>`;
    return `<div class="person nav-item" data-nav-type="teacher" data-nav-id="${esc(teacher.name)}" data-nav-title="${esc(teacher.name)}" tabindex="0" role="button" aria-label="Расписание: ${esc(teacher.name)}">
      ${avatarHTML(teacher.name, "avatar avatar--lg")}
      <div class="person__text">
        ${label ? `<span class="person__label">${esc(label)}</span>` : ""}
        <span class="person__name">${esc(teacher.name)}</span>
      </div>
    </div>`;
  }

  const section = (title, html) => html ? `<section class="msec"><h3 class="msec__title">${esc(title)}</h3>${html}</section>` : "";

  function statusChipHTML(l0, date) {
    const now = new Date();
    const t = timing(l0, date, now);
    if (t?.kind === "now") return `<span class="chip chip--live">Идёт · осталось ${fmtDuration(t.left)}</span>`;
    if (t?.kind === "soon") return `<span class="chip chip--next">Через ${fmtDuration(t.left)}</span>`;
    if (t?.kind === "past") return '<span class="chip chip--muted">Закончилась</span>';
    const diff = dayDiff(date, now);
    if (diff === 1) return '<span class="chip">Завтра</span>';
    if (diff > 1) return `<span class="chip">Через ${diff} ${plural(diff, ["день", "дня", "дней"])}</span>`;
    return '<span class="chip chip--muted">Прошла</span>';
  }

  function groupParts(name) {
    const mark = String(name || "").match(/^[А-ЯЁA-Z]+/i)?.[0] || "";
    const rest = String(name || "").slice(mark.length).replace(/^[-\s]+/, "");
    return rest ? { mark, rest } : { mark: "•", rest: String(name || "") };
  }

  function openLesson(lessons) {
    if (!lessons || !lessons.length) return;
    const l0 = lessons[0];
    const d = parseISO(l0.date);
    const subjects = subjectGroups(lessons);
    const mixedSubjects = subjects.length > 1;
    const subject = subjects.map(([s]) => s).join(" / ");
    // у строки подгруппы — её собственный предмет, если у подгрупп они разные
    const rowSubject = (l) => mixedSubjects ? `<span class="sg-row__subject">${esc(subjectName(l))}</span>` : "";
    const multi = lessons.length > 1;
    const sameTeacher = lessons.every((l) => l.teacher?.name === l0.teacher?.name);
    const allSameGroup = lessons.every((l) => l.group?.name === l0.group?.name);
    const sameRoom = lessons.every((l) => roomOf(l) === roomOf(l0));
    const sgMark = (l) => l.subgroup || (l.group ? groupParts(l.group.name).mark : "•");
    // название группы в строке без префикса, если он уже есть в значке
    const rowName = (l) => l.subgroup || !l.group ? partLabel(l) : groupParts(l.group.name).rest;
    const partLabel = (l) => l.subgroup ? `${l.subgroup} подгруппа` : (!allSameGroup && l.group ? l.group.name : "Группа");

    $("#mHead").innerHTML = `
      <div class="modal__meta">
        <span class="meta-item">${ICON.calendar}${esc(`${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`)}</span>
        <span class="meta-item">${ICON.clock}${esc(timeLabel(lessons))}</span>
        <span class="meta-item">${esc(l0.lessonNumber)}-я пара</span>
      </div>
      <h2 class="modal__subject" id="mTitle">${esc(subject)}</h2>
      <div class="modal__sub">${statusChipHTML(l0, d)}</div>`;

    const notes = lessons.filter((l) => l.note);
    const callout = notes.length
      ? `<div class="callout callout--warn">${ICON.alert}<div>${notes.map((l) => `${multi ? `<b>${esc(partLabel(l))}:</b> ` : ""}${esc(l.note)}`).join("<br>")}</div></div>`
      : "";

    let body;
    if (!multi) {
      // Обычная пара
      const grpMeta = l0.group ? state.groups.find((g) => g.name === l0.group.name) : null;
      // Группа — той же строкой, что и в списке нескольких групп: значок, название и переход к расписанию
      const nav = grpMeta ? ` nav-item" data-nav-type="group" data-nav-id="${esc(grpMeta.id_1c)}" data-nav-title="${esc(l0.group.name)}" tabindex="0" role="button" aria-label="Расписание: ${esc(l0.group.name)}"` : `"`;
      const groupRow = l0.group ? `<div class="sg-list"><div class="sg-row${nav}>
          <span class="sg sg--lg">${esc(sgMark(l0))}</span>
          <div class="sg-row__text">
            <span class="sg-row__name">${esc(l0.subgroup ? l0.group.name : groupParts(l0.group.name).rest)}</span>
            ${l0.subgroup ? `<span class="sg-row__label">${esc(l0.subgroup)} подгруппа</span>` : ""}
          </div>
        </div></div>` : "";
      body = section("Где", placeHTML(l0))
        + section("Преподаватель", personHTML(l0.teacher))
        + (groupRow ? section("Группа", groupRow) : "");
    } else if (sameTeacher) {
      // Один преподаватель ведёт несколько подгрупп / групп
      body = (sameRoom ? section("Где", placeHTML(l0)) : "")
        + section("Преподаватель", personHTML(l0.teacher))
        + section(allSameGroup ? "Подгруппы" : "Группы", `<div class="sg-list">${lessons.map((l) => {
          const div = divisionInfo(l.division);
          const gid = l.group?.id_1c;
          const rowNav = gid ? ` nav-item" data-nav-type="group" data-nav-id="${esc(gid)}" data-nav-title="${esc(l.group.name)}" tabindex="0" role="button"` : `"`;
          return `<div class="sg-row${rowNav}>
            <span class="sg sg--lg">${esc(sgMark(l))}</span>
            <div class="sg-row__text">
              <span class="sg-row__name">${esc(rowName(l))}</span>
              ${l.subgroup && !allSameGroup && l.group ? `<span class="sg-row__label">${esc(l.group.name)}</span>` : ""}
              ${rowSubject(l)}
            </div>
            ${sameRoom ? "" : `<div class="sg-row__room"><span class="room room--lg${l.note ? " is-changed" : ""}">${esc(roomOf(l))}</span>${div ? `<span>корп. ${esc(div.corps)}</span>` : ""}</div>`}
          </div>`;
        }).join("")}</div>`);
    } else {
      // У каждой подгруппы свой преподаватель
      body = (sameRoom ? section("Где", placeHTML(l0)) : "")
        + section(allSameGroup ? "Подгруппы" : "Группы", `<div class="sg-list">${lessons.map((l) => {
          const div = divisionInfo(l.division);
          const rowNav = l.teacher && !isVacancy(l.teacher) ? ` nav-item" data-nav-type="teacher" data-nav-id="${esc(l.teacher.name)}" data-nav-title="${esc(l.teacher.name)}" tabindex="0" role="button"` : `"`;
          return `<div class="sg-row${rowNav}>
            ${l.teacher && !isVacancy(l.teacher) ? avatarHTML(l.teacher.name, "avatar") : `<span class="sg sg--lg">${esc(sgMark(l))}</span>`}
            <div class="sg-row__text">
              <span class="sg-row__label">${esc(partLabel(l))}${l.subgroup && !allSameGroup && l.group ? ` · ${esc(l.group.name)}` : ""}</span>
              <span class="sg-row__name">${esc(teacherLabel(l.teacher, true) || "Преподаватель не указан")}</span>
              ${rowSubject(l)}
            </div>
            ${sameRoom ? "" : `<div class="sg-row__room"><span class="room room--lg${l.note ? " is-changed" : ""}">${esc(roomOf(l))}</span>${div ? `<span>корп. ${esc(div.corps)}</span>` : ""}</div>`}
          </div>`;
        }).join("")}</div>`);
    }

    $("#mBody").innerHTML = callout + body;
    $("#lessonModal").showModal();
  }

  // Закрытие модалки кликом по backdrop; навигация по nav-item
  $("#lessonModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) { e.currentTarget.close(); return; }
    const nav = e.target.closest(".nav-item[data-nav-type]");
    if (nav) {
      const type = nav.dataset.navType;
      const id = nav.dataset.navId;
      const title = nav.dataset.navTitle || id;
      const g = type === "group" ? state.groups.find((x) => x.id_1c === id) : null;
      e.currentTarget.close();
      state.selected = { kind: type, id, title, divisionId: g ? g.divisionId : nav.dataset.navDivision || state.divisionId };
      if (type === "room") state.tab = "room";
      store.set("sielom.selection", state.selected);
      refreshWeek();
    }
  });
  $("#lessonModal").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest(".nav-item[data-nav-type]")) {
      e.preventDefault(); e.target.closest(".nav-item[data-nav-type]").click();
    }
  });

  // ---------- Профиль и быстрый доступ ----------
  const sameSel = (a, b) => a.kind === b.kind && a.id === b.id;

  function saveProfile() {
    store.set(PROFILE_KEY, profile);
    renderMine();
  }

  // Что держать под рукой: профиль (сводка), своё расписание и у преподавателя — группы, которые он курирует
  function mineItems() {
    const home = profileHome();
    if (!home) return [];
    const groupItem = (g, label) => {
      const known = !state.groups.length || state.groups.some((x) => x.id_1c === g.id);
      return { sel: { kind: "group", id: g.id, title: g.title, divisionId: g.divisionId }, lead: "group", title: groupParts(g.title).rest, mark: groupParts(g.title).mark, label: known ? label : "Группа не найдена — выберите заново", missing: !known };
    };
    const me = home.kind === "teacher"
      ? { sel: profileSel(), lead: "avatar", title: abbName(home.id), label: "Профиль · сводка недели" }
      : { sel: profileSel(), lead: "group", title: groupParts(home.title).rest, mark: groupParts(home.title).mark, label: "Профиль · сводка недели" };
    const schedule = { sel: home, lead: "calendar", title: home.kind === "teacher" ? "Моё расписание" : "Расписание группы", label: "Неделя и день" };
    return [me, schedule, ...(profile.role === "teacher" ? profile.curated.map((g) => groupItem(g, "Курирую")) : [])];
  }

  function mineItemHTML(it, i) {
    const active = sameSel(state.selected, it.sel);
    const lead = it.lead === "avatar" ? avatarHTML(it.sel.kind === "profile" ? profileHome().id : it.sel.id)
      : it.lead === "calendar" ? `<span class="entity__badge entity__badge--icon">${ICON.calendar}</span>`
      : `<span class="entity__badge">${esc(it.mark)}</span>`;
    return `<button type="button" class="entity mine__item${active ? " is-selected" : ""}${it.missing ? " is-missing" : ""}" data-mine="${i}"${active ? ' aria-current="true"' : ""}>
      ${lead}<span class="entity__text"><span class="entity__title">${esc(it.title)}</span><span class="entity__hint">${esc(it.label)}</span></span>
    </button>`;
  }

  function renderMine() {
    const items = mineItems();
    const box = $("#mine");
    if (items.length) {
      box.innerHTML = `<div class="mine__head"><span class="mine__title">Быстрый доступ</span><button type="button" class="mine__edit" data-profile-edit>Изменить</button></div>
        <div class="mine__list">${items.map(mineItemHTML).join("")}</div>`;
    } else {
      // без профиля вкладка «Моё» предлагает его настроить, а «Не сейчас» уводит в каталог
      box.innerHTML = `<div class="mine-hint">
        <div class="mine-hint__text"><b>Кто вы?</b><span>Укажите свою группу или себя как преподавателя — ваше расписание и сводка будут здесь</span></div>
        <div class="mine-hint__actions"><button type="button" class="btn btn--accent btn--sm" data-profile-edit>Настроить</button><button type="button" class="btn btn--soft btn--sm" data-mine-dismiss>Не сейчас</button></div>
      </div>`;
    }

    $("#meBtn").classList.toggle("is-on", isProfile());

    // Пометка в заголовке: «Моя группа» / «Это вы» или кнопка, чтобы отметить открытое расписание как своё
    const s = state.selected;
    let mark = "";
    if (s.kind === "group") {
      if (profile.role === "student" && profile.group?.id === s.id) mark = '<span class="mine-tag">Моя группа</span>';
      else if (profile.role === "teacher" && profile.teacher) {
        const on = profile.curated.some((g) => g.id === s.id);
        mark = `<button type="button" class="mine-tag mine-tag--btn${on ? "" : " mine-tag--add"}" data-curate aria-pressed="${on}">${on ? `${ICON.check}Курирую` : "+ Курирую"}</button>`;
      } else if (!profile.role || (profile.role === "student" && !profile.group)) {
        mark = '<button type="button" class="mine-tag mine-tag--btn mine-tag--add" data-mine-set="group">+ Моя группа</button>';
      }
    } else if (s.kind === "teacher") {
      if (profile.role === "teacher" && profile.teacher?.id === s.id) mark = '<span class="mine-tag">Это вы</span>';
      else if (!profile.role || (profile.role === "teacher" && !profile.teacher)) {
        mark = '<button type="button" class="mine-tag mine-tag--btn mine-tag--add" data-mine-set="teacher">+ Это я</button>';
      }
    }
    $("#mineMark").innerHTML = mark;
  }

  function goTo(sel) {
    const target = sel.kind === "profile" ? profileHome() : sel;
    const g = target?.kind === "group" ? state.groups.find((x) => x.id_1c === target.id) : null;
    state.selected = { kind: sel.kind, id: sel.id, title: sel.title, divisionId: g?.divisionId || target?.divisionId || state.divisionId };
    state.tab = tabFor(sel);
    state.divisionId = state.selected.divisionId;
    state.courseFilter = g ? String(g.course) : null;
    if (state.query) clearSearch();
    if (sel.kind !== "profile") store.set("sielom.selection", state.selected);
    setDrawer(false);
    refreshWeek();
  }
  const goProfile = () => goTo(profileSel());

  // ---------- Страница профиля ----------
  // Пары по слотам «день + номер»: подгруппы и потоки — одна пара, а не две
  function slotsOf(lessons) {
    const map = new Map();
    for (const l of lessons) {
      const k = `${l.date}|${l.lessonNumber}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(l);
    }
    return [...map.values()].sort((a, b) => a[0].date.localeCompare(b[0].date) || a[0].timeStart.localeCompare(b[0].timeStart));
  }
  const slotMin = (s) => { const t = spanOf(s); return toMin(t.timeEnd) - toMin(t.timeStart); };
  const slotIds = (s) => esc(s.map((l) => l.id).join(","));
  const slotRooms = (s) => uniq(s.map(roomOf)).join(" / ");
  const pairsWord = (n) => plural(n, ["пара", "пары", "пар"]);
  const dayLabel = (d, now) => ({ 0: "Сегодня", 1: "Завтра" }[dayDiff(d, now)] || `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`);

  function weekStats(slots, days) {
    const perDay = days.map((d) => slots.filter((s) => s[0].date === isoDate(d)));
    let windows = 0;
    for (const ds of perDay) {
      const nums = ds.map((s) => s[0].lessonNumber);
      if (nums.length > 1) windows += Math.max(...nums) - Math.min(...nums) + 1 - new Set(nums).size;
    }
    return { pairs: slots.length, minutes: slots.reduce((sum, s) => sum + slotMin(s), 0), days: perDay.filter((d) => d.length).length, windows, perDay };
  }

  // Состояние дня: что идёт, что следующее, а если на сегодня всё — ближайшая пара дальше
  function dayStatus(slots, now) {
    const today = slots.filter((s) => s[0].date === isoDate(now));
    const cur = today.find((s) => timing(spanOf(s), now, now)?.kind === "now");
    const next = cur ? null : today.find((s) => timing(spanOf(s), now, now)?.kind === "soon");
    const later = cur || next ? null : slots.find((s) => s[0].date > isoDate(now));
    return { today, cur, next, later };
  }

  function greeting(now) {
    const h = now.getHours();
    return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : h < 23 ? "Добрый вечер" : "Доброй ночи";
  }

  // Кто на паре — как в карточке расписания: группы (преподавателю) или преподаватели с фото (студенту), подгруппы значком
  function pfWhoHTML(s, kind) {
    const rows = s.map((l) => {
      const who = whoLabel(l, true, kind);
      if (!who) return "";
      const sg = s.length > 1 && l.subgroup ? `<span class="sg" title="${esc(l.subgroup)} подгруппа">${esc(l.subgroup)}</span>` : "";
      const av = kind === "group" && l.teacher && !isVacancy(l.teacher) ? avatarHTML(l.teacher.name, "avatar avatar--xs") : "";
      const room = s.length > 1 && !s.every((x) => roomOf(x) === roomOf(s[0])) ? `<span class="room">${esc(roomOf(l))}</span>` : "";
      // группа — как в карточках корпуса: кафедра значком, номер рядом («ИС» 24/9-4в)
      const g = kind === "teacher" && l.group?.name ? groupParts(l.group.name) : null;
      const text = g ? `<span class="pf-grp" title="${esc(who)}"><span class="sg sg--tag">${esc(g.mark)}</span><span class="who">${esc(g.rest)}</span></span>`
        : `<span class="who" title="${esc(who)}">${esc(who)}</span>`;
      return `<span class="who-row">${sg}${room}${av}${text}</span>`;
    });
    const uniqRows = [...new Set(rows.filter(Boolean))];
    return uniqRows.length ? `<span class="who-stack pf-status__who">${uniqRows.join("")}</span>` : "";
  }

  // Главный блок: приветствие, что идёт или будет дальше, и лента дня
  function pfHeroHTML(home, slots, st, now, current) {
    // корпус точно известен только у группы; у преподавателя «своего» корпуса в данных нет — не показываем
    const g = home.kind === "group" ? state.groups.find((x) => x.id_1c === home.id) : null;
    const div = g ? divisionById(g.divisionId) : null;
    const lead = home.kind === "teacher"
      ? avatarHTML(home.id, "avatar pf-hero__avatar")
      : `<span class="pf-hero__badge">${esc(groupParts(home.title).mark)}</span>`;
    const kicker = [home.kind === "teacher" ? "Преподаватель" : `Группа ${home.title}`, g?.course ? `${g.course} курс` : "", div ? divisionDisplayLabel(div) : ""].filter(Boolean).join(" · ");
    // к преподавателю — по имени и отчеству
    const nameTail = home.kind === "teacher" ? home.id.trim().split(/\s+/).slice(1).join(" ") : "";
    const top = `<div class="pf-hero__top">
      ${lead}
      <div class="pf-hero__text">
        <h2 class="pf-hero__hello">${esc(greeting(now))}${nameTail ? `, ${esc(nameTail)}` : ""}</h2>
        <span class="pf-hero__kicker">${esc(kicker)}</span>
      </div>
      <div class="pf-hero__actions">
        <button type="button" class="btn btn--accent" data-pf="schedule">${ICON.calendar}<span>${home.kind === "teacher" ? "Моё расписание" : "Расписание"}</span></button>
        <button type="button" class="icon-btn pf-hero__gear" data-pf="edit" aria-label="Настроить профиль" title="Настроить профиль">${ICON.gear}</button>
      </div>
    </div>`;

    if (state.loadingWeek || !weekPublished()) return `<section class="pf-hero">${top}</section>`;
    if (!current) {
      return `<section class="pf-hero">${top}<div class="pf-hero__week">${ICON.calendar}<span>Сводка недели <b>${esc(weekRangeLabel(weekDates()))}</b> — пары, нагрузка и группы</span></div></section>`;
    }

    const s = st.cur || st.next || st.later;
    if (!s) {
      return `<section class="pf-hero">${top}<div class="pf-status pf-status--quiet">${ICON.coffee}<div><b>${st.today.length ? "На сегодня всё" : "Сегодня пар нет"}</b><span>До конца недели занятий не осталось</span></div></div></section>`;
    }

    const l0 = spanOf(s);
    let chip, progress = "";
    if (st.cur) {
      const t = timing(l0, now, now);
      chip = `<span class="chip chip--live">Идёт · ещё ${fmtDuration(t.left)}</span>`;
      progress = `<div class="pf-progress" style="--progress:${t.progress}%"><span></span></div>`;
    } else if (st.next) {
      const t = timing(l0, now, now);
      chip = `<span class="chip chip--next">Следующая · ${t.left <= 180 ? `через ${fmtDuration(t.left)}` : `в ${esc(l0.timeStart)}`}</span>`;
    } else {
      chip = `<span class="chip chip--muted">${st.today.length ? "На сегодня всё" : "Сегодня пар нет"}</span><span class="pf-status__then">Дальше — ${esc(dayLabel(parseISO(l0.date), now).toLowerCase())}, ${esc(l0.timeStart)}</span>`;
    }

    const note = s.some((l) => l.note);

    return `<section class="pf-hero${st.cur ? " is-live" : ""}">
      ${top}
      <div class="pf-status">
        <div class="pf-status__head">${chip}</div>
        <button type="button" class="pf-status__body" data-detail="${slotIds(s)}">
          <span class="pf-room"><small>каб.</small>${esc(slotRooms(s))}</span>
          <span class="pf-status__text">
            <b class="pf-status__subject">${esc(subjectGroups(s).map(([n]) => n).join(" / "))}</b>
            <span class="pf-status__meta">${ICON.clock}${l0.lessonNumber} пара · ${esc(timeLabel(s))}</span>
            ${pfWhoHTML(s, home.kind)}
            ${note ? `<span class="pf-status__note">${ICON.alert}${esc(uniq(s.map((l) => l.note)).join(" · "))}</span>` : ""}
          </span>
        </button>
        ${progress}
      </div>
    </section>`;
  }

  function pfRowHTML(s, kind, now, { attrs = `data-detail="${slotIds(s)}"`, next = false } = {}) {
    const l0 = spanOf(s), t = timing(l0, parseISO(l0.date), now);
    const cls = ["pf-row", t?.kind === "past" && "is-past", t?.kind === "now" && "is-now", next && "is-next"].filter(Boolean).join(" ");
    const tag = t?.kind === "now" ? `<span class="chip chip--live">ещё ${fmtDuration(t.left)}</span>`
      : next ? `<span class="chip chip--next">${t.left <= 180 ? `через ${fmtDuration(t.left)}` : "следующая"}</span>` : "";
    return `<li><button type="button" class="${cls}" ${attrs}${t?.kind === "now" ? ` style="--progress:${t.progress}%"` : ""}>
      <span class="pf-row__time">${esc(l0.timeStart)}<small>${esc(l0.timeEnd)}</small></span>
      <span class="pf-row__rail" aria-hidden="true"><span>${l0.lessonNumber}</span></span>
      <span class="pf-row__main">${mixedTime(s) ? `<span class="pf-row__times">${ICON.clock}${esc(timeLabel(s))}</span>` : ""}${subjectGroups(s).length === 1
        ? `<b>${esc(subjectName(s[0]))}</b>${partsHTML(s, false, kind, kind === "group")}`
        : subjectGroups(s).map(([n, ls]) => `<span class="pf-row__block"><b>${esc(n)}</b>${partsHTML(ls, false, kind, kind === "group", true)}</span>`).join("")}</span>
      ${tag}${s.some((l) => l.note) ? `<span class="pf-note-dot" title="Есть примечание">${ICON.alert}</span>` : ""}
    </button></li>`;
  }

  function pfTodayHTML(st, kind, now) {
    const head = `<header class="pf-card__head"><h3 class="pf-card__title">Сегодня</h3><span class="pf-card__aside">${esc(`${WEEKDAYS_FULL[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`)}</span></header>`;
    if (!st.today.length) return `<section class="pf-card pf-today">${head}<div class="pf-empty">${ICON.coffee}<b>Пар нет</b><span>Можно выдохнуть</span></div></section>`;
    return `<section class="pf-card pf-today">${head}<ol class="pf-list">${st.today.map((s) => pfRowHTML(s, kind, now, { next: s === st.next })).join("")}</ol></section>`;
  }

  // Неделя: ключевые цифры строкой и столбики по дням
  function pfLoadHTML(stats, days, kind, now) {
    const max = Math.max(1, ...stats.perDay.map((d) => d.length));
    const hours = Math.floor(stats.minutes / 60), mins = stats.minutes % 60;
    const stat = (v, l) => `<div class="pf-stat"><b>${v}</b><span>${l}</span></div>`;
    return `<section class="pf-card pf-load">
      <header class="pf-card__head"><h3 class="pf-card__title">Неделя</h3><span class="pf-card__aside">${esc(weekRangeLabel(days))}</span></header>
      <div class="pf-stats">
        ${stat(stats.pairs, pairsWord(stats.pairs))}
        ${stat(`${hours}<small>ч</small>${mins ? ` ${mins}<small>м</small>` : ""}`, "в аудитории")}
        ${stat(stats.days, plural(stats.days, ["день", "дня", "дней"]) + " с парами")}
        ${stat(stats.windows, plural(stats.windows, ["окно", "окна", "окон"]))}
      </div>
      <div class="pf-bars" role="list">${days.map((d, i) => {
        const n = stats.perDay[i].length, iso = isoDate(d);
        const cls = ["pf-bar", iso === isoDate(now) && "is-today", iso < isoDate(now) && "is-past", !n && "is-zero"].filter(Boolean).join(" ");
        const range = n ? `${spanOf(stats.perDay[i][0]).timeStart}–${spanOf(stats.perDay[i].at(-1)).timeEnd}` : "нет пар";
        return `<button type="button" class="${cls}" role="listitem" data-pf-day="${i}" style="--v:${n / max}" title="${esc(`${WEEKDAYS_FULL[d.getDay()]}: ${n} ${pairsWord(n)}, ${range}. Открыть день`)}">
          <span class="pf-bar__col"><span class="pf-bar__n">${n || "–"}</span></span><span class="pf-bar__d">${WEEKDAYS[d.getDay()]}<small>${d.getDate()}</small></span></button>`;
      }).join("")}</div>
    </section>`;
  }

  // Предметы недели и кто с тобой на них: студенту — преподаватели с фото, преподавателю — группы.
  // Одна карточка вместо двух: «что» и «с кем» читаются вместе, а не сопоставляются глазами
  function pfSubjectsHTML(slots, kind) {
    const by = new Map();
    // у подгрупп в одной паре бывают разные предметы — пара засчитывается каждому из них
    for (const s of slots) for (const [name, ls] of subjectGroups(s)) {
      const e = by.get(name) || { n: 0, who: new Map() };
      e.n++;
      // сколько пар этого предмета с каждой группой (преподавателем): в потоке пара засчитывается каждой группе один раз
      const seen = new Set();
      for (const l of ls) {
        const w = kind === "teacher"
          ? l.group?.id_1c && { type: "group", id: l.group.id_1c, name: l.group.name }
          : l.teacher?.name && !isVacancy(l.teacher) && { type: "teacher", id: l.teacher.name, name: l.teacher.name };
        if (!w || seen.has(w.id)) continue;
        seen.add(w.id);
        const cur = e.who.get(w.id) || { ...w, n: 0 };
        cur.n++;
        e.who.set(w.id, cur);
      }
      by.set(name, e);
    }
    if (!by.size) return "";
    const rows = [...by.entries()].sort((a, b) => b[1].n - a[1].n || naturalSort(a[0], b[0]));
    const max = rows[0][1].n;
    // все числа в карточке — за открытую неделю, а не за семестр
    const weekWord = state.weekOffset === 0 ? "на этой неделе" : `за неделю ${weekRangeLabel(weekDates())}`;
    const count = (w) => `<span class="pf-who__n" aria-label="${w.n} ${pairsWord(w.n)} ${weekWord}">${w.n}</span>`;
    const whoHTML = (w) => {
      const tip = `${w.name}: ${w.n} ${pairsWord(w.n)} ${weekWord}`;
      if (w.type === "teacher") return `<button type="button" class="pf-who" data-pf-teacher="${esc(w.id)}" title="${esc(tip)}">${avatarHTML(w.name, "avatar avatar--xs")}<span class="pf-who__name">${esc(abbName(w.name))}</span>${count(w)}</button>`;
      const p = groupParts(w.name), cur = profile.curated.some((g) => g.id === w.id);
      return `<button type="button" class="pf-who${cur ? " is-cur" : ""}" data-pf-group="${esc(w.id)}" title="${esc(tip)}${cur ? " · курирую" : ""}"><span class="sg sg--tag">${esc(p.mark)}</span><span class="pf-who__name">${esc(p.rest)}</span>${count(w)}</button>`;
    };
    return `<section class="pf-card pf-subjects">
      <header class="pf-card__head"><h3 class="pf-card__title">${kind === "teacher" ? "Предметы и группы" : "Предметы и преподаватели"}</h3><span class="pf-card__aside">пар ${esc(weekWord)}</span></header>
      <ul class="pf-subj-list">${rows.map(([name, e]) => `<li class="pf-subj" style="--v:${e.n / max}">
        <div class="pf-subj__top"><span class="pf-subj__name" title="${esc(name)}">${esc(name)}</span><span class="pf-subj__n">${e.n}<small>${pairsWord(e.n)}</small></span></div>
        <span class="pf-meter__bar"></span>
        ${e.who.size ? `<div class="pf-subj__who">${[...e.who.values()].sort((a, b) => b.n - a.n || naturalSort(a.name, b.name)).map(whoHTML).join("")}</div>` : ""}
      </li>`).join("")}</ul>
    </section>`;
  }

  // Карточка курируемой группы: где группа сейчас и что у неё сегодня
  function pfCuratedHTML(g, now, current) {
    const slots = slotsOf(state.curatedLessons.get(g.id) || []);
    const p = groupParts(g.title);
    const notes = slots.filter((s) => s.some((l) => l.note)).length;
    let status = "", list = "";
    if (current) {
      const st = dayStatus(slots, now);
      const s = st.cur || st.next;
      if (s) {
        const t = timing(spanOf(s), now, now);
        status =`<div class="pf-cur__status${st.cur ? " is-live" : ""}">
          ${st.cur ? `<span class="chip chip--live">Сейчас · ещё ${fmtDuration(t.left)}</span>` : `<span class="chip chip--next">${t.left <= 180 ? `Через ${fmtDuration(t.left)}` : `В ${esc(s[0].timeStart)}`}</span>`}
          <span class="pf-cur__where"><b>${esc(subjectGroups(s).map(([n]) => n).join(" / "))}</b>${partsHTML(s, false, "group", true)}</span>
        </div>`;
      } else {
        status = `<div class="pf-cur__status is-quiet">${st.today.length ? "На сегодня пары закончились" : "Сегодня пар нет"}${st.later ? ` · дальше ${esc(dayLabel(parseISO(st.later[0].date), now).toLowerCase())}` : ""}</div>`;
      }
      if (st.today.length) list = `<ol class="pf-list pf-list--compact">${st.today.map((s) => pfRowHTML(s, "group", now, { attrs: `data-pf-group="${esc(g.id)}"`, next: s === st.next })).join("")}</ol>`;
    }
    return `<section class="pf-card pf-cur">
      <header class="pf-cur__head">
        <span class="entity__badge">${esc(p.mark)}</span>
        <span class="pf-cur__title"><b>${esc(p.rest)}</b><span>Курирую · ${slots.length} ${pairsWord(slots.length)} на неделе</span></span>
        <button type="button" class="btn btn--soft btn--sm" data-pf-group="${esc(g.id)}">Расписание</button>
      </header>
      ${status}${list}
      ${notes ? `<div class="callout callout--warn">${ICON.alert}<span>${notes} ${plural(notes, ["пара с примечанием", "пары с примечаниями", "пар с примечаниями"])} на неделе — проверьте переносы</span></div>` : ""}
    </section>`;
  }

  function pfNotesHTML(slots, kind, now) {
    const withNotes = slots.filter((s) => s.some((l) => l.note));
    if (!withNotes.length) return "";
    return `<section class="pf-card pf-notes">
      <header class="pf-card__head"><h3 class="pf-card__title">Изменения и примечания</h3><span class="pf-card__aside">${withNotes.length}</span></header>
      <ul class="pf-notelist">${withNotes.map((s) => `<li><button type="button" class="pf-noteitem" data-detail="${slotIds(s)}">
        <span class="pf-noteitem__when">${esc(dayLabel(parseISO(s[0].date), now))} · ${s[0].lessonNumber} пара</span>
        <b>${esc(subjectGroups(s).map(([n]) => n).join(" / "))}</b>
        <span class="pf-noteitem__text">${ICON.alert}${esc(uniq(s.map((l) => l.note)).join(" · "))}</span>
      </button></li>`).join("")}</ul>
    </section>`;
  }

  function renderProfilePage(now, scroll) {
    const week = $("#week");
    const home = profileHome();
    week.className = "week is-profile";
    if (!state.week && !state.loadingWeek && !state.error) renderPeriod(placeholderDays(), now);
    if (!home) {
      week.innerHTML = `<div class="empty"><span class="empty__icon">${ICON.calendar}</span><b>Профиль не настроен</b><span>Укажите свою группу или себя как преподавателя</span><button class="btn btn--accent" data-pf="edit">Настроить</button></div>`;
      return;
    }
    if (state.error) { week.className = "week is-msg"; week.innerHTML = stateHTML("error", "week"); return; }
    const kind = home.kind;
    if (state.loadingWeek || !weekPublished()) {
      renderPeriod(placeholderDays(), now);
      week.innerHTML = `<div class="pf">${pfHeroHTML(home, [], null, now, false)}${state.loadingWeek
        ? '<div class="pf-card pf-sk sk"></div><div class="pf-card pf-sk sk"></div><div class="pf-card pf-sk pf-sk--wide sk"></div>'
        : `<section class="pf-card pf-wide"><div class="pf-empty">${ICON.calClock}<b>Расписание ещё не опубликовано</b><span>На эту неделю данных нет. Загляните позже.</span></div></section>`}</div>`;
      return;
    }
    const days = weekDates();
    renderPeriod(days, now);
    const slots = slotsOf(state.lessons);
    const current = days.some((d) => isoDate(d) === isoDate(now));
    const stats = weekStats(slots, days);
    const st = dayStatus(slots, now);
    const curated = kind === "teacher" ? profile.curated : [];

    // Сверху на всю ширину — главный блок (что сейчас + лента дня) и примечания; остальное раскладываем по двум колонкам
    const head = pfHeroHTML(home, slots, st, now, current) + pfNotesHTML(slots, kind, now);
    const cards = [
      current && pfTodayHTML(st, kind, now),
      pfLoadHTML(stats, days, kind, now),
      ...curated.map((g) => pfCuratedHTML(g, now, current)),
      pfSubjectsHTML(slots, kind),
    ].filter(Boolean);
    week.innerHTML = `<div class="pf">${head}<div class="pf-cols"><div class="pf-col"></div><div class="pf-col"></div></div></div>`;
    layoutProfileCards(cards);
    if (scroll) [week.scrollLeft, week.scrollTop] = scroll;
    else week.scrollTop = 0;
  }

  // Кладём карточку в ту колонку, что сейчас короче: высоты карточек зависят от числа пар и групп,
  // а жёсткие ряды сетки оставляли бы дыры рядом с короткими карточками. На узком экране — одна колонка по порядку важности
  function layoutProfileCards(cards = null) {
    const wrap = $("#week .pf-cols");
    if (!wrap) return;
    const cols = [...wrap.querySelectorAll(".pf-col")];
    const items = cards || cols.flatMap((c) => [...c.children]).sort((a, b) => a.dataset.order - b.dataset.order);
    const two = wrap.clientWidth >= 860;
    pfLayoutWide = two;
    wrap.classList.toggle("is-single", !two);
    cols.forEach((c) => c.replaceChildren());
    items.forEach((it, i) => {
      const col = two && cols[1].offsetHeight < cols[0].offsetHeight ? cols[1] : cols[0];
      if (typeof it === "string") {
        col.insertAdjacentHTML("beforeend", it);
        col.lastElementChild.dataset.order = i;
      } else col.append(it);
    });
  }
  // при смене ширины (поворот, сворачивание панели) раскладка колонок пересчитывается
  let pfLayoutWide = null;
  new ResizeObserver(() => {
    const wrap = $("#week .pf-cols");
    if (!wrap) return;
    const wide = wrap.clientWidth >= 860;
    if (wide !== pfLayoutWide) { pfLayoutWide = wide; layoutProfileCards(); }
  }).observe($("#week"));

  $("#week").addEventListener("click", (e) => {
    if (!isProfile()) return;
    const act = e.target.closest("[data-pf]");
    if (act) { act.dataset.pf === "edit" ? openProfile() : goTo(profileHome()); return; }
    const day = e.target.closest("[data-pf-day]");
    if (day) {
      state.view = "day"; state.dayIndex = Number(day.dataset.pfDay);
      store.set("sielom.view", "day");
      goTo(profileHome());
      return;
    }
    const grp = e.target.closest("[data-pf-group]");
    if (grp) { const g = groupRef(grp.dataset.pfGroup); if (g) goTo({ kind: "group", id: g.id, title: g.title, divisionId: g.divisionId }); return; }
    const t = e.target.closest("[data-pf-teacher]");
    if (t) goTo({ kind: "teacher", id: t.dataset.pfTeacher, title: t.dataset.pfTeacher, divisionId: state.selected.divisionId });
  });

  // Профиль изменился, пока открыта его страница: перечитать её или уйти, если своего расписания больше нет
  function syncProfilePage() {
    if (!isProfile()) return;
    if (profileHome()) refreshWeek(); else goTo(lastSelection());
  }

  const groupRef = (id) => {
    const g = state.groups.find((x) => x.id_1c === id);
    return g ? { id: g.id_1c, title: g.name, divisionId: g.divisionId, course: g.course } : null;
  };
  const teacherRef = (name) => ({ id: name, divisionId: state.searchIndex?.teachers.find((t) => t.name === name)?.divisionId || state.selected.divisionId || null });

  // Отметить открытое расписание как своё (кнопки в заголовке)
  $("#mineMark").addEventListener("click", (e) => {
    const s = state.selected;
    if (e.target.closest("[data-mine-set='group']")) {
      const g = groupRef(s.id);
      if (!g) return;
      profile = { ...profile, role: "student", group: g };
    } else if (e.target.closest("[data-mine-set='teacher']")) {
      profile = { ...profile, role: "teacher", teacher: teacherRef(s.id) };
    } else if (e.target.closest("[data-curate]")) {
      const on = profile.curated.some((g) => g.id === s.id);
      const g = groupRef(s.id);
      if (!on && !g) return;
      profile = { ...profile, curated: on ? profile.curated.filter((x) => x.id !== s.id) : [...profile.curated, g] };
    } else return;
    saveProfile();
  });

  $("#mine").addEventListener("click", (e) => {
    if (e.target.closest("[data-profile-edit]")) { openProfile(); return; }
    if (e.target.closest("[data-mine-dismiss]")) { setSideTab("all"); return; }
    const item = e.target.closest("[data-mine]");
    if (!item) return;
    const it = mineItems()[+item.dataset.mine];
    if (it.missing) openProfile(); else goTo(it.sel);
  });

  // Кнопка в шапке и клавиша M: страница профиля, а пока профиль не настроен — окно настройки
  const openMe = () => profileHome() ? goProfile() : openProfile();
  $("#meBtn").addEventListener("click", openMe);

  // ---------- Окно профиля ----------
  let pickResults = [];

  function pickerHTML(kind, placeholder) {
    return `<div class="picker" data-picker="${kind}">
      <label class="search">
        <svg class="search__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.75" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <input type="search" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false" aria-label="${esc(placeholder)}">
      </label>
      <ul class="picker__list"></ul>
    </div>`;
  }

  // Выбранное значение: строка как в списке и кнопка, чтобы убрать
  function chosenHTML(kind, ref, hint, i = "") {
    const lead = kind === "teacher" ? avatarHTML(ref.id) : `<span class="entity__badge">${esc(groupParts(ref.title).mark)}</span>`;
    const title = kind === "teacher" ? ref.id : groupParts(ref.title).rest;
    return `<div class="entity p-chosen">${lead}<span class="entity__text"><span class="entity__title">${esc(title)}</span><span class="entity__hint">${esc(hint)}</span></span>
      <button type="button" class="modal__x p-chosen__x" data-unset="${kind}" data-i="${i}" aria-label="Убрать" title="Убрать"><svg width="12" height="12" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></div>`;
  }

  const groupHint = (ref) => { const d = divisionById(ref.divisionId); return [d ? divisionDisplayLabel(d) : "", ref.course ? `${ref.course} курс` : ""].filter(Boolean).join(" · "); };

  function renderProfile() {
    const items = mineItems();
    const role = profile.role;
    let html = "";
    if (items.length) {
      html += `<section class="msec"><div class="msec__title">Быстрый доступ</div><div class="mine__list">${items.map(mineItemHTML).join("")}</div></section>`;
    }
    html += `<section class="msec"><div class="msec__title">Кто вы</div>
      <div class="role-switch" role="radiogroup" aria-label="Роль">
        <button type="button" role="radio" data-role="student" aria-checked="${role === "student"}">Студент</button>
        <button type="button" role="radio" data-role="teacher" aria-checked="${role === "teacher"}">Преподаватель</button>
      </div></section>`;
    if (role === "student") {
      html += `<section class="msec"><div class="msec__title">Ваша группа</div>
        ${profile.group ? chosenHTML("group", profile.group, groupHint(profile.group)) : pickerHTML("group", "Например, ис 24 9 2")}</section>`;
    }
    if (role === "teacher") {
      html += `<section class="msec"><div class="msec__title">Ваше расписание</div>
        ${profile.teacher ? chosenHTML("teacher", profile.teacher, "Преподаватель") : pickerHTML("teacher", "Фамилия, например «Иванов»")}</section>`;
      html += `<section class="msec"><div class="msec__title">Кураторство</div>
        ${profile.curated.map((g, i) => chosenHTML("curated", g, groupHint(g), i)).join("")}
        ${profile.curated.length ? `<button type="button" class="p-add" data-add-curated>+ Ещё группа</button><div class="p-add-slot" hidden>${pickerHTML("curated", "Группа, которую вы курируете")}</div>`
          : `<p class="p-note">Если вы куратор, добавьте свою группу — она появится в быстром доступе рядом с вашим расписанием.</p>${pickerHTML("curated", "Группа, которую вы курируете")}`}</section>`;
    }
    if (profileHome()) {
      const home = profileHome();
      const opts = [
        ["profile", "Профиль", "Сводка: что идёт сейчас, пары на сегодня и нагрузка за неделю"],
        ["schedule", home.kind === "teacher" ? "Моё расписание" : "Расписание группы", "Сразу неделя или день"],
        ...(role === "teacher" ? profile.curated.map((g) => [`curated:${g.id}`, `Группа ${g.title}`, "Расписание курируемой группы"]) : []),
        ["last", "Последнее открытое", "То, что смотрели в прошлый раз"],
      ];
      const cur = opts.some(([v]) => v === profile.home) ? profile.home : "profile";
      html += `<section class="msec"><div class="msec__title">Домашняя страница</div>
        <div class="home-opts" role="radiogroup" aria-label="Домашняя страница">${opts.map(([v, t, h]) => `
          <button type="button" class="home-opt" role="radio" data-home="${esc(v)}" aria-checked="${v === cur}">
            <span class="home-opt__dot" aria-hidden="true"></span>
            <span class="home-opt__text"><span class="home-opt__title">${esc(t)}${v === "profile" ? '<span class="home-opt__def">по умолчанию</span>' : ""}</span><span class="home-opt__hint">${esc(h)}</span></span>
          </button>`).join("")}
        </div></section>`;
    }
    if (role) html += '<button type="button" class="p-reset" data-profile-reset>Сбросить профиль</button>';
    $("#pBody").innerHTML = html;
  }

  function openProfile() {
    setDrawer(false);
    renderProfile();
    ensureSearchIndex(); // список преподавателей собирается из занятий недели
    $("#profileModal").showModal();
  }

  function renderPicker(picker) {
    const kind = picker.dataset.picker, needle = picker.querySelector("input").value.trim(), list = picker.querySelector(".picker__list");
    if (!needle) { list.innerHTML = ""; return; }
    const res = searchResults(needle);
    if (kind === "teacher" && !res.ready) {
      list.innerHTML = '<li class="list__more"><span class="spin spin--sm"></span>Загружаем преподавателей…</li>';
      ensureSearchIndex()?.then(() => { if (picker.isConnected) renderPicker(picker); });
      return;
    }
    pickResults = (kind === "teacher" ? res.teachers : res.groups).slice(0, 6);
    list.innerHTML = pickResults.length
      ? pickResults.map((e, i) => {
        const lead = kind === "teacher" ? avatarHTML(e.id) : `<span class="entity__badge">${esc(groupParts(e.title).mark)}</span>`;
        const title = kind === "teacher" ? e.title : groupParts(e.title).rest;
        return `<li><button type="button" class="entity picker__item" data-pick="${i}">${lead}<span class="entity__text"><span class="entity__title">${esc(title)}</span>${e.hint ? `<span class="entity__hint">${esc(e.hint)}</span>` : ""}</span></button></li>`;
      }).join("")
      : listMessage("Ничего не найдено", "Попробуйте изменить запрос");
  }

  $("#pBody").addEventListener("input", (e) => {
    const picker = e.target.closest(".picker");
    if (picker) renderPicker(picker);
  });

  $("#pBody").addEventListener("click", (e) => {
    const roleBtn = e.target.closest("[data-role]");
    if (roleBtn) {
      profile = { ...profile, role: roleBtn.dataset.role };
      saveProfile(); renderProfile();
      if (profileHome()) goProfile(); else syncProfilePage();
      return;
    }

    const homeOpt = e.target.closest("[data-home]");
    if (homeOpt) {
      profile = { ...profile, home: homeOpt.dataset.home };
      saveProfile(); renderProfile();
      return;
    }

    const pick = e.target.closest("[data-pick]");
    if (pick) {
      const kind = pick.closest(".picker").dataset.picker, hit = pickResults[+pick.dataset.pick];
      if (kind === "teacher") profile = { ...profile, teacher: { id: hit.id, divisionId: hit.divisionId } };
      else {
        const g = groupRef(hit.id);
        if (kind === "group") profile = { ...profile, group: g };
        else if (!profile.curated.some((x) => x.id === g.id)) profile = { ...profile, curated: [...profile.curated, g] };
      }
      saveProfile(); renderProfile();
      // за окном сразу открывается страница профиля: видно, что изменилось
      if (profileHome()) goProfile();
      return;
    }

    const unset = e.target.closest("[data-unset]");
    if (unset) {
      const kind = unset.dataset.unset;
      if (kind === "curated") profile = { ...profile, curated: profile.curated.filter((_, i) => i !== +unset.dataset.i) };
      else profile = { ...profile, [kind]: null };
      saveProfile(); renderProfile(); syncProfilePage();
      $(`#pBody .picker[data-picker="${kind}"] input`)?.focus();
      return;
    }

    if (e.target.closest("[data-add-curated]")) {
      const slot = $("#pBody .p-add-slot");
      slot.hidden = false; e.target.closest("[data-add-curated]").hidden = true;
      slot.querySelector("input").focus();
      return;
    }

    if (e.target.closest("[data-profile-reset]")) {
      profile = { ...EMPTY_PROFILE };
      saveProfile(); renderProfile(); syncProfilePage();
      return;
    }

    const item = e.target.closest("[data-mine]");
    if (item) {
      const it = mineItems()[+item.dataset.mine];
      if (it.missing) return;
      $("#profileModal").close();
      goTo(it.sel);
    }
  });

  // Закрытие кликом по затемнению, как у окна пары
  $("#profileModal").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $("#profileModal").addEventListener("keydown", (e) => {
    // Enter в поиске выбирает первый вариант, а не отправляет форму окна
    if (e.key !== "Enter" || !e.target.closest(".picker input")) return;
    e.preventDefault();
    e.target.closest(".picker").querySelector("[data-pick]")?.click();
  });

  // ---------- Drag-to-scroll ----------
  function makeDraggable(el, axes = "xy") {
    let drag = false, moved = false;
    let startX = 0, startY = 0, scrollX = 0, scrollY = 0;

    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || dayNav() || isProfile()) return;
      if (e.target.closest("button,a,input")) return;
      drag = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      scrollX = el.scrollLeft; scrollY = el.scrollTop;
      el.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!drag) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 4) {
        moved = true;
        el.style.cursor = "grabbing";
      }
      if (moved) {
        if (axes.includes("x")) el.scrollLeft = scrollX - dx;
        if (axes.includes("y")) el.scrollTop  = scrollY - dy;
      }
    });

    document.addEventListener("mouseup", () => {
      if (!drag) return;
      drag = false;
      el.style.cursor = "";
      el.style.userSelect = "";
    });

    // Если было перетаскивание — гасим click
    el.addEventListener("click", (e) => { if (moved) { e.stopPropagation(); moved = false; } }, true);
  }

  makeDraggable($("#week"), "xy"); // расписание — обе оси

  // Свайп влево/вправо в режиме «День» и в корпусе на узком экране
  {
    let sx = 0, sy = 0;
    $("#week").addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    $("#week").addEventListener("touchend", (e) => {
      // свайп по полосе дней в корпусе листает недели
      if (isBuilding() && e.target.closest(".strip--bar")) {
        const sdx = e.changedTouches[0].clientX - sx, sdy = e.changedTouches[0].clientY - sy;
        if (Math.abs(sdx) > 50 && Math.abs(sdx) > Math.abs(sdy) * 1.5) stepWeek(sdx < 0 ? 1 : -1);
        return;
      }
      // в широкой шахматке горизонтальный свайп прокручивает кабинеты, а не дни; в узком виде корпуса свайп листает пары
      if (isProfile() || (isBuilding() ? !narrowMQ.matches : state.view !== "day")) return;
      if (e.target.closest(".bpairs")) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (!(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)) return;
      if (isBuilding()) {
        // в корпусе свайп листает пары, а не дни
        const cur = $("#week .bpair.is-active");
        (dx < 0 ? cur?.nextElementSibling : cur?.previousElementSibling)?.click();
        return;
      }
      step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  // Раз в минуту обновляем «идёт сейчас» и свёрнутые прошедшие пары
  const refreshNow = () => {
    if (!state.loadingWeek && !state.error && state.week && !$("#lessonModal").open) renderWeek({ keepScroll: true });
  };
  setInterval(refreshNow, 60 * 1000);
  document.addEventListener("sielom:tick", refreshNow); // для демо-стенда (demo.html): сдвиг времени без ожидания минуты

  // ---------- Старт ----------
  (async () => {
    state.view = store.get("sielom.view", mobileMQ.matches ? "day" : "week") === "day" ? "day" : "week";
    renderChrome(); renderWeek();
    try {
      [state.divisions, state.groups] = await Promise.all([loadDivisions(), loadGroups()]);
    } catch (e) { state.error = e; renderChrome(); renderWeek(); return; }

    // Восстановить divisionId и courseFilter из сохранённого выбора
    if (!state.divisionId && state.selected.divisionId) state.divisionId = state.selected.divisionId;
    const sel0 = isProfile() ? profileHome() : state.selected;
    if (state.tab === "group" && sel0?.kind === "group") {
      const g = state.groups.find((x) => x.id_1c === sel0.id);
      if (g) state.courseFilter = String(g.course);
    }
    renderChrome();

    await Promise.all([refreshWeek(), ensureEmployees()]);
  })();
})();
