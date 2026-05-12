// === ФИЛЬТРАЦИЯ И СОРТИРОВКА ТАБЛИЦЫ ЗАКЛИНАНИЙ ===
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
			//  Карта порядка времени (для умной сортировки)
			// =============================================
			const timeOrder = {
				"действие": 1,
				"действие или реакция": 1,
				"бонусное действие": 2,
				"бонусное действие или действие": 2,
				"реакция": 3,
				"1 действие": 1,
				"1 бонусное действие": 2,
				"1 реакция": 3,
				"минута": 4,
				"минут": 4,
				"минуты": 4,
				"час": 5,
				"часов": 5,
				"часы": 5,
				"особое": 6,
			};

			// Функция для получения приоритета времени
			function getTimePriority(text) {
				const lower = text.toLowerCase().trim();
				
				// Проверяем точные совпадения
				if (timeOrder[lower] !== undefined) {
					return timeOrder[lower];
				}
				
				// Проверяем по ключевым словам
				if (lower.includes("действие") && !lower.includes("бонус")) return 1;
				if (lower.includes("бонус")) return 2;
				if (lower.includes("реакци")) return 3;
				if (lower.includes("минут")) return 4;
				if (lower.includes("час")) return 5;
				
				return 6; // Особое или другое
			}

			// =============================================
			//  Карта порядка редкости (если понадобится)
			// =============================================
			const rarityOrder = {
				"нет": 0,
				"варьируется": 1,
				"обычный": 2,
				"необычный": 3,
				"редкий": 4,
				"очень редкий": 5,
				"легендарный": 6,
				"артефакт": 7,
			};

			// =============================================
			//  Состояние сортировки
			// =============================================
			let sortCol = -1;
			let sortDir = 0;
			const TIME_COL = 3; // индекс столбца «Время»

			// =============================================
			//  Функция сортировки
			// =============================================
			function sortTable(colIndex) {
				// Определяем направление
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
						const cellA = a.querySelectorAll("td")[colIndex];
						const cellB = b.querySelectorAll("td")[colIndex];
						const valA = (cellA?.textContent || "").trim();
						const valB = (cellB?.textContent || "").trim();

						let cmp;

						if (colIndex === TIME_COL) {
							// Сортировка по карте в��емени (специальная логика)
							const tpA = getTimePriority(valA);
							const tpB = getTimePriority(valB);
							
							if (tpA !== tpB) {
								// Разные категории - по приоритету
								cmp = tpA - tpB;
							} else {
								// Одна категория - числовая или текстовая сортировка
								// Извлекаем число из строки
								const numA = parseInt(valA) || 0;
								const numB = parseInt(valB) || 0;
								
								if (numA > 0 && numB > 0) {
									cmp = numA - numB;
								} else {
									// Текстовая сортировка внутри категории
									cmp = valA.localeCompare(valB, "ru", { sensitivity: "base", numeric: true });
								}
							}
						} else {
							// Обычная текстовая сортировка
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
					const oldIcon = th.querySelector(".sort-icon");
					if (oldIcon) oldIcon.remove();

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

					th.addEventListener("mouseenter", () => {
						th.style.background = "var(--background-modifier-hover, rgba(255,255,255,0.05))";
					});
					th.addEventListener("mouseleave", () => {
						th.style.background = "";
					});

					th.addEventListener("click", (e) => {
						if (e.target.tagName === "A") return;
						sortTable(i);
					});
				});

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
				return [...set].sort((a, b) => a.localeCompare(b, "ru"));
			}

			// =============================================
			//  Уникальные значения времени (с группировкой по типу)
			// =============================================
			function getUniqueTime() {
				const set = new Set();
				rows.forEach(r => {
					const td = r.querySelectorAll("td")[TIME_COL];
					if (td) {
						const val = td.textContent.trim();
						if (val) set.add(val);
					}
				});
				
				// Группируем по категориям
				const grouped = {
					1: [], // Действие
					2: [], // Бонусное действ��е
					3: [], // Реакция
					4: [], // Минуты
					5: [], // Часы
					6: [], // Особое
				};
				
				set.forEach(val => {
					const prio = getTimePriority(val);
					if (!grouped[prio]) grouped[prio] = [];
					grouped[prio].push(val);
				});
				
				// Сортируем внутри групп
				const result = [];
				for (let i = 1; i <= 6; i++) {
					if (grouped[i]) {
						grouped[i].sort((a, b) => {
							const numA = parseInt(a) || 0;
							const numB = parseInt(b) || 0;
							if (numA && numB) return numA - numB;
							return a.localeCompare(b, "ru");
						});
						result.push(...grouped[i]);
					}
				}
				return result;
			}

			// =============================================
			//  Заполняем выпадающие списки
			// =============================================
			function populateSelects() {
				// Уровни (числа)
				const levels = new Set();
				rows.forEach(r => {
					const td = r.querySelectorAll("td")[1];
					if (td) {
						const val = td.textContent.trim();
						if (val) levels.add(val);
					}
				});
				const levelSelect = document.getElementById("filter-level");
				[...levels].sort((a, b) => parseInt(a) - parseInt(b)).forEach(v => {
					const opt = document.createElement("option");
					opt.value = v;
					opt.textContent = v;
					levelSelect.appendChild(opt);
				});

				// Школа
				const schoolSelect = document.getElementById("filter-school");
				getUnique(2).forEach(v => {
					const opt = document.createElement("option");
					opt.value = v;
					opt.textContent = v;
					schoolSelect.appendChild(opt);
				});

				// Время
				const timeSelect = document.getElementById("filter-time");
				getUniqueTime().forEach(v => {
					const opt = document.createElement("option");
					opt.value = v;
					opt.textContent = v;
					timeSelect.appendChild(opt);
				});

				// Длительность
				const durationSelect = document.getElementById("filter-duration");
				getUnique(5).forEach(v => {
					const opt = document.createElement("option");
					opt.value = v;
					opt.textContent = v;
					durationSelect.appendChild(opt);
				});

				// Концентрация
				const concSelect = document.getElementById("filter-concentration");
				getUnique(6).forEach(v => {
					const opt = document.createElement("option");
					opt.value = v;
					opt.textContent = v;
					concSelect.appendChild(opt);
				});

				// Особое
				const specialSelect = document.getElementById("filter-special");
				getUnique(7).forEach(v => {
					const opt = document.createElement("option");
					opt.value = v;
					opt.textContent = v;
					specialSelect.appendChild(opt);
				});

				// Сборник
				const bookSelect = document.getElementById("filter-book");
				getUnique(8).forEach(v => {
					const opt = document.createElement("option");
					opt.value = v;
					opt.textContent = v || "(пусто)";
					bookSelect.appendChild(opt);
				});
			}

			// Заполняем select-ы
			populateSelects();

			// =============================================
			//  Логика фильтрации
			// =============================================
			function apply() {
				// Значения из полей
				const searchName = document.getElementById("search-name").value.toLowerCase().trim();
				const filterLevel = document.getElementById("filter-level").value;
				const filterSchool = document.getElementById("filter-school").value;
				const filterTime = document.getElementById("filter-time").value;
				const filterDuration = document.getElementById("filter-duration").value;
				const filterConc = document.getElementById("filter-concentration").value;
				const filterSpecial = document.getElementById("filter-special").value;
				const filterBook = document.getElementById("filter-book").value;

				// Множественный фильтр компонентов
				const selectedComponents = [];
				if (document.getElementById("comp-v").checked) selectedComponents.push("В");
				if (document.getElementById("comp-s").checked) selectedComponents.push("С");
				if (document.getElementById("comp-m").checked) selectedComponents.push("М");

				let count = 0;

				rows.forEach(row => {
					const cells = row.querySelectorAll("td");
					
					// Название (столбец 0) - поиск по подстроке
					const name = (cells[0]?.textContent || "").toLowerCase();
					
					// Уровень (столбец 1)
					const level = cells[1]?.textContent.trim() || "";
					
					// Школа (столбец 2)
					const school = cells[2]?.textContent.trim() || "";
					
					// Время (столбец 3)
					const time = cells[3]?.textContent.trim() || "";
					
					// Компоненты (столбец 4)
					const components = cells[4]?.textContent.trim() || "";
					
					// Длительность (столбец 5)
					const duration = cells[5]?.textContent.trim() || "";
					
					// Концентрация (столбец 6)
					const conc = cells[6]?.textContent.trim() || "";
					
					// Особое (столбец 7)
					const special = cells[7]?.textContent.trim() || "";
					
					// Сборник (столбец 8)
					const book = cells[8]?.textContent.trim() || "";

					// Проверка фильтра компонентов (множественный)
					let compsOk = true;
					if (selectedComponents.length > 0) {
						compsOk = selectedComponents.every(comp => {
							// Ищем букву в строке компонентов (с учётом того, что они могут быть через запятую)
							// "В, С, М" или "В" или "В, С"
							const cleanComps = components.replace(/[,.]/g, " ").split(/\s+/).filter(c => c);
							return cleanComps.includes(comp);
						});
					}

					const ok =
						(!searchName || name.includes(searchName)) &&
						(!filterLevel || level === filterLevel) &&
						(!filterSchool || school === filterSchool) &&
						(!filterTime || time === filterTime) &&
						compsOk &&
						(!filterDuration || duration === filterDuration) &&
						(!filterConc || conc === filterConc) &&
						(!filterSpecial || special === filterSpecial) &&
						(!filterBook || book === filterBook);

					row.style.display = ok ? "" : "none";
					if (ok) count++;
				});

				// Обновляем счётчик
				document.getElementById("row-counter").textContent = `Найдено: ${count}`;

				// Обновляем заголовок таблицы (если есть счётчик)
				const hc = table.querySelector("th .dataview.small-text");
				if (hc) hc.textContent = count;
			}

			// =============================================
			//  Сброс фильтров и сортировки
			// =============================================
			document.getElementById("reset-filters").addEventListener("click", () => {
				// Очищаем текстовые поля
				document.getElementById("search-name").value = "";
				
				// Сбрасываем select-ы
				document.getElementById("filter-level").value = "";
				document.getElementById("filter-school").value = "";
				document.getElementById("filter-time").value = "";
				document.getElementById("filter-duration").value = "";
				document.getElementById("filter-concentration").value = "";
				document.getElementById("filter-special").value = "";
				document.getElementById("filter-book").value = "";
				
				// Сбрасываем чекбоксы компонентов
				document.getElementById("comp-v").checked = false;
				document.getElementById("comp-s").checked = false;
				document.getElementById("comp-m").checked = false;

				// Сбрасываем сортировку
				sortCol = -1;
				sortDir = 0;
				originalOrder.forEach(row => tbody.appendChild(row));
				updateSortIndicators();

				// Применяем фильтры
				apply();
				
				// Обновляем заголовок
				const hc = table.querySelector("th .dataview.small-text");
				if (hc) hc.textContent = totalCount;
			});

			// =============================================
			//  Слушатели событий
			// =============================================
			document.getElementById("search-name").addEventListener("input", apply);
			document.getElementById("filter-level").addEventListener("change", apply);
			document.getElementById("filter-school").addEventListener("change", apply);
			document.getElementById("filter-time").addEventListener("change", apply);
			document.getElementById("filter-duration").addEventListener("change", apply);
			document.getElementById("filter-concentration").addEventListener("change", apply);
			document.getElementById("filter-special").addEventListener("change", apply);
			document.getElementById("filter-book").addEventListener("change", apply);
			
			// Слушатели для чекбоксов компонентов
			document.getElementById("comp-v").addEventListener("change", apply);
			document.getElementById("comp-s").addEventListener("change", apply);
			document.getElementById("comp-m").addEventListener("change", apply);

			// Первоначальны�� счётчик
			apply();
		}

		// ===================================================
		//  Инициализация
		// ===================================================
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", initTableFilter);
		} else {
			initTableFilter();
		}

	})();