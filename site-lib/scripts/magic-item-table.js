/* === ФИЛЬТРАЦИЯ И СОРТИРОВКА ТАБЛИЦЫ МАГИЧЕСКИХ ПРЕДМЕТОВ === */

(function () {
  const FILTER_ID = "table-filter-bar";
  const STYLE_ID = "table-filter-styles";

  function initTableFilter() {
    const old = document.getElementById(FILTER_ID);
    if (old) old.remove();

    if (window.__tableFilterAbortController) {
      window.__tableFilterAbortController.abort();
    }
    const controller = new AbortController();
    const signal = controller.signal;
    window.__tableFilterAbortController = controller;

    const table = document.querySelector("table.dataview.table-view-table");
    if (!table) return;

    const thead = table.querySelector("thead");
    const tbody =
      table.querySelector("tbody.table-view-tbody") || table.querySelector("tbody");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const totalCount = rows.length;
    if (!totalCount) return;

    const originalOrder = rows.slice();

    // =============================================
    //  Индексы столбцов
    // =============================================
    const COL_NAME = 0;
    const COL_TYPE = 1;
    const COL_RARITY = 2;
    const COL_TUNE = 3;
    const COL_REQ = 4;

    // =============================================
    //  Состояние сортировки и скрытых столбцов
    // =============================================
    let sortCol = -1;
    let sortDir = 0;
    const hiddenCols = new Set();

    // =============================================
    //  Карта порядка редкости (для умной сортировки)
    // =============================================
    const rarityOrder = {
      "нет": 0,
      "варьируется": 1,
      "обычный": 2, "обычная": 2, "обычное": 2, "common": 2,
      "необычный": 3, "необычная": 3, "необычное": 3, "uncommon": 3,
      "редкий": 4, "редкая": 4, "редкое": 4, "rare": 4,
      "очень редкий": 5, "очень редкая": 5, "очень редкое": 5, "very rare": 5,
      "легендарный": 6, "легендарная": 6, "легендарное": 6, "legendary": 6,
      "артефакт": 7, "artifact": 7,
    };

    // =============================================
    //  Стили
    // =============================================
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

        #${FILTER_ID} .item-filter-input {
          padding: 6px 10px;
          border: 1px solid var(--background-modifier-border, #444);
          border-radius: 4px;
          background: var(--background-secondary-alt, #2a2a2d);
          color: var(--text-normal, #ddd);
          font-size: 13px;
          font-family: inherit;
        }

        #${FILTER_ID} .item-search {
          flex: 1 1 180px;
          min-width: 160px;
          max-width: 280px;
        }

        #${FILTER_ID} .item-search-req {
          flex: 0 1 160px;
          min-width: 120px;
        }

        #${FILTER_ID} select.item-filter-input {
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
          transition: color .15s, border-color .15s;
        }

        #${FILTER_ID} .reset-filter-btn:hover {
          color: var(--text-error, #e55);
          border-color: var(--text-error, #e55);
        }

        #${FILTER_ID} .item-counter {
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

    // =============================================
    //  Утилиты
    // =============================================
    function cellText(row, i) {
      return (row.querySelectorAll("td")[i]?.textContent || "").trim();
    }

    function getUnique(colIndex) {
      const set = new Set();
      rows.forEach(row => {
        const val = cellText(row, colIndex);
        if (val && val !== "-") set.add(val);
      });
      return [...set].sort((a, b) =>
        a.localeCompare(b, "ru", { sensitivity: "base", numeric: true })
      );
    }

    // =============================================
    //  Сортировка
    // =============================================
    function sortTable(colIndex) {
      if (sortCol === colIndex) {
        if (sortDir === 1) sortDir = -1;
        else if (sortDir === -1) { sortDir = 0; sortCol = -1; }
        else sortDir = 1;
      } else {
        sortCol = colIndex;
        sortDir = 1;
      }

      let sorted;
      if (sortDir === 0) {
        sorted = originalOrder.slice();
      } else {
        sorted = rows.slice().sort((a, b) => {
          const valA = cellText(a, colIndex);
          const valB = cellText(b, colIndex);
          let cmp;

          if (colIndex === COL_RARITY) {
            const rA = rarityOrder[valA.toLowerCase()] ?? 999;
            const rB = rarityOrder[valB.toLowerCase()] ?? 999;
            cmp = rA - rB;
          } else {
            cmp = valA.localeCompare(valB, "ru", { sensitivity: "base", numeric: true });
          }

          return cmp * sortDir;
        });
      }

      sorted.forEach(row => tbody.appendChild(row));
      updateSortIndicators();
    }

    // =============================================
    //  Индикаторы сортировки
    // =============================================
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

    // =============================================
    //  Скрытие столбцов
    // =============================================
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

    // =============================================
    //  Навешиваем клик на заголовки
    // =============================================
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
            if (e.target.closest("a") || e.target.closest(".hide-col-btn")) return;
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

    // =============================================
    //  Мультиселект
    // =============================================
    function makeMultiSelect(placeholder, values, onChange) {
      const wrap = document.createElement("div");
      wrap.className = "ms-wrap";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ms-btn item-filter-input";
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
          Math.min(440, viewportWidth - 16, Math.max(260, rect.width))
        );

        let left = rect.left;
        if (left + width > viewportWidth - 8) left = viewportWidth - width - 8;
        if (left < 8) left = 8;

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
            if (cb.checked) selected.add(v);
            else selected.delete(v);
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
          if (drop.classList.contains("open")) closeDrop();
          else openDrop();
        },
        { signal }
      );

      document.addEventListener(
        "click",
        e => {
          if (!wrap.contains(e.target) && !drop.contains(e.target)) closeDrop();
        },
        { signal }
      );

      window.addEventListener("resize", positionDrop, { signal });
      window.addEventListener("scroll", positionDrop, { signal, capture: true });

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

    // =============================================
    //  Обычный select
    // =============================================
    function makeSelect(placeholder, values) {
      const sel = document.createElement("select");
      sel.className = "item-filter-input";
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

    // =============================================
    //  Панель фильтров
    // =============================================
    const bar = document.createElement("div");
    bar.id = FILTER_ID;

    // Поиск по названию
    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "🔍 Поиск по названию…";
    search.className = "item-filter-input item-search";

    // Мультиселекты для Тип и Редкость
    const mSelType = makeMultiSelect("— Тип —", getUnique(COL_TYPE), apply);
    const mSelRarity = makeMultiSelect("— Редкость —", [
      "Нет",
	  "Обычный",
	  "Необычный",
	  "Редкий",
	  "Очень Редкий",
	  "Легендарный",
	  "Артефакт",
	  "Варьируется"], apply);

    // Обычный select для Настройка
    const selTune = makeSelect("— Настройка —", getUnique(COL_TUNE));

    // Текстовый поиск по требованию
    const searchReq = document.createElement("input");
    searchReq.type = "text";
    searchReq.placeholder = "🔍 Требование…";
    searchReq.className = "item-filter-input item-search-req";

    // Кнопка сброса
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "reset-filter-btn";
    reset.textContent = "✕";
    reset.title = "Сбросить фильтры и сортировку";

    // Счётчик
    const counter = document.createElement("span");
    counter.className = "item-counter";
    counter.textContent = `Найдено: ${totalCount}`;

    bar.append(search, mSelType, mSelRarity, selTune, searchReq, reset, counter);
    table.parentElement.insertBefore(bar, table);

    // =============================================
    //  Логика фильтрации
    // =============================================
    function apply() {
      const q = search.value.toLowerCase().trim();
      const types = mSelType.getSelected();
      const rarities = mSelRarity.getSelected();
      const fn = selTune.value;
      const fq = searchReq.value.toLowerCase().trim();

      let count = 0;

      rows.forEach(row => {
        const name = cellText(row, COL_NAME).toLowerCase();
        const type = cellText(row, COL_TYPE);
        const rarity = cellText(row, COL_RARITY);
        const tune = cellText(row, COL_TUNE);
        const req = cellText(row, COL_REQ).toLowerCase();

        const ok =
          (!q || name.includes(q)) &&
          (!types.length || types.includes(type)) &&
          (!rarities.length || rarities.includes(rarity)) &&
          (!fn || tune === fn) &&
          (!fq || req.includes(fq));

        row.style.display = ok ? "" : "none";
        if (ok) count++;
      });

      counter.textContent = `Найдено: ${count}`;
      const hc = table.querySelector("th .dataview.small-text");
      if (hc) hc.textContent = count;
    }

    // =============================================
    //  Сброс
    // =============================================
    reset.addEventListener(
      "click",
      () => {
        search.value = "";
        selTune.value = "";
        searchReq.value = "";
        mSelType.reset();
        mSelRarity.reset();

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

    // =============================================
    //  Слушатели
    // =============================================
    search.addEventListener("input", apply, { signal });
    searchReq.addEventListener("input", apply, { signal });
    selTune.addEventListener("change", apply, { signal });
  }

  // ===================================================
  //  Инициализация
  // ===================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTableFilter, { once: true });
  } else {
    initTableFilter();
  }
})();
