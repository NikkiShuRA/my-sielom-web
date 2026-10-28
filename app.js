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
  const KIND_LABEL = { group: "Группа", teacher: "Преподаватель", room: "Кабинет" };
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
    calendar: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5.5 1.75v2.5M10.5 1.75v2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.75V8l2.25 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
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

  const state = {
    tab: "group",
    selected: store.get("sielom.selection", DEFAULT_SELECTION),
    divisionId: null,
    courseFilter: null,
    favourites: new Set(store.get("sielom.favourites.v2", [])),
    onlyFav: false,
    query: "",
    view: "week",
    weekOffset: 0,
    dayIndex: null,
    divisions: [],
    groups: [],
    week: null,
    lessons: [],
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
  };
  state.tab = state.selected.kind;
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
  const roomOf = (l) => (l.cabinet && (l.cabinet.number || l.cabinet.name)) || "—"; // кабинет не указан — «—»

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
      for (const l of state.divisionLessons) if (l.teacher && !map.has(l.teacher.name)) map.set(l.teacher.name, l.teacher);
      return [...map.values()]
        .sort((a, b) => naturalSort(a.name, b.name))
        .map((t) => ({ type: "teacher", id: t.name, title: t.name, parts: t.name.split(/\s+/) }));
    }

    const map = new Map();
    for (const l of state.divisionLessons) if (l.cabinet && !map.has(l.cabinet.id_1c)) map.set(l.cabinet.id_1c, l.cabinet);
    return [...map.values()]
      .sort((a, b) => naturalSort(a.number || a.name, b.number || b.name))
      .filter((c) => !/^дистант$/i.test(c.number || c.name))
      .map((c) => {
        const num = c.number || c.name || "—";
        const stripped = num.replace(/^[А-Яа-яA-Za-z]+-/, "");
        // подсказка — полный номер («МК-409»), только если он отличается от номера в значке; адрес не нужен, корпус уже выбран
        const ext = externalPlace(c.number || c.name);
        const hint = ext ? ext.address : c.number ? (c.number !== stripped ? c.number : "") : c.name;
        return { type: "room", id: c.id_1c, title: stripped, hint };
      });
  }

  function selectedTitle() {
    const s = state.selected;
    if (s.kind === "group") {
      const g = state.groups.find((x) => x.id_1c === s.id);
      return g ? g.name : "";
    }
    if (s.kind === "teacher") {
      const t = state.divisionLessons.find((x) => x.teacher && x.teacher.name === s.id);
      return (t && t.teacher.abb_name) || s.id;
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
    const byType = { teacher: [], group: [], room: [] };
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
        const cab = state.cabinets.get(id);
        const num = cab ? (cab.number || cab.name) : id;
        const stripped = num.replace(/^[А-Яа-яA-Za-z]+-/, "");
        const div = cab ? divisionById(cab.divisionId) : null;
        byType.room.push({ type: "room", id, title: stripped, hint: div ? divisionDisplayLabel(div) : "", divisionId: cab?.divisionId || null });
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
          if (l.teacher?.name) {
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
    // по названию ищем любой фрагмент, по подсказке (корпус, адрес) — только от 3 символов, чтобы «1» не цеплял адреса
    const hit = (title, hint = "") => {
      const a = normText(title), b = normText(hint);
      return tokens.every((t) => a.includes(t) || (t.length >= 3 && b.includes(t)));
    };
    const rank = (title) => (normText(title).startsWith(tokens[0]) ? 0 : 1);
    const sortHits = (arr) => arr.sort((a, b) => rank(a.title) - rank(b.title) || naturalSort(a.title, b.title));

    const groups = sortHits(state.groups.map((g) => {
      const div = divisionById(g.divisionId);
      return { type: "group", id: g.id_1c, title: g.name, hint: [div ? divisionDisplayLabel(div) : "", g.course ? `${g.course} курс` : ""].filter(Boolean).join(" · "), divisionId: g.divisionId, course: g.course };
    }).filter((e) => hit(e.title, e.hint)));

    const idx = state.searchIndex;
    const teachers = idx ? sortHits(idx.teachers.map((t) => ({ type: "teacher", id: t.name, title: t.name, parts: t.name.split(/\s+/), divisionId: t.divisionId }))
      .filter((e) => hit(e.title))) : [];
    const rooms = idx ? sortHits(idx.rooms
      .filter((c) => !/^дистант$/i.test(c.number || c.name))
      .map((c) => {
        const num = c.number || c.name || "—";
        const addr = externalPlace(num)?.address || divisionAddrPart(divisionById(c.divisionId));
        // в общем поиске корпусов много, поэтому адрес в подсказке остаётся
        return { type: "room", id: c.id_1c, title: num.replace(/^[А-Яа-яA-Za-z]+-/, ""), hint: c.number ? `${c.number}${addr ? " · " + addr : ""}` : c.name, divisionId: c.divisionId, full: num };
      })
      .filter((e) => hit(`${e.title} ${e.full}`, e.hint))) : [];
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
    $("#sidebar").classList.toggle("is-searching", !!state.query.trim() && !state.onlyFav);
    const needle = state.query.trim().toLowerCase();

    if (state.onlyFav) {
      if (state.error && !state.divisions.length) {
        list.innerHTML = listMessage("Не удалось загрузить данные", "Проверьте соединение и обновите страницу");
        return;
      }
      const byType = buildFavItems();
      const SEP_LABEL = { teacher: "Преподаватели", group: "Группы", room: "Кабинеты" };
      let html = "";
      for (const type of ["teacher", "group", "room"]) {
        let items = byType[type];
        if (needle) items = items.filter((e) => `${e.title} ${e.hint || ""}`.toLowerCase().includes(needle));
        if (!items.length) continue;
        html += `<li class="list-sep" aria-hidden="true"><span>${esc(SEP_LABEL[type])}</span></li>`;
        html += items.map((e) => entityItemHTML(e)).join("");
      }
      list.innerHTML = html || listMessage("В избранном пусто", needle ? "Нет совпадений" : "Нажмите на закладку рядом с группой или преподавателем");
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

  function whoLabel(l, full = false) {
    const kind = state.selected.kind;
    const teacher = l.teacher && (full ? l.teacher.name : l.teacher.abb_name);
    const group = l.group && l.group.name;
    const base = kind === "group" ? teacher : kind === "teacher" ? group : kind === "room" ? group : [l.teacher?.abb_name, group].filter(Boolean).join(" · ");
    return base || "";
  }

  // Строки «кабинет + кто» — по одной на подгруппу. При общем кабинете он показан один раз.
  function partsHTML(lessons, full) {
    const sameRoom = lessons.every((l) => roomOf(l) === roomOf(lessons[0]));
    const withAvatar = full && state.selected.kind === "group";
    const roomMode = state.selected.kind === "room";
    const primaryOf = (l) => roomMode
      ? (l.teacher ? abbName(l.teacher.name) : "—")
      : roomOf(l);

    if (lessons.length > 1) {
      const l0 = lessons[0];
      const sameTeacher = roomMode && lessons.every((l) => l.teacher?.name === l0.teacher?.name);
      if ((sameRoom && !roomMode) || sameTeacher) {
        const rows = lessons.map((l) => {
          const who = whoLabel(l, full);
          const sg = l.subgroup ? `<span class="sg" title="${esc(l.subgroup)} подгруппа">${esc(l.subgroup)}</span>` : "";
          const av = withAvatar && l.teacher ? avatarHTML(l.teacher.name, "avatar avatar--xs") : "";
          return `<span class="who-row">${sg}${av}<span class="who" title="${esc(who)}">${esc(who)}</span></span>`;
        }).join("");
        const badge = roomMode ? primaryOf(l0) : roomOf(l0);
        return `<ul class="parts"><li class="part"><span class="room${l0.note ? " is-changed" : ""}">${esc(badge)}</span><span class="who-stack">${rows}</span></li></ul>`;
      }
    }

    return `<ul class="parts">${lessons.map((l) => {
      const who = whoLabel(l, full);
      return `<li class="part">
        ${lessons.length > 1 && l.subgroup ? `<span class="sg" title="${esc(l.subgroup)} подгруппа">${esc(l.subgroup)}</span>` : ""}
        <span class="room${l.note ? " is-changed" : ""}">${esc(primaryOf(l))}</span>
        ${withAvatar && l.teacher ? avatarHTML(l.teacher.name, "avatar avatar--xs") : ""}
        <span class="who" title="${esc(who)}">${esc(who)}</span>
      </li>`;
    }).join("")}</ul>`;
  }

  function lessonCardHTML(lessons, date, now, { next = false, full = false } = {}) {
    const l0 = lessons[0];
    const subject = l0.subject ? l0.subject.name : "Без названия";
    const t = timing(l0, date, now);
    const notes = lessons.filter((l) => l.note);

    let chip = "";
    if (t?.kind === "now") chip = `<span class="chip chip--live">Идёт · ещё ${fmtDuration(t.left)}</span>`;
    else if (next && t?.kind === "soon") chip = `<span class="chip chip--next">${t.left <= 180 ? `Через ${fmtDuration(t.left)}` : "Следующая"}</span>`;

    const cls = ["lesson", full && "lesson--full", t?.kind === "now" && "is-now", next && "is-next", t?.kind === "past" && "is-past", notes.length && "has-note"]
      .filter(Boolean).join(" ");
    const meta = [
      full ? "" : `<span class="lesson__num">${l0.lessonNumber}</span><span class="lesson__time">${esc(l0.timeStart)} – ${esc(l0.timeEnd)}</span>`,
      chip,
      notes.length ? '<span class="grow"></span>' : (chip ? '<span class="grow"></span>' : ""),
      notes.length ? `<span class="lesson__note" title="Есть примечание">${ICON.alert}</span>` : "",
    ].join("");

    return `
      <article class="${cls}" data-detail="${esc(lessons.map((l) => l.id).join(","))}" tabindex="0" role="button"
        aria-label="${esc(`${l0.lessonNumber}-я пара, ${l0.timeStart}–${l0.timeEnd}: ${subject}. Подробнее`)}"
        ${t?.kind === "now" ? `style="--progress:${t.progress}%"` : ""}>
        ${meta.trim() ? `<div class="lesson__meta">${meta}</div>` : ""}
        <h3 class="lesson__title" title="${esc(subject)}">${esc(subject)}</h3>
        ${partsHTML(lessons, full)}
        ${full && notes.length ? `<p class="lesson__notes">${notes.map((l) => esc(l.note)).join("<br>")}</p>` : ""}
      </article>`;
  }

  function slotHTML(num) {
    const bells = state.bells.get(num);
    return `<div class="slot" aria-hidden="true">
      <span class="slot__num">${num}</span>
      ${bells ? `<span class="slot__time">${esc(bells.timeStart)} – ${esc(bells.timeEnd)}</span>` : ""}
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
    if (nums.some((n) => timing(byNum.get(n)[0], date, now).kind === "now")) return null;
    return nums.find((n) => timing(byNum.get(n)[0], date, now).kind === "soon") ?? null;
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

    // Карточки лежат прямо в колонке: строки сетки общие для всех дней (subgrid),
    // поэтому высота строки равна самой высокой карточке среди дней
    const items = [];
    let prevNum = null;
    for (const num of state.lessonNums) {
      if (prevNum !== null && gapBetween(prevNum, num) >= LONG_BREAK) {
        // строка-разделитель общая для всех дней (чтобы сетка была ровной), а подпись — реальный перерыв этого дня
        const a = byNum.get(prevNum)?.[0] || state.bells.get(prevNum), b = byNum.get(num)?.[0] || state.bells.get(num);
        items.push(breakDividerHTML(a && b ? toMin(b.timeStart) - toMin(a.timeEnd) : gapBetween(prevNum, num)));
      }
      prevNum = num;

      const lessons = byNum.get(num);
      if (!lessons) { items.push(slotHTML(num)); continue; }
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
      if (i && gapBetween(state.lessonNums[i - 1], n) >= LONG_BREAK) segments.push([]);
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
      const first = byNum.get(present[0])[0], last = byNum.get(present.at(-1))[0];
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
      let rows = "";
      let prevNum = null;
      for (const num of state.lessonNums.slice(from, to + 1)) {
        const bells = state.bells.get(num);
        const lessons = byNum.get(num);
        const time = lessons ? lessons[0] : bells; // у пары может быть своё время, отличное от общей сетки звонков
        if (prevNum !== null) {
          const prevTime = byNum.get(prevNum)?.[0] || state.bells.get(prevNum);
          const gap = prevTime && time ? toMin(time.timeStart) - toMin(prevTime.timeEnd) : gapBetween(prevNum, num);
          if (gap >= SHOW_BREAK) {
            // перерыв — тоже «момент» на линии: ещё не начался / идёт / прошёл, со своей точкой и прогрессом
            const bt = prevTime && time ? timing({ timeStart: prevTime.timeEnd, timeEnd: time.timeStart }, date, now) : null;
            const bp = bt?.kind === "now" ? ` style="--p:${bt.progress / 100}"` : "";
            rows += `<li class="tl-row tl-row--shift${bt ? ` is-${bt.kind}` : ""}"${bp}><span></span><span class="tl-rail"><span class="tl-dot tl-dot--break"></span></span>${breakDividerHTML(gap)}</li>`;
          }
        }
        prevNum = num;
        const t = time && timing(time, date, now);
        const rowCls = ["tl-row", !lessons && "tl-row--window", t && `is-${t.kind}`].filter(Boolean).join(" ");
        const rp = t?.kind === "now" ? ` style="--p:${t.progress / 100}"` : "";
        rows += `<li class="${rowCls}"${rp}>
          <div class="tl-time">
            <span class="tl-start">${esc(time?.timeStart || "")}</span>
            <span class="tl-end">${esc(time?.timeEnd || "")}</span>
          </div>
          <span class="tl-rail"><span class="tl-dot"></span></span>
          <div class="tl-body">
            <span class="tl-num">${num} пара</span>
            ${lessons ? lessonCardHTML(lessons, date, now, { next: num === next, full: true }) : '<div class="window">Окно</div>'}
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
    if (state.view === "day" && state.dayIndex != null) {
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
    const onToday = state.weekOffset === 0 && (state.view === "week" || state.dayIndex === todayIdx || todayIdx < 0);
    $("#todayBtn").disabled = onToday;
  }

  // ---------- Рендер расписания ----------
  let navDir = 0; // направление последнего перехода — для анимации появления

  function renderWeek({ keepScroll = false } = {}) {
    const week = $("#week");
    const scroll = [week.scrollLeft, week.scrollTop];
    week.removeAttribute("data-anim");
    week.style.gridTemplateColumns = "";
    renderTodayBtn();

    const now = new Date();
    const isDay = state.view === "day";

    // Состояния без расписания: загрузка, ошибка, «не опубликовано». В режиме «День» остаются шапка и полоска дней.
    const kind = state.error ? "error" : state.loadingWeek ? "loading" : !state.week ? "unpublished" : null;
    if (kind) {
      const days = placeholderDays();
      if (isDay && state.dayIndex == null) {
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
    if (isDay && state.dayIndex == null) {
      const t = days.findIndex((d) => isoDate(d) === isoDate(now));
      state.dayIndex = t >= 0 ? t : 0;
    }
    renderPeriod(days, now);
    renderTodayBtn();

    if (!state.lessons.length && !isDay) {
      week.className = "week is-msg";
      week.innerHTML = stateHTML("free", "week");
    } else if (isDay) {
      week.className = "week is-day";
      week.innerHTML = dayViewHTML(days, now);
    } else {
      week.className = "week";
      week.innerHTML = days.map((d, i) => dayColumnHTML(d, i, now)).join("");
      // колонка с чипом («Идёт · ещё N мин», «Через N мин») шире остальных, чтобы плашка помещалась целиком
      const cols = [...week.querySelectorAll(":scope > .day")].map((d) => d.querySelector(".lesson__meta .chip") ? "minmax(330px, 360px)" : "minmax(var(--day-w), 320px)");
      if (cols.some((c) => c.startsWith("minmax(330"))) week.style.gridTemplateColumns = cols.join(" ");
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
    document.title = title ? `${title} — Расписание СИЭУиП` : "СИЭУиП — Расписание";
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
    $$(".segmented").forEach(syncThumb);
    $("#favFilter").setAttribute("aria-pressed", state.onlyFav);
    $("#prevWeek").setAttribute("aria-label", state.view === "day" ? "Предыдущий день" : "Предыдущая неделя");
    $("#nextWeek").setAttribute("aria-label", state.view === "day" ? "Следующий день" : "Следующая неделя");
    renderHeader();
    renderCrumb();
    renderList();
  }

  // ---------- Данные ----------
  function buildBells() {
    const map = new Map();
    for (const l of [...state.lessons, ...state.divisionLessons]) {
      if (!map.has(l.lessonNumber)) map.set(l.lessonNumber, { timeStart: l.timeStart, timeEnd: l.timeEnd });
    }
    state.bells = map;
    state.lessonNums = [...map.keys()].sort((a, b) => a - b);
    state.breaks = computeBreaks([...state.lessons, ...state.divisionLessons]);
  }

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

  // Перерыв между парами prev и num (мин) для общей сетки недели
  function gapBetween(prev, num) {
    if (num === prev + 1 && state.breaks.has(prev)) return state.breaks.get(prev);
    const a = state.bells.get(prev), b = state.bells.get(num);
    return a && b ? toMin(b.timeStart) - toMin(a.timeEnd) : 0;
  }
  const breakDividerHTML = (min) => `<div class="shift-divider" role="separator">Перерыв ${fmtDuration(min)}</div>`;

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
      state.lessons = week ? await loadLessonsFor(state.selected, week, divName) : [];
      if (token !== weekToken) return;
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
    if (state.view === "day" && state.week) {
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

  // Горячие клавиши: ← / → листают, T — сегодня, / — поиск
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || $("#lessonModal").open) return;
    if (e.target.closest("input, textarea")) return;
    if (e.code === "Slash") {
      e.preventDefault();
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
  $("#favFilter").addEventListener("click", () => { state.onlyFav = !state.onlyFav; renderChrome(); });

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
      state.tab = type;
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

  $("#week").addEventListener("click", (e) => {
    if (e.target.closest("#retry")) { apiCache.clear(); refreshWeek(); return; }

    const openDay = e.target.closest("[data-open-day]");
    if (openDay) { state.view = "day"; state.dayIndex = Number(openDay.dataset.openDay); renderChrome(); renderWeek(); return; }

    const pick = e.target.closest("[data-pick-day]");
    if (pick) {
      const i = Number(pick.dataset.pickDay);
      navDir = Math.sign(i - state.dayIndex);
      state.dayIndex = i;
      renderWeek();
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
    const full = roomOf(l), short = full.replace(/^[А-Яа-яA-Za-z]+-/, "");
    const ext = externalPlace(full);
    const line = ext ? ext.address : [addr, full !== short ? full : ""].filter(Boolean).join(" · ");
    return `<div class="place${l.note ? " is-changed" : ""}">
      <span class="place__room" aria-label="Кабинет ${esc(full)}">${esc(short)}</span>
      <div class="place__text">
        <span class="place__corps">${ext ? esc(ext.name) : div ? esc("Корпус " + div.corps) : "Кабинет"}</span>
        ${line ? `<span class="place__addr">${esc(line)}</span>` : ""}
      </div>
    </div>`;
  }

  function personHTML(teacher, label = "") {
    if (!teacher) return "";
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
    const subject = l0.subject ? l0.subject.name : "Пара";
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
        <span class="meta-item">${ICON.clock}${esc(`${l0.timeStart} – ${l0.timeEnd}`)}</span>
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
            </div>
            ${sameRoom ? "" : `<div class="sg-row__room"><span class="room room--lg${l.note ? " is-changed" : ""}">${esc(roomOf(l))}</span>${div ? `<span>корп. ${esc(div.corps)}</span>` : ""}</div>`}
          </div>`;
        }).join("")}</div>`);
    } else {
      // У каждой подгруппы свой преподаватель
      body = (sameRoom ? section("Где", placeHTML(l0)) : "")
        + section(allSameGroup ? "Подгруппы" : "Группы", `<div class="sg-list">${lessons.map((l) => {
          const div = divisionInfo(l.division);
          const rowNav = l.teacher ? ` nav-item" data-nav-type="teacher" data-nav-id="${esc(l.teacher.name)}" data-nav-title="${esc(l.teacher.name)}" tabindex="0" role="button"` : `"`;
          return `<div class="sg-row${rowNav}>
            ${l.teacher ? avatarHTML(l.teacher.name, "avatar") : `<span class="sg sg--lg">${esc(sgMark(l))}</span>`}
            <div class="sg-row__text">
              <span class="sg-row__label">${esc(partLabel(l))}${l.subgroup && !allSameGroup && l.group ? ` · ${esc(l.group.name)}` : ""}</span>
              <span class="sg-row__name">${esc(l.teacher?.name || "Преподаватель не указан")}</span>
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
      state.selected = { kind: type, id, title, divisionId: g ? g.divisionId : state.divisionId };
      store.set("sielom.selection", state.selected);
      refreshWeek();
    }
  });
  $("#lessonModal").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest(".nav-item[data-nav-type]")) {
      e.preventDefault(); e.target.closest(".nav-item[data-nav-type]").click();
    }
  });

  // ---------- Drag-to-scroll ----------
  function makeDraggable(el, axes = "xy") {
    let drag = false, moved = false;
    let startX = 0, startY = 0, scrollX = 0, scrollY = 0;

    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || state.view === "day") return;
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

  // Свайп влево/вправо в режиме «День» на тач-экранах
  {
    let sx = 0, sy = 0;
    $("#week").addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    $("#week").addEventListener("touchend", (e) => {
      if (state.view !== "day") return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  // Раз в минуту обновляем «идёт сейчас» и свёрнутые прошедшие пары
  setInterval(() => {
    if (!state.loadingWeek && !state.error && state.week && !$("#lessonModal").open) renderWeek({ keepScroll: true });
  }, 60 * 1000);

  // ---------- Старт ----------
  (async () => {
    state.view = store.get("sielom.view", mobileMQ.matches ? "day" : "week") === "day" ? "day" : "week";
    renderChrome(); renderWeek();
    try {
      [state.divisions, state.groups] = await Promise.all([loadDivisions(), loadGroups()]);
    } catch (e) { state.error = e; renderChrome(); renderWeek(); return; }

    // Восстановить divisionId и courseFilter из сохранённого выбора
    if (!state.divisionId && state.selected.divisionId) state.divisionId = state.selected.divisionId;
    if (state.tab === "group" && state.selected.kind === "group") {
      const g = state.groups.find((x) => x.id_1c === state.selected.id);
      if (g) state.courseFilter = String(g.course);
    }
    renderChrome();

    await Promise.all([refreshWeek(), ensureEmployees()]);
  })();
})();
