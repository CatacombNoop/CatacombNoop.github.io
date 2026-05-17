/* === ФИЛЬТРАЦИЯ И СОРТИРОВКА ТАБЛИЦЫ ЗАКЛИНАНИЙ === */

(function () {
  const FILTER_ID = "spell-table-filter-bar";
  const STYLE_ID = "spell-table-filter-styles";

  function initSpellTableFilter() {
    const old = document.getElementById(FILTER_ID);
    if (old) old.remove();

    if (window.__spellTableFilterAbortController) {
      window.__spellTableFilterAbortController.abort();
    }

    const controller = new AbortController();
    const signal = controller.signal;
    window.__spellTableFilterAbortController = controller;

    const table = document.querySelector("table.dataview.table-view-table");
    if (!table) return;

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody.table-view-tbody") || table.querySelector("tbody");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const totalCount = rows.length;
    if (!totalCount) return;

    const originalOrder = rows.slice();

    const COL_NAME = 0;
    const COL_LEVEL = 1;
    const COL_SCHOOL = 2;
    const COL_TIME = 3;
    const COL_COMPONENTS = 4;
    const COL_DURATION = 5;
    const COL_CONCENTRATION = 6;
    const COL_RITUAL = 7;
    const COL_SPECIAL = 8;
    const COL_SOURCE = 9;

    let sortCol = -1;
    let sortDir = 0;

    const hiddenCols = new Set();

    const timeOptions = [
      "Действие",
      "Бонусное Действие",
      "Реакция",
      "Минуты",
      "Часы",
      "Особое"
    ];

    const timeOrder = {
      "Действие": 1,
      "Бонусное Действие": 2,
      "Реакция": 3,
      "Минуты": 4,
      "Часы": 5,
      "Особое": 6
    };

    const SPECIAL_SPAN_CLASSES = [
      "school-text-box",
      "school2-text-box",
      "ritual-text-box"
    ];

    injectStyles();

    function injectStyles() {
      if (document.getElementById(STYLE_ID)) return;

      const styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;

      styleEl.textContent = `
        #${FILTER_ID} {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
          align-items: center;
          max-width: 100%;
        }

        #${FILTER_ID},
        #${FILTER_ID} * {
          box-sizing: border-box;
        }

        #${FILTER_ID} .spell-filter-input {
          padding: 6px 10px;
          border: 1px solid var(--background-modifier-border, #444);
          border-radius: 4px;
          background: var(--background-secondary-alt, #2a2a2d);
          color: var(--text-normal, #ddd);
          font-size: 13px;
          font-family: inherit;
        }

        #${FILTER_ID} .spell-search {
          flex: 1 1 180px;
          min-width: 160px;
          max-width: 280px;
        }

        #${FILTER_ID} select.spell-filter-input {
          flex: 0 0 170px;
          width: 170px;
          min-width: 0;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        #${FILTER_ID} .ms-wrap {
          position: relative;
          flex: 0 0 170px;
          width: 170px;
          max-width: 170px;
          min-width: 0;
        }

        #${FILTER_ID} .ms-btn {
          width: 100%;
          max-width: 100%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          white-space: nowrap;
          user-select: none;
          line-height: 1.25;
          text-align: left;
        }

        #${FILTER_ID} .ms-btn-text {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        #${FILTER_ID} .ms-btn::after {
          content: "▾";
          flex: 0 0 auto;
          font-size: 10px;
          opacity: .65;
        }

        .ms-drop {
          display: none;
          position: fixed;
          z-index: 100000;
          min-width: 180px;
          max-width: calc(100vw - 16px);
          overflow-y: auto;
          overflow-x: hidden;
          border: 1px solid var(--background-modifier-border, #444);
          border-radius: 6px;
          background: var(--background-secondary-alt, #2a2a2d);
          box-shadow: 0 8px 24px rgba(0, 0, 0, .45);
          padding: 4px 0;
        }

        .ms-drop.open {
          display: block;
        }

        .ms-drop label {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 5px 10px;
          cursor: pointer;
          font-size: 13px;
          line-height: 1.3;
          color: var(--text-normal, #ddd);
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .ms-drop label:hover {
          background: var(--background-modifier-hover, rgba(255,255,255,.06));
        }

        .ms-drop input[type="checkbox"] {
          flex: 0 0 auto;
          margin-top: 2px;
        }

        .ms-label-text {
          flex: 1 1 auto;
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        #${FILTER_ID} .comp-box {
          flex: 0 0 auto;
          display: flex;
          gap: 6px;
          align-items: center;
        }

        #${FILTER_ID} .comp-label {
          display: flex;
          gap: 4px;
          align-items: center;
          cursor: pointer;
          padding: 5px 8px;
          white-space: nowrap;
        }

        #${FILTER_ID} .special-toggle {
          flex: 0 1 215px;
          min-width: 170px;
          max-width: 230px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        #${FILTER_ID} .reset-filter-btn {
          flex: 0 0 auto;
          padding: 6px 10px;
          border: 1px solid var(--background-modifier-border, #444);
          border-radius: 4px;
          background: transparent;
          color: var(--text-muted, #888);
          font-size: 14px;
          cursor: pointer;
          line-height: 1;
        }

        #${FILTER_ID} .spell-counter {
          flex: 0 0 auto;
          color: var(--text-muted, #888);
          font-size: 12px;
          white-space: nowrap;
        }

        .sort-icon {
          margin-left: 4px;
          font-size: 11px;
          opacity: .5;
          user-select: none;
        }

        .hide-col-btn {
          margin-left: 6px;
          font-size: 11px;
          opacity: .5;
          cursor: pointer;
          user-select: none;
        }
      `;

      document.head.appendChild(styleEl);
    }

    function cellText(row, i) {
      return (row.querySelectorAll("td")[i]?.textContent || "").trim();
    }

    function getSpecialSpanElements(row, colIndex) {
      const cell = row.querySelectorAll("td")[colIndex];
      if (!cell) return [];

      let spans = [];

      SPECIAL_SPAN_CLASSES.forEach(cls => {
        spans.push(...cell.querySelectorAll(`span.${cls}`));
      });

      if (!spans.length) {
        spans = Array.from(cell.querySelectorAll(":scope > span"));
      }

      return spans;
    }

    function getSpecialSpanValues(row, colIndex) {
      return getSpecialSpanElements(row, colIndex)
        .map(span => span.textContent.trim())
        .filter(Boolean);
    }

    function setSpecialSpanVisibility(row, colIndex, selectedValues) {
      const spans = getSpecialSpanElements(row, colIndex);
      if (!spans.length) return;

      const normalize = v => (v || "").replace(/\s+/g, " ").trim();
      const selArr = Array.isArray(selectedValues)
        ? selectedValues
        : selectedValues
          ? [selectedValues]
          : [];

      if (!selArr.length) {
        spans.forEach(span => {
          span.style.display = "";
        });
        return;
      }

      let hasMatch = false;

      spans.forEach(span => {
        const match = selArr.some(sv => normalize(span.textContent) === normalize(sv));
        span.style.display = match ? "" : "none";
        if (match) hasMatch = true;
      });

      if (!hasMatch) {
        spans.forEach(span => {
          span.style.display = "";
        });
      }
    }

    // Обновлённая функция
    function firstSpecialSpanValue(row, colIndex, filterType = null) {
      const values = getSpecialSpanValues(row, colIndex);
      if (filterType === "ritual") {
        return values.length > 0 ? values[0] : "(Не Ритуал)";
      }
      if (filterType === "special") {
        return values.length > 0 ? values[0] : "(Не Особое)";
      }
      return values.length > 0 ? values[0] : cellText(row, colIndex);
    }

    function normalizeTime(value) {
      const v = value.toLowerCase();
      const out = [];

      if (/реакц/.test(v)) out.push("Реакция");

      if (/бонусн/.test(v)) out.push("Бонусное Действие");
      else if (/действ/.test(v)) out.push("Действие");

      if (/минут/.test(v)) out.push("Минуты");
      if (/час/.test(v)) out.push("Часы");

      return out.length ? [...new Set(out)] : ["Особое"];
    }

    function timeSortRank(value) {
      return Math.min(...normalizeTime(value).map(v => timeOrder[v] ?? 99));
    }

    function getComponents(value) {
      const v = value.toUpperCase();

      return ["В", "С", "М"].filter(c =>
        new RegExp(`(^|[^А-ЯA-Z])${c}([^А-ЯA-Z]|$)`).test(v)
      );
    }

    function splitValues(value) {
      return value
        .split(/[,;/]+/)
        .map(v => v.trim())
        .filter(Boolean);
    }

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

      return [...set].sort((a, b) =>
        a.localeCompare(b, "ru", {
          sensitivity: "base",
          numeric: true
        })
      );
    }

    function sortTable(colIndex) {
      if (sortCol === colIndex) {
        if (sortDir === 1) {
          sortDir = -1;
        } else if (sortDir === -1) {
          sortDir = 0;
          sortCol = -1;
        } else {
          sortDir = 1;
        }
      } else {
        sortCol = colIndex;
        sortDir = 1;
      }

      let sorted;

      if (sortDir === 0) {
        sorted = originalOrder.slice();
      } else {
        const useSpecialSpans =
          colIndex === COL_RITUAL ||
          colIndex === COL_SPECIAL ||
          colIndex === COL_SOURCE;

        const filterType = colIndex === COL_RITUAL ? "ritual" : colIndex === COL_SPECIAL ? "special" : null;

        sorted = rows.slice().sort((a, b) => {
          let valA;
          let valB;

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

            if (!cmp) {
              cmp = valA.localeCompare(valB, "ru", {
                sensitivity: "base",
                numeric: true
              });
            }
          } else {
            cmp = valA.localeCompare(valB, "ru", {
              sensitivity: "base",
              numeric: true
            });
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

        if (i === sortCol) {
          icon.textContent = sortDir === 1 ? " ▲" : sortDir === -1 ? " ▼" : " ⇅";
          icon.style.opacity = "1";
        } else {
          icon.textContent = " ⇅";
        }

        th.appendChild(icon);
      });
    }

    function toggleColumn(colIndex) {
      if (hiddenCols.has(colIndex)) {
        hiddenCols.delete(colIndex);
      } else {
        hiddenCols.add(colIndex);
      }

      updateColumnVisibility();
    }

    function updateColumnVisibility() {
      if (!thead) return;

      const ths = thead.querySelectorAll("th");

      ths.forEach((th, i) => {
        const isHidden = hiddenCols.has(i);
        th.style.display = isHidden ? "none" : "";

        rows.forEach(row => {
          const td = row.querySelectorAll("td")[i];
          if (td) td.style.display = isHidden ? "none" : "";
        });
      });
    }

    if (thead) {
      thead
        .querySelectorAll(".sort-icon, .hide-col-btn, span[title='Скрыть столбец']")
        .forEach(el => el.remove());

      thead.querySelectorAll("th").forEach((th, i) => {
        th.style.cursor = "pointer";
        th.style.userSelect = "none";
        th.title = "Нажмите для сортировки";

        th.addEventListener(
          "mouseenter",
          () => {
            th.style.background =
              "var(--background-modifier-hover, rgba(255,255,255,0.05))";
          },
          { signal }
        );

        th.addEventListener(
          "mouseleave",
          () => {
            th.style.background = "";
          },
          { signal }
        );

        th.addEventListener(
          "click",
          e => {
            if (
              e.target.closest("a") ||
              e.target.closest(".hide-col-btn")
            ) {
              return;
            }

            sortTable(i);
          },
          { signal }
        );

        const hideBtn = document.createElement("span");
        hideBtn.className = "hide-col-btn";
        hideBtn.textContent = "✕";
        hideBtn.title = "Скрыть столбец";

        hideBtn.addEventListener(
          "click",
          e => {
            e.stopImmediatePropagation();
            toggleColumn(i);
          },
          { signal }
        );

        th.appendChild(hideBtn);
      });

      updateSortIndicators();
    }

    const bar = document.createElement("div");
    bar.id = FILTER_ID;

    function makeMultiSelect(placeholder, values, onChange) {
      const wrap = document.createElement("div");
      wrap.className = "ms-wrap";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ms-btn spell-filter-input";
      btn.title = placeholder;

      const btnText = document.createElement("span");
      btnText.className = "ms-btn-text";
      btnText.textContent = placeholder;

      btn.appendChild(btnText);

      const drop = document.createElement("div");
      drop.className = "ms-drop";

      const selected = new Set();

      function updateButtonText() {
        const selectedValues = [...selected];

        let text;

        if (!selectedValues.length) {
          text = placeholder;
        } else if (selectedValues.length <= 2) {
          text = selectedValues.join(", ");
        } else {
          text = `${selectedValues[0]} (+${selectedValues.length - 1})`;
        }

        btnText.textContent = text;
        btn.title = selectedValues.length ? selectedValues.join(", ") : placeholder;
      }

      function positionDrop() {
        if (!drop.classList.contains("open")) return;

        const rect = btn.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;

        const width = Math.max(
          180,
          Math.min(
            440,
            viewportWidth - 16,
            Math.max(260, rect.width)
          )
        );

        let left = rect.left;

        if (left + width > viewportWidth - 8) {
          left = viewportWidth - width - 8;
        }

        if (left < 8) {
          left = 8;
        }

        const gap = 4;
        const spaceBelow = viewportHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;

        let maxHeight = Math.min(260, Math.max(120, spaceBelow - gap));
        let top = rect.bottom + gap;

        if (spaceBelow < 160 && spaceAbove > spaceBelow) {
          maxHeight = Math.min(260, Math.max(120, spaceAbove - gap));
          top = Math.max(8, rect.top - gap - maxHeight);
        }

        drop.style.width = `${width}px`;
        drop.style.left = `${left}px`;
        drop.style.top = `${top}px`;
        drop.style.maxHeight = `${maxHeight}px`;
      }

      function closeDrop() {
        drop.classList.remove("open");
      }

      function openDrop() {
        document.querySelectorAll(".ms-drop.open").forEach(d => {
          if (d !== drop) d.classList.remove("open");
        });

        drop.classList.add("open");
        positionDrop();
      }

      values.forEach(v => {
        const lbl = document.createElement("label");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = v;

        const text = document.createElement("span");
        text.className = "ms-label-text";
        text.textContent = v;

        lbl.append(cb, text);
        drop.appendChild(lbl);

        cb.addEventListener(
          "change",
          () => {
            if (cb.checked) {
              selected.add(v);
            } else {
              selected.delete(v);
            }

            updateButtonText();
            onChange();
            positionDrop();
          },
          { signal }
        );
      });

      btn.addEventListener(
        "click",
        e => {
          e.stopPropagation();

          if (drop.classList.contains("open")) {
            closeDrop();
          } else {
            openDrop();
          }
        },
        { signal }
      );

      document.addEventListener(
        "click",
        e => {
          if (!wrap.contains(e.target) && !drop.contains(e.target)) {
            closeDrop();
          }
        },
        { signal }
      );

      window.addEventListener("resize", positionDrop, { signal });
      window.addEventListener("scroll", positionDrop, {
        signal,
        capture: true
      });

      wrap.append(btn, drop);

      wrap.getSelected = () => [...selected];

      wrap.reset = () => {
        selected.clear();

        drop.querySelectorAll("input[type='checkbox']").forEach(c => {
          c.checked = false;
        });

        updateButtonText();
      };

      return wrap;
    }

    function makeSelect(placeholder, values) {
      const sel = document.createElement("select");
      sel.className = "spell-filter-input";

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
    search.className = "spell-filter-input spell-search";

    const mSelLevel = makeMultiSelect("— Уровень —", getUnique(COL_LEVEL), apply);
    const mSelSchool = makeMultiSelect("— Школа —", getUnique(COL_SCHOOL), apply);
    const mSelTime = makeMultiSelect("— Время —", timeOptions, apply);
    const mSelSpecial = makeMultiSelect("— Особое —", [
      "(Не Особое)",
      ...getUnique(COL_SPECIAL, true)
    ], apply);
    const mSelSource = makeMultiSelect("— Сборник —", getUnique(COL_SOURCE, true), apply);

    const selConc = makeSelect("— Концентрация —", getUnique(COL_CONCENTRATION));
    const selRitual = makeSelect("— Ритуал —", [
      "(Не Ритуал)",
      ...getUnique(COL_RITUAL, true)
    ]);

    const compBox = document.createElement("div");
    compBox.className = "comp-box";

    const compChecks = {};

    ["В", "С", "М"].forEach(c => {
      const label = document.createElement("label");
      label.className = "spell-filter-input comp-label";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = c;

      compChecks[c] = cb;

      label.append(cb, document.createTextNode(c));
      compBox.appendChild(label);
    });

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "reset-filter-btn";
    reset.textContent = "✕";
    reset.title = "Сбросить фильтры и сортировку";

    const counter = document.createElement("span");
    counter.className = "spell-counter";
    counter.textContent = `Найдено: ${totalCount}`;

    const specialToggle = document.createElement("label");
    specialToggle.className = "spell-filter-input special-toggle";

    const specialCheckbox = document.createElement("input");
    specialCheckbox.type = "checkbox";

    specialToggle.append(
      specialCheckbox,
      document.createTextNode("Скрыть без «Особое»")
    );

    bar.append(
      search,
      mSelLevel,
      mSelSchool,
      mSelTime,
      compBox,
      selConc,
      selRitual,
      mSelSpecial,
      mSelSource,
      specialToggle,
      reset,
      counter
    );

    table.parentElement.insertBefore(bar, table);

    function apply() {
      const q = search.value.toLowerCase().trim();

      const levels = mSelLevel.getSelected();
      const schools = mSelSchool.getSelected();
      const times = mSelTime.getSelected();

      const conc = selConc.value;
      const ritual = selRitual.value;

      const specials = mSelSpecial.getSelected();
      const sources = mSelSource.getSelected();

      const hideEmptySpecial = specialCheckbox.checked;

      const neededComps = Object.values(compChecks)
        .filter(c => c.checked)
        .map(c => c.value);

      let count = 0;

      rows.forEach(row => {
        const name = cellText(row, COL_NAME).toLowerCase();
        const rowLevel = cellText(row, COL_LEVEL);
        const rowSchool = cellText(row, COL_SCHOOL);
        const rowTime = normalizeTime(cellText(row, COL_TIME));
        const rowComps = getComponents(cellText(row, COL_COMPONENTS));
        const rowConc = cellText(row, COL_CONCENTRATION);

        const rowRitual = getSpecialSpanValues(row, COL_RITUAL);
        const rowSpecial = getSpecialSpanValues(row, COL_SPECIAL);
        const rowSource = getSpecialSpanValues(row, COL_SOURCE);

        const hasRitual = rowRitual.length > 0;
        const hasSpecial = rowSpecial.length > 0;

        const ritualFilterOk =
          !ritual ||
          (
            ritual === "(Не Ритуал)"
              ? !hasRitual
              : rowRitual.includes(ritual)
          );

        // Новая проверка для "Особое"
        const specialFilterOk =
          !specials.length ||
          (specials.includes("(Не Особое)")
            ? !hasSpecial
            : specials.some(s => rowSpecial.includes(s))
          );

        const ok =
          (!q || name.includes(q)) &&
          (!levels.length || levels.includes(rowLevel)) &&
          (!schools.length || schools.includes(rowSchool)) &&
          (!times.length || times.some(t => rowTime.includes(t))) &&
          (!conc || rowConc === conc) &&
          ritualFilterOk &&
          specialFilterOk &&
          (!sources.length || sources.some(s => rowSource.includes(s))) &&
          neededComps.every(c => rowComps.includes(c)) &&
          (!hideEmptySpecial || rowSpecial.length > 0);

        setSpecialSpanVisibility(row, COL_SPECIAL, specials);
        setSpecialSpanVisibility(row, COL_SOURCE, sources);

        row.style.display = ok ? "" : "none";

        if (ok) count++;
      });

      counter.textContent = `Найдено: ${count}`;

      const hc = table.querySelector("th .dataview.small-text");
      if (hc) hc.textContent = count;
    }

    reset.addEventListener(
      "click",
      () => {
        search.value = "";

        selConc.value = "";
        selRitual.value = "";

        mSelLevel.reset();
        mSelSchool.reset();
        mSelTime.reset();
        mSelSpecial.reset();
        mSelSource.reset();

        Object.values(compChecks).forEach(c => {
          c.checked = false;
        });

        specialCheckbox.checked = false;

        sortCol = -1;
        sortDir = 0;

        hiddenCols.clear();
        updateColumnVisibility();

        originalOrder.forEach(row => tbody.appendChild(row));

        updateSortIndicators();
        apply();
      },
      { signal }
    );

    search.addEventListener("input", apply, { signal });

    [selConc, selRitual, specialCheckbox].forEach(el => {
      el.addEventListener("change", apply, { signal });
    });

    Object.values(compChecks).forEach(cb => {
      cb.addEventListener("change", apply, { signal });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSpellTableFilter, {
      once: true
    });
  } else {
    initSpellTableFilter();
  }
})();