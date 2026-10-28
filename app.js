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
  const SHIFT_BORDER = "13:30";
  const EMPLOYEE_CACHE_KEY = "sielom.employees.v1";
  const EMPLOYEE_CACHE_TTL = 24 * 60 * 60 * 1000;

  const ICON = {
    bookmark: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 2.75C4 2.34 4.34 2 4.75 2h6.5c.41 0 .75.34.75.75V14l-4-2.25L4 14V2.75z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    chevron: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    alert: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.75V8.5M8 11h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    calendar: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5.5 1.75v2.5M10.5 1.75v2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.75V8l2.25 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
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
    lessonNums: [],
    employeePhotos: new Map(),
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
    if (isoDate(date) !== isoDate(now)) return null;
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
  const roomOf = (l) => l.cabinet ? l.cabinet.number || l.cabinet.name : "—";

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
        const num = c.number || c.name;
        const stripped = num.replace(/^[А-Яа-яA-Za-z]+-/, "");
        const addr = divisionAddrPart(divisionById(state.divisionId));
        const hint = c.number ? `${c.number}${addr ? " · " + addr : ""}` : c.name;
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
    const divAttr = e.divisionId ? ` data-division-id="${esc(e.divisionId)}"` : "";
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
          byType.group.push({ type: "group", id: g.id_1c, title: g.name, hint: div ? divisionDisplayLabel(div) : "", divisionId: g.divisionId });
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

  function renderList() {
    const list = $("#list");
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

    let items = entitiesForTab();
    if (needle) items = items.filter((e) => `${e.title} ${e.hint || ""}`.toLowerCase().includes(needle));

    if (state.error && !state.divisions.length) {
      list.innerHTML = listMessage("Не удалось загрузить данные", "Проверьте соединение и обновите страницу");
      return;
    }
    if (!items.length) {
      const loading = !state.divisions.length || (state.divisionId && state.tab !== "group" && !state.divisionLoaded);
      list.innerHTML = loading
        ? '<li class="sk sk--row"></li>'.repeat(6)
        : listMessage("Ничего не найдено", needle ? "Попробуйте изменить запрос" : "");
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
    let prevIsAfterShift = false;
    for (const num of state.lessonNums) {
      const bells = state.bells.get(num);
      const isAfterShift = bells ? bells.timeStart >= SHIFT_BORDER : false;
      if (items.length && isAfterShift && !prevIsAfterShift) items.push('<div class="shift-divider" role="separator">пересменка</div>');
      prevIsAfterShift = isAfterShift;

      const lessons = byNum.get(num);
      if (!lessons) { items.push(slotHTML(num)); continue; }
      items.push(lessonCardHTML(lessons, date, now, { next: num === next }));
    }
    const rows = 1 + items.length; // шапка + строки пар
    const body = byNum.size ? items.join("") : '<div class="day__empty">Пар нет</div>';

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
  function stripHTML(days, now) {
    return `<div class="strip" role="tablist" aria-label="Дни недели">${days.map((d, i) => {
      const have = new Set(lessonsByNum(isoDate(d)).keys());
      const count = have.size;
      // точки в два ряда: первая и вторая смена (граница — как в пересменке);
      // на каждую пару сетки — точка, свободная пара — пустая
      const row = (second) => `<span>${state.lessonNums
        .filter((n) => ((state.bells.get(n)?.timeStart ?? "") >= SHIFT_BORDER) === second)
        .map((n) => `<i${have.has(n) ? "" : ' class="is-empty"'}></i>`).join("")}</span>`;
      const active = i === state.dayIndex;
      return `<button class="strip__day${active ? " is-active" : ""}${isoDate(d) === isoDate(now) ? " is-today" : ""}" data-pick-day="${i}" role="tab" aria-selected="${active}"
          aria-label="${esc(`${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}: ${count ? `${count} ${plural(count, ["пара", "пары", "пар"])}` : "пар нет"}`)}">
        <span class="strip__wd">${WEEKDAYS[d.getDay()]}</span>
        <span class="strip__num">${d.getDate()}</span>
        <span class="strip__dots" aria-hidden="true">${row(false)}${row(true)}</span>
      </button>`;
    }).join("")}</div>`;
  }

  function dayViewHTML(days, now) {
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
    if (!present.length) {
      const nextDay = days.findIndex((d, i) => i > state.dayIndex && lessonsByNum(isoDate(d)).size);
      content = `<div class="empty">
        <span class="empty__icon">${ICON.coffee}</span>
        <b>Пар нет</b>
        <span>Можно выдохнуть и заняться своими делами</span>
        ${nextDay >= 0 ? `<button class="btn btn--soft" data-pick-day="${nextDay}">Следующий учебный день — ${WEEKDAYS_FULL[days[nextDay].getDay()].toLowerCase()}</button>` : ""}
      </div>`;
    } else {
      const next = nextNum(byNum, date, now);
      const from = state.lessonNums.indexOf(present[0]), to = state.lessonNums.indexOf(present.at(-1));
      let rows = "";
      let prevIsAfterShift = false;
      for (const num of state.lessonNums.slice(from, to + 1)) {
        const bells = state.bells.get(num);
        const isAfterShift = bells ? bells.timeStart >= SHIFT_BORDER : false;
        if (rows && isAfterShift && !prevIsAfterShift) rows += '<li class="tl-row tl-row--shift"><span></span><span class="tl-rail"></span><div class="shift-divider" role="separator">пересменка</div></li>';
        prevIsAfterShift = isAfterShift;

        const lessons = byNum.get(num);
        const time = lessons ? lessons[0] : bells; // у пары может быть своё время, отличное от общей сетки звонков
        const t = time && timing(time, date, now);
        const rowCls = ["tl-row", !lessons && "tl-row--window", t && `is-${t.kind}`].filter(Boolean).join(" ");
        rows += `<li class="${rowCls}">
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

    return `<div class="dayview">
      ${stripHTML(days, now)}
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

  function skeletonHTML() {
    const cards = (n) => '<div class="sk sk--card"></div>'.repeat(n);
    if (state.view === "day") return `<div class="dayview"><div class="sk sk--strip"></div><div class="sk sk--title"></div>${cards(4)}</div>`;
    return Array.from({ length: 6 }, () => `<section class="day"><div class="sk sk--head"></div>${cards(4)}</section>`).join("");
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
    renderTodayBtn();

    if (state.error) {
      week.className = "week is-msg";
      week.innerHTML = `<div class="empty">
        <span class="empty__icon empty__icon--warn">${ICON.alert}</span>
        <b>Не удалось загрузить расписание</b>
        <span>Проверьте подключение к интернету</span>
        <button class="btn btn--accent" id="retry">Повторить</button>
      </div>`;
      return;
    }
    if (state.loadingWeek) {
      week.className = `week${state.view === "day" ? " is-day" : ""} is-loading`;
      week.innerHTML = skeletonHTML();
      return;
    }
    const now = new Date();
    if (!state.week) {
      renderPeriod(null, now);
      week.className = "week is-msg";
      week.innerHTML = `<div class="empty"><span class="empty__icon">${ICON.calendar}</span><b>Расписание ещё не опубликовано</b><span>Загляните позже или вернитесь к текущей неделе</span></div>`;
      return;
    }

    const days = weekDates();
    if (state.view === "day" && state.dayIndex == null) {
      const t = days.findIndex((d) => isoDate(d) === isoDate(now));
      state.dayIndex = t >= 0 ? t : 0;
    }
    renderPeriod(days, now);
    renderTodayBtn();

    if (!state.lessons.length && state.view === "week") {
      week.className = "week is-msg";
      week.innerHTML = `<div class="empty"><span class="empty__icon">${ICON.coffee}</span><b>На этой неделе пар нет</b><span>Отдыхайте — или посмотрите соседние недели</span></div>`;
    } else if (state.view === "day") {
      week.className = "week is-day";
      week.innerHTML = dayViewHTML(days, now);
    } else {
      week.className = "week";
      week.innerHTML = days.map((d, i) => dayColumnHTML(d, i, now)).join("");
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
    if (state.view === "week" && today && today.offsetLeft + today.offsetWidth > week.clientWidth) {
      week.scrollLeft = today.offsetLeft - 8;
    }
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
  }

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
    renderList();
  });
  $("#search").addEventListener("keydown", (e) => {
    if (e.key === "Escape" && e.target.value) { e.stopPropagation(); clearSearch(); renderList(); }
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
  }
  $("#drawerBackdrop").addEventListener("click", () => setDrawer(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("#app").classList.contains("is-drawer-open")) setDrawer(false);
  });
  mobileMQ.addEventListener("change", () => setDrawer(false));

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
    if (item.dataset.divisionId) state.divisionId = item.dataset.divisionId;
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
    return `<div class="place${l.note ? " is-changed" : ""}">
      <span class="place__room">${esc(roomOf(l))}</span>
      <div class="place__text">
        <span class="place__corps">${div ? esc("Корпус " + div.corps) : "Кабинет"}</span>
        ${addr ? `<span class="place__addr">${esc(addr)}</span>` : ""}
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

  function openLesson(lessons) {
    if (!lessons || !lessons.length) return;
    const l0 = lessons[0];
    const d = parseISO(l0.date);
    const subject = l0.subject ? l0.subject.name : "Пара";
    const abbName = l0.subject?.abb_name || "";
    const multi = lessons.length > 1;
    const sameTeacher = lessons.every((l) => l.teacher?.name === l0.teacher?.name);
    const allSameGroup = lessons.every((l) => l.group?.name === l0.group?.name);
    const sameRoom = lessons.every((l) => roomOf(l) === roomOf(l0));
    const sgMark = (l) => l.subgroup || l.group?.name.match(/^[А-ЯЁA-Z]+/i)?.[0] || "•";
    const partLabel = (l) => l.subgroup ? `${l.subgroup} подгруппа` : (!allSameGroup && l.group ? l.group.name : "Группа");

    $("#mHead").innerHTML = `
      <div class="modal__meta">
        <span class="meta-item">${ICON.calendar}${esc(`${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`)}</span>
        <span class="meta-item">${ICON.clock}${esc(`${l0.timeStart} – ${l0.timeEnd}`)}</span>
        <span class="meta-item">${esc(l0.lessonNumber)}-я пара</span>
      </div>
      <h2 class="modal__subject" id="mTitle">${esc(subject)}</h2>
      <div class="modal__sub">${statusChipHTML(l0, d)}${abbName && abbName !== subject ? `<span>${esc(abbName)}</span>` : ""}</div>`;

    const notes = lessons.filter((l) => l.note);
    const callout = notes.length
      ? `<div class="callout callout--warn">${ICON.alert}<div>${notes.map((l) => `${multi ? `<b>${esc(partLabel(l))}:</b> ` : ""}${esc(l.note)}`).join("<br>")}</div></div>`
      : "";

    let body;
    if (!multi) {
      // Обычная пара
      const grpMeta = l0.group ? state.groups.find((g) => g.name === l0.group.name) : null;
      const facts = [
        l0.group ? `<span class="fact${grpMeta ? " nav-item" : ""}"${grpMeta ? ` data-nav-type="group" data-nav-id="${esc(grpMeta.id_1c)}" data-nav-title="${esc(l0.group.name)}" tabindex="0" role="button" aria-label="Расписание: ${esc(l0.group.name)}"` : ""}><span>Группа</span> ${esc(l0.group.name)}</span>` : "",
        l0.subgroup ? `<span class="fact"><span>Подгруппа</span> ${esc(l0.subgroup)}</span>` : "",
      ].join("");
      body = section("Где", placeHTML(l0))
        + section("Преподаватель", personHTML(l0.teacher))
        + (facts ? section("Кто занимается", `<div class="facts">${facts}</div>`) : "");
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
              <span class="sg-row__name">${esc(partLabel(l))}</span>
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
