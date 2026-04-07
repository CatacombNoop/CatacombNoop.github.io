<!-- === ФИЛЬТРАЦИЯ И СОРТИРОВКА ТАБЛИЦЫ === -->
<script>
(function () {
  const FILTER_ID = "table-filter-bar";

  function initTableFilter() {
	const old = document.getElementById(FILTER_ID);
	if (old) old.remove();

	const table = document.querySelector("table.dataview.table-view-table");
	if (!table) return;

	const thead = table.querySelector("thead");
	const tbody = table.querySelector("tbody.table-view-tbody");
	if (!tbody) return;

	const rows = Array.from(tbody.querySelectorAll("tr"));
	const totalCount = rows.length;
	if (totalCount === 0) return;

	// =============================================
	//  Сохраняем исходный порядок строк
	// =============================================
	const originalOrder = rows.slice();

	// =============================================
	//  Карта порядка редкости (для умной сортировки)
	// =============================================
	const rarityOrder = {
	  "Нет":       	   0,
	  "варьируется":   1,
	  "Варьируется":   1,
	  "Варьируется":   1,	
	  "обычный":       2,
	  "обычная":       2,
	  "обычное":       2,
	  "common":        2,
	  "необычный":     3,
	  "необычная":     3,
	  "необычное":     3,
	  "uncommon":      3,
	  "редкий":        4,
	  "редкая":        4,
	  "редкое":        4,
	  "rare":          4,
	  "очень редкий":  5,
	  "очень редкая":  5,
	  "очень редкое":  5,
	  "very rare":     5,
	  "легендарный":   6,
	  "легендарная":   6,
	  "легендарное":   6,
	  "legendary":     6,
	  "артефакт":      7,
	  "artifact":      7,
	};

	// =============================================
	//  Состояние сортировки
	// =============================================
	let sortCol = -1;     // текущий столбец сортировки
	let sortDir = 0;      // 0 = нет, 1 = по возрастанию, -1 = по убыванию
	const RARITY_COL = 2; // индекс столбца «Редкость»

	// =============================================
	//  Функция сортировки
	// =============================================
	function sortTable(colIndex) {
	  // Определяем направление
	  if (sortCol === colIndex) {
		// Тот же столбец: asc → desc → сброс
		if (sortDir === 1) sortDir = -1;
		else if (sortDir === -1) { sortDir = 0; sortCol = -1; }
		else sortDir = 1;
	  } else {
		sortCol = colIndex;
		sortDir = 1;
	  }

	  let sorted;

	  if (sortDir === 0) {
		// Возврат к исходному порядку
		sorted = originalOrder.slice();
	  } else {
		sorted = rows.slice().sort((a, b) => {
		  const cellA = a.querySelectorAll("td")[colIndex];
		  const cellB = b.querySelectorAll("td")[colIndex];
		  const valA = (cellA?.textContent || "").trim();
		  const valB = (cellB?.textContent || "").trim();

		  let cmp;

		  if (colIndex === RARITY_COL) {
			// Сортировка по карте редкости
			const rA = rarityOrder[valA.toLowerCase()] ?? 999;
			const rB = rarityOrder[valB.toLowerCase()] ?? 999;
			cmp = rA - rB;
		  } else {
			// Обычная текстовая сортировка (с учётом локали)
			cmp = valA.localeCompare(valB, "ru", { sensitivity: "base", numeric: true });
		  }

		  return cmp * sortDir;
		});
	  }

	  // Перерисовываем строки
	  sorted.forEach(row => tbody.appendChild(row));

	  // Обновляем индикаторы в шапке
	  updateSortIndicators();
	}

	// =============================================
	//  Индикаторы сортировки в заголовках
	// =============================================
	function updateSortIndicators() {
	  if (!thead) return;
	  const ths = thead.querySelectorAll("th");
	  ths.forEach((th, i) => {
		// Удаляем старый индикатор
		const oldIcon = th.querySelector(".sort-icon");
		if (oldIcon) oldIcon.remove();

		// Добавляем новый
		const icon = document.createElement("span");
		icon.className = "sort-icon";
		icon.style.cssText = `
		  margin-left: 4px;
		  font-size: 11px;
		  opacity: 0.5;
		  user-select: none;
		`;

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
	//  Навешиваем клик на заголовки
	// =============================================
	if (thead) {
	  const ths = thead.querySelectorAll("th");
	  ths.forEach((th, i) => {
		th.style.cursor = "pointer";
		th.style.userSelect = "none";
		th.title = "Нажмите для сортировки";

		// Ховер-эффект
		th.addEventListener("mouseenter", () => {
		  th.style.background = "var(--background-modifier-hover, rgba(255,255,255,0.05))";
		});
		th.addEventListener("mouseleave", () => {
		  th.style.background = "";
		});

		th.addEventListener("click", (e) => {
		  // Не сортируем, если кликнули по ссылке внутри th
		  if (e.target.tagName === "A") return;
		  sortTable(i);
		});
	  });

	  // Начальные индикаторы
	  updateSortIndicators();
	}

	// =============================================
	//  Уникальные значения столбца
	// =============================================
	function getUnique(colIndex) {
	  const set = new Set();
	  rows.forEach(r => {
		const td = r.querySelectorAll("td")[colIndex];
		if (td) {
		  const val = td.textContent.trim();
		  if (val && val !== "-") set.add(val);
		}
	  });
	  return [...set].sort();
	}

	// =============================================
	//  Общие стили
	// =============================================
	const inputCSS = `
	  padding: 6px 10px;
	  border: 1px solid var(--background-modifier-border, #444);
	  border-radius: 4px;
	  background: var(--background-secondary-alt, #2a2a2d);
	  color: var(--text-normal, #ddd);
	  font-size: 13px;
	  font-family: inherit;
	`;

	// =============================================
	//  Панель фильтров
	// =============================================
	const bar = document.createElement("div");
	bar.id = FILTER_ID;
	bar.style.cssText = `
	  display: flex;
	  flex-wrap: wrap;
	  gap: 8px;
	  margin-bottom: 12px;
	  align-items: center;
	`;

	// Текстовый поиск по названию
	const search = document.createElement("input");
	search.type = "text";
	search.placeholder = "🔍 Поиск по названию…";
	search.style.cssText = inputCSS + "flex: 1 1 180px; min-width: 160px;";

	// Хелпер для <select>
	function makeSelect(placeholder, colIndex) {
	  const sel = document.createElement("select");
	  sel.style.cssText = inputCSS + "cursor: pointer;";
	  const def = document.createElement("option");
	  def.value = "";
	  def.textContent = placeholder;
	  sel.appendChild(def);
	  getUnique(colIndex).forEach(v => {
		const o = document.createElement("option");
		o.value = v;
		o.textContent = v;
		sel.appendChild(o);
	  });
	  return sel;
	}

	const selType   = makeSelect("— Тип —", 1);
	const selRarity = makeSelect("— Редкость —", 2);
	const selTune   = makeSelect("— Настройка —", 3);

	// Текстовый поиск по требованию
	const searchReq = document.createElement("input");
	searchReq.type = "text";
	searchReq.placeholder = "🔍 Требование…";
	searchReq.style.cssText = inputCSS + "flex: 0 1 160px; min-width: 120px;";

	// Кнопка сброса
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
	  transition: color .15s, border-color .15s;
	`;
	reset.addEventListener("mouseenter", () => {
	  reset.style.color = "var(--text-error, #e55)";
	  reset.style.borderColor = "var(--text-error, #e55)";
	});
	reset.addEventListener("mouseleave", () => {
	  reset.style.color = "var(--text-muted, #888)";
	  reset.style.borderColor = "var(--background-modifier-border, #444)";
	});

	// Счётчик
	const counter = document.createElement("span");
	counter.style.cssText = `
	  color: var(--text-muted, #888);
	  font-size: 12px;
	  white-space: nowrap;
	`;
	counter.textContent = `Найдено: ${totalCount}`;

	bar.append(search, selType, selRarity, selTune, searchReq, reset, counter);

	// Вставляем панель перед таблицей
	table.parentElement.insertBefore(bar, table);

	// =============================================
	//  Логика фильтрации
	// =============================================
	function apply() {
	  const q  = search.value.toLowerCase().trim();
	  const ft = selType.value;
	  const fr = selRarity.value;
	  const fn = selTune.value;
	  const fq = searchReq.value.toLowerCase().trim();
	  let count = 0;

	  rows.forEach(row => {
		const cells  = row.querySelectorAll("td");
		const name   = (cells[0]?.textContent || "").toLowerCase();
		const type   = (cells[1]?.textContent || "").trim();
		const rarity = (cells[2]?.textContent || "").trim();
		const tune   = (cells[3]?.textContent || "").trim();
		const req    = (cells[4]?.textContent || "").toLowerCase().trim();

		const ok =
		  (!q  || name.includes(q)) &&
		  (!ft || type   === ft) &&
		  (!fr || rarity === fr) &&
		  (!fn || tune   === fn) &&
		  (!fq || req.includes(fq));

		row.style.display = ok ? "" : "none";
		if (ok) count++;
	  });

	  counter.textContent = `Найдено: ${count}`;

	  const hc = table.querySelector("th .dataview.small-text");
	  if (hc) hc.textContent = count;
	}

	// =============================================
	//  Сброс фильтров + сортировки
	// =============================================
	reset.addEventListener("click", () => {
	  search.value    = "";
	  selType.value   = "";
	  selRarity.value = "";
	  selTune.value   = "";
	  searchReq.value = "";

	  // Сброс сортировки
	  sortCol = -1;
	  sortDir = 0;
	  originalOrder.forEach(row => tbody.appendChild(row));
	  updateSortIndicators();

	  apply();
	  const hc = table.querySelector("th .dataview.small-text");
	  if (hc) hc.textContent = totalCount;
	});

	// Слушатели фильтров
	search.addEventListener("input", apply);
	selType.addEventListener("change", apply);
	selRarity.addEventListener("change", apply);
	selTune.addEventListener("change", apply);
	searchReq.addEventListener("input", apply);
  }

  // ===================================================
  //  Инициализация при разных сценариях загрузки
  // ===================================================

  // 1. Первоначальная загрузка
  if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initTableFilter);
  } else {
	initTableFilter();
  }

  // 2. Возврат из bfcache
  window.addEventListener("pageshow", function (event) {
	if (event.persisted) initTableFilter();
  });

  // 3. SPA-навигация
  window.addEventListener("popstate", function () {
	setTimeout(initTableFilter, 100);
  });

  // 4. Динамическая подгрузка контента
  let observerTimer = null;
  const observer = new MutationObserver(function () {
	const tableExists = document.querySelector("table.dataview.table-view-table");
	const barExists   = document.getElementById(FILTER_ID);
	if (tableExists && !barExists) {
	  clearTimeout(observerTimer);
	  observerTimer = setTimeout(initTableFilter, 200);
	}
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();
</script>