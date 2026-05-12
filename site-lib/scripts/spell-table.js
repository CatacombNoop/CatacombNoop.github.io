/* === ФИЛЬТРАЦИЯ И СОРТИРОВКА ТАБЛИЦЫ ЗАКЛИНАНИЙ === */
(function () {
  const FILTER_ID = "spell-table-filter-bar";

  function initSpellTableFilter() {
    const old = document.getElementById(FILTER_ID);
    if (old) old.remove();

    const table = document.querySelector("table.dataview.table-view-table");
    if (!table) return;

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody.table-view-tbody");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const totalCount = rows.length;
    if (!totalCount) return;

    const originalOrder = rows.slice();

    // Индексы колонок (Ритуал добавлен перед Особое)
    const COL_NAME = 0;
    const COL_LEVEL = 1;
    const COL_SCHOOL = 2;
    const COL_TIME = 3;
    const COL_COMPONENTS = 4;
    const COL_DURATION = 5;
    const COL_CONCENTRATION = 6;
    const COL_RITUAL = 7;      // Новая колонка
    const COL_SPECIAL = 8;
    const COL_SOURCE = 9;

    let sortCol = -1;
    let sortDir = 0;

    const timeOptions = ["Действие", "Бонусное Действие", "Реакция", "Минуты", "Часы", "Особое"];
    const timeOrder = {
      "Действие": 1,
      "Бонусное Действие": 2,
      "Реакция": 3,
      "Минуты": 4,
      "Часы": 5,
      "Особое": 6
    };

    // Классы span, которые нужно учитывать как отдельные значения
    const SPECIAL_SPAN_CLASSES = ["school-text-box", "school2-text-box", "ritual-text-box"];

    function cellText(row, i) {
      return (row.querySelectorAll("td")[i]?.textContent || "").trim();
    }

    // Функция: получение значений из span с определёнными классами
    function getSpecialSpanValues(row, colIndex) {
      const cell = row.querySelectorAll("td")[colIndex];
      if (!cell) return [];
      
      const values = [];
      
      // Ищем все span с нужными классами
      SPECIAL_SPAN_CLASSES.forEach(cls => {
        const spans = cell.querySelectorAll(`span.${cls}`);
        spans.forEach(span => {
          const text = span.textContent.trim();
          if (text) {
            values.push(text);
          }
        });
      });
      
      // Если не найдены специальные классы, пробуем получить все span напрямую
      if (values.length === 0) {
        const allSpans = cell.querySelectorAll(":scope > span");
        allSpans.forEach(span => {
          const text = span.textContent.trim();
          if (text) {
            values.push(text);
          }
        });
      }
      
      return values;
    }

    // Получение первого значения из специальных span (для сортировки)
    function firstSpecialSpanValue(row, colIndex, filterType = null) {
      const values = getSpecialSpanValues(row, colIndex);
      if (filterType === "ritual") {
        // Для ритуала: возвращаем специальное значение если ритуала нет
        return values.length > 0 ? values[0] : "(Без ритуала)";
      }
      return values.length > 0 ? values[0] : cellText(row, colIndex);
    }

    function normalizeTime(value) {
      const v = value.toLowerCase();
      const out = [];

      if (/\реакц/.test(v)) out.push("Реакция");
      if (/бонусн/.test(v)) out.push("Бонусное Действие");
      else if (/\действ/.test(v)) out.push("Действие");

      if (/минут/.test(v)) out.push("Минуты");
      if (/час/.test(v)) out.push("Часы");

      return out.length ? [...new Set(out)] : ["Особое"];
    }

    function timeSortRank(value) {
      return Math.min(...normalizeTime(value).map(v => timeOrder[v] ?? 99));
    }

    function getComponents(value) {
      const v = value.toUpperCase();
      return ["В", "С", "М"].filter(c => new RegExp(`(^|[^А-ЯA-Z])${c}([^А-ЯA-Z]|$)`).test(v));
    }

    function splitValues(value) {
      return value
        .split(/[,;/]+/)
        .map(v => v.trim())
        .filter(Boolean);
    }

    // Получение уникальных значений для столбца
    function getUnique(colIndex, useSpecialSpans = false, splitter = null) {
      const set = new Set();
      rows.forEach(row => {
        if (useSpecialSpans) {
          const spanValues = getSpecialSpanValues(row, colIndex);
          spanValues.forEach(v => {
            if (v && v !== "-") set.add(v);
          });
        } else if (splitter) {
          const val = cellText(row, colIndex);
          const values = splitter(val);
          values.forEach(v => {
            if (v && v !== "-") set.add(v);
          });
        } else {
          const val = cellText(row, colIndex);
          if (val && val !== "-") set.add(val);
        }
      });
      return [...set].sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base", numeric: true }));
    }

    function sortTable(colIndex) {
      if (sortCol === colIndex) {
        if (sortDir === 1) sortDir = -1;
        else if (sortDir === -1) {
          sortDir = 0;
          sortCol = -1;
        } else sortDir = 1;
      } else {
        sortCol = colIndex;
        sortDir = 1;
      }

      let sorted;

      if (sortDir === 0) {
        sorted = originalOrder.slice();
      } else {
        // Определяем, нужно ли использовать специальные span для этого столбца
        const useSpecialSpans = (colIndex === COL_RITUAL || colIndex === COL_SPECIAL || colIndex === COL_SOURCE);
        const filterType = colIndex === COL_RITUAL ? "ritual" : null;
        
        sorted = rows.slice().sort((a, b) => {
          let valA, valB;
          
          if (useSpecialSpans) {
            valA = firstSpecialSpanValue(a, colIndex, filterType);
            valB = firstSpecialSpanValue(b, colIndex, filterType);
          } else {
            valA = cellText(a, colIndex);
            valB = cellText(b, colIndex);
          }
          
          let cmp;

          if (colIndex === COL_LEVEL) {
            cmp = (parseInt(valA, 10) || 0) - (parseInt(valB, 10) || 0);
          } else if (colIndex === COL_TIME) {
            cmp = timeSortRank(valA) - timeSortRank(valB);
            if (!cmp) cmp = valA.localeCompare(valB, "ru", { sensitivity: "base", numeric: true });
          } else {
            cmp = valA.localeCompare(valB, "ru", { sensitivity: "base", numeric: true });
          }

          return cmp * sortDir;
        });
      }

      sorted.forEach(row => tbody.appendChild(row));
      updateSortIndicators();
    }

    function updateSortIndicators() {
      if (!thead) return;

      thead.querySelectorAll("th").forEach((th, i) => {
        const oldIcon = th.querySelector(".sort-icon");
        if (oldIcon) oldIcon.remove();

        const icon = document.createElement("span");
        icon.className = "sort-icon";
        icon.style.cssText = "margin-left:4px;font-size:11px;opacity:.5;user-select:none;";

        if (i === sortCol) {
          icon.textContent = sortDir === 1 ? " ▲" : sortDir === -1 ? " ▼" : " ⇅";
          icon.style.opacity = "1";
        } else {
          icon.textContent = " ⇅";
        }

        th.appendChild(icon);
      });
    }

    if (thead) {
      thead.querySelectorAll("th").forEach((th, i) => {
        th.style.cursor = "pointer";
        th.style.userSelect = "none";
        th.title = "Нажмите для сортировки";

        th.addEventListener("mouseenter", () => {
          th.style.background = "var(--background-modifier-hover, rgba(255,255,255,0.05))";
        });

        th.addEventListener("mouseleave", () => {
          th.style.background = "";
        });

        th.addEventListener("click", e => {
          if (e.target.tagName === "A") return;
          sortTable(i);
        });
      });

      updateSortIndicators();
    }

    const inputCSS = `
      padding: 6px 10px;
      border: 1px solid var(--background-modifier-border, #444);
      border-radius: 4px;
      background: var(--background-secondary-alt, #2a2a2d);
      color: var(--text-normal, #ddd);
      font-size: 13px;
      font-family: inherit;
    `;

    const bar = document.createElement("div");
    bar.id = FILTER_ID;
    bar.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
      align-items: center;
    `;

    function makeSelect(placeholder, values) {
      const sel = document.createElement("select");
      sel.style.cssText = inputCSS + "cursor:pointer;";
      const def = document.createElement("option");
      def.value = "";
      def.textContent = placeholder;
      sel.appendChild(def);

      values.forEach(v => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        sel.appendChild(o);
      });

      return sel;
    }

    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "🔍 Заклинание…";
    search.style.cssText = inputCSS + "flex:1 1 180px;min-width:160px;";

    // Селекты для фильтров
    const selLevel = makeSelect("— Уровень —", getUnique(COL_LEVEL));
    const selSchool = makeSelect("— Школа —", getUnique(COL_SCHOOL));
    const selTime = makeSelect("— Время —", timeOptions);
    const selConc = makeSelect("— Концентрация —", getUnique(COL_CONCENTRATION));
    // Новые фильтры для колонок со special spans
    const selRitual = makeSelect("— Ритуал —", ["(Без ритуала)", ...getUnique(COL_RITUAL, true)]);
    const selSpecial = makeSelect("— Особое —", getUnique(COL_SPECIAL, true));
    const selSource = makeSelect("— Сборник —", getUnique(COL_SOURCE, true));

    const compBox = document.createElement("div");
    compBox.style.cssText = "display:flex;gap:6px;align-items:center;";
    const compChecks = {};

    ["В", "С", "М"].forEach(c => {
      const label = document.createElement("label");
      label.style.cssText = inputCSS + "display:flex;gap:4px;align-items:center;cursor:pointer;padding:5px 8px;";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = c;
      compChecks[c] = cb;

      label.append(cb, document.createTextNode(c));
      compBox.appendChild(label);
    });

    const reset = document.createElement("button");
    reset.textContent = "✕";
    reset.title = "Сбросить фильтры и сортировку";
    reset.style.cssText = `
      padding: 6px 10px;
      border: 1px solid var(--background-modifier-border, #444);
      border-radius: 4px;
      background: transparent;
      color: var(--text-muted, #888);
      font-size: 14px;
      cursor: pointer;
      line-height: 1;
    `;

    const counter = document.createElement("span");
    counter.style.cssText = "color:var(--text-muted,#888);font-size:12px;white-space:nowrap;";
    counter.textContent = `Найдено: ${totalCount}`;

    // Добавляем все элементы в панель (Ритуал после Концентрации)
    bar.append(search, selLevel, selSchool, selTime, compBox, selConc, selRitual, selSpecial, selSource, reset, counter);
    table.parentElement.insertBefore(bar, table);

    function apply() {
      const q = search.value.toLowerCase().trim();
      const level = selLevel.value;
      const school = selSchool.value;
      const time = selTime.value;
      const conc = selConc.value;
      const ritual = selRitual.value;
      const special = selSpecial.value;
      const source = selSource.value;
      const neededComps = Object.values(compChecks).filter(c => c.checked).map(c => c.value);

      let count = 0;

      rows.forEach(row => {
        const name = cellText(row, COL_NAME).toLowerCase();
        const rowLevel = cellText(row, COL_LEVEL);
        const rowSchool = cellText(row, COL_SCHOOL);
        const rowTime = normalizeTime(cellText(row, COL_TIME));
        const rowComps = getComponents(cellText(row, COL_COMPONENTS));
        const rowConc = cellText(row, COL_CONCENTRATION);
        
        // Получаем все значения из special span для Ритуала, Особое и Сборника
        const rowRitual = getSpecialSpanValues(row, COL_RITUAL);
        const rowSpecial = getSpecialSpanValues(row, COL_SPECIAL);
        const rowSource = getSpecialSpanValues(row, COL_SOURCE);
        
        // Проверка для фильтра "Без ритуала"
        const hasRitual = rowRitual.length > 0;
        const ritualFilterOk = !ritual || (ritual === "(Без ритуала)" ? !hasRitual : rowRitual.includes(ritual));

        const ok =
          (!q || name.includes(q)) &&
          (!level || rowLevel === level) &&
          (!school || rowSchool === school) &&
          (!time || rowTime.includes(time)) &&
          (!conc || rowConc === conc) &&
          ritualFilterOk &&
          (!special || rowSpecial.includes(special)) &&
          (!source || rowSource.includes(source)) &&
          neededComps.every(c => rowComps.includes(c));

        row.style.display = ok ? "" : "none";
        if (ok) count++;
      });

      counter.textContent = `Найдено: ${count}`;

      const hc = table.querySelector("th .dataview.small-text");
      if (hc) hc.textContent = count;
    }

    reset.addEventListener("click", () => {
      search.value = "";
      selLevel.value = "";
      selSchool.value = "";
      selTime.value = "";
      selConc.value = "";
      selRitual.value = "";
      selSpecial.value = "";
      selSource.value = "";
      Object.values(compChecks).forEach(c => c.checked = false);

      sortCol = -1;
      sortDir = 0;
      originalOrder.forEach(row => tbody.appendChild(row));
      updateSortIndicators();
      apply();

      const hc = table.querySelector("th .dataview.small-text");
      if (hc) hc.textContent = totalCount;
    });

    // Добавляем слушатели событий для всех селектов
    [search, selLevel, selSchool, selTime, selConc, selRitual, selSpecial, selSource].forEach(el => {
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", apply);
    });

    Object.values(compChecks).forEach(cb => cb.addEventListener("change", apply));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSpellTableFilter);
  } else {
    initSpellTableFilter();
  }
})();