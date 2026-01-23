<script>
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	let jsPDF, autoTable;
	
	let { data } = $props();
	let user = $derived(data.user);
	
	let currentYear = $state(new Date().getFullYear());
	let currentMonth = $state(new Date().getMonth() + 1);
	let entries = $state([]);
	let holidays = $state([]);
	let allDays = $state([]);
	let loading = $state(false);
	let showForm = $state(false);
	let editingEntry = $state(null);
	
	// Formularfelder
	let formDate = $state('');
	let formStarttime = $state('');
	let formEndtime = $state('');
	let formBreakduration = $state(30);
	let formAbsenceType = $state('work'); // 'work', 'vacation', 'comp_time'
	let formComment = $state('');
	let toast = $state('');
	
	// User-Daten mit Standard-Arbeitszeiten
	let userData = $state(null);
	
	// Sollarbeitszeit für den aktuellen Monat
	let targetWorkDays = $state(0);
	let targetMinutes = $state(0);
	
	// Übertrag aus Vormonat
	let previousMonthCarryover = $state(0);
	let showCarryoverModal = $state(false);
	let carryoverCorrectionTime = $state('00:00');
	let carryoverIsPositive = $state(true);
	
	const months = [
		'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
	];
	
	const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
	
	function formatTime(timeStr) {
		if (!timeStr) return '-';
		// Zeit ist im Format HH:MM:SS, wir wollen nur HH:MM
		return timeStr.substring(0, 5);
	}
	
	$effect(() => {
		loadUserData();
		loadEntries();
		loadHolidays();
		loadTargetHours();
		loadPreviousMonthCarryover();
	});
	
	async function loadUserData() {
		try {
			const response = await fetch(`${base}/api/users/${user.id}`);
			const result = await response.json();
			if (result.success) {
				userData = result.data;
			}
		} catch (e) {
			console.error('Fehler beim Laden der User-Daten:', e);
		}
	}
	
	async function loadEntries() {
		loading = true;
		try {
			const response = await fetch(
				`${base}/api/timetable?user_id=${user.id}&month=${currentMonth}&year=${currentYear}`
			);
			const result = await response.json();
			if (result.success) {
			// Konvertiere MySQL DATE/TIMESTAMP zu YYYY-MM-DD String
			entries = result.data.map(entry => {
				let dateStr = entry.date;
				// MySQL kann DATE als "2026-01-02" oder "2026-01-02T00:00:00.000Z" zurückgeben
				if (typeof dateStr === 'string') {
					// Wenn es ein ISO-Timestamp ist, nur den Datums-Teil nehmen
					if (dateStr.includes('T')) {
						dateStr = dateStr.split('T')[0];
					}
					// Wenn es schon YYYY-MM-DD ist, direkt verwenden
				} else if (dateStr instanceof Date) {
					// Falls es als Date-Objekt kommt, zu YYYY-MM-DD konvertieren
					const year = dateStr.getUTCFullYear();
					const month = String(dateStr.getUTCMonth() + 1).padStart(2, '0');
					const day = String(dateStr.getUTCDate()).padStart(2, '0');
					dateStr = `${year}-${month}-${day}`;
				}
				return {
					...entry,
					date: dateStr
				};
			});
				generateAllDays();
			} else {
				console.error('API Fehler:', result.message);
			}
		} catch (e) {
			console.error('Fehler beim Laden:', e);
			showToast('Fehler beim Laden');
		} finally {
			loading = false;
		}
	}
	
	async function loadHolidays() {
		try {
			const response = await fetch(`${base}/api/holidays?year=${currentYear}`);
			const result = await response.json();
			
			if (result.success) {
				holidays = result.data.map(h => {
					const d = new Date(h.date); // nutzt lokalen TZ-Offset, verhindert Verschiebung um einen Tag
					const year = d.getFullYear();
					const month = String(d.getMonth() + 1).padStart(2, '0');
					const day = String(d.getDate()).padStart(2, '0');
					return { ...h, date: `${year}-${month}-${day}` };
				});
				generateAllDays();
			}
		} catch (e) {
			console.error('Fehler beim Laden der Feiertage:', e);
		}
	}
	
	async function loadTargetHours() {
		try {
			const response = await fetch(`${base}/api/target-hours?user_id=${user.id}&year=${currentYear}`);
			
			if (!response.ok) {
				console.error('HTTP Error:', response.status);
				targetWorkDays = 0;
				return;
			}
			
			const result = await response.json();
			
			if (result.success) {
				const monthData = result.data.find(d => d.month === currentMonth);
				targetWorkDays = monthData ? monthData.work_days : 0;
				targetMinutes = monthData ? monthData.target_minutes : 0;
				
				// Fallback: Wenn target_minutes noch nicht gespeichert ist, aber work_days vorhanden sind
				if (targetMinutes === 0 && targetWorkDays > 0 && userData?.employment_percentage) {
					targetMinutes = Math.round(targetWorkDays * 468 * (userData.employment_percentage / 100));
				}
			} else {
				console.error('API Error:', result.message);
				targetWorkDays = 0;
				targetMinutes = 0;
			}
		} catch (e) {
			console.error('Fehler beim Laden der Sollarbeitszeit:', e);
			targetWorkDays = 0;
			targetMinutes = 0;
		}
	}
	
	function generateAllDays() {
		const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
		const days = [];
		const today = new Date();
		const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		
		for (let day = 1; day <= daysInMonth; day++) {
			const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const entry = entries.find(e => e.date === dateStr);
			
			const date = new Date(dateStr + 'T00:00:00');
			const dayOfWeek = date.getDay();
			const holiday = holidays.find(h => h.date === dateStr);
			
			days.push({
				date: dateStr,
				day: day,
				dayOfWeek: dayOfWeek,
				dayName: dayNames[dayOfWeek],
				entry: entry || null,
				isToday: dateStr === todayStr,
				holiday: holiday || null
			});
		}
		
		allDays = days;
	}
	
	function previousMonth() {
		if (currentMonth === 1) {
			currentMonth = 12;
			currentYear--;
		} else {
			currentMonth--;
		}
	}
	
	function nextMonth() {
		if (currentMonth === 12) {
			currentMonth = 1;
			currentYear++;
		} else {
			currentMonth++;
		}
	}
	
	function openNewForm(dateStr = null) {
		editingEntry = null;
		formDate = dateStr || `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
		
		// Bestimme Wochentag für den gewählten Tag
		const date = new Date(formDate + 'T00:00:00');
		const dayOfWeek = date.getDay(); // 0=Sonntag, 1=Montag, ..., 6=Samstag
		
		// Lade Standard-Arbeitszeiten basierend auf Wochentag aus separaten Feldern
		if (userData) {
			let startHour = null, startMinute = null, endHour = null, endMinute = null;
			
			switch(dayOfWeek) {
				case 1: // Montag
					startHour = userData.default_monday_start_hour;
					startMinute = userData.default_monday_start_minute;
					endHour = userData.default_monday_end_hour;
					endMinute = userData.default_monday_end_minute;
					break;
				case 2: // Dienstag
					startHour = userData.default_tuesday_start_hour;
					startMinute = userData.default_tuesday_start_minute;
					endHour = userData.default_tuesday_end_hour;
					endMinute = userData.default_tuesday_end_minute;
					break;
				case 3: // Mittwoch
					startHour = userData.default_wednesday_start_hour;
					startMinute = userData.default_wednesday_start_minute;
					endHour = userData.default_wednesday_end_hour;
					endMinute = userData.default_wednesday_end_minute;
					break;
				case 4: // Donnerstag
					startHour = userData.default_thursday_start_hour;
					startMinute = userData.default_thursday_start_minute;
					endHour = userData.default_thursday_end_hour;
					endMinute = userData.default_thursday_end_minute;
					break;
				case 5: // Freitag
					startHour = userData.default_friday_start_hour;
					startMinute = userData.default_friday_start_minute;
					endHour = userData.default_friday_end_hour;
					endMinute = userData.default_friday_end_minute;
					break;
				case 6: // Samstag
					startHour = userData.default_saturday_start_hour;
					startMinute = userData.default_saturday_start_minute;
					endHour = userData.default_saturday_end_hour;
					endMinute = userData.default_saturday_end_minute;
					break;
				case 0: // Sonntag
					startHour = userData.default_sunday_start_hour;
					startMinute = userData.default_sunday_start_minute;
					endHour = userData.default_sunday_end_hour;
					endMinute = userData.default_sunday_end_minute;
					break;
			}
			
			// Formatiere Zeit, wenn Daten vorhanden
			if (startHour !== null && startMinute !== null) {
				formStarttime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
			} else {
				formStarttime = '09:00';
			}
			
			if (endHour !== null && endMinute !== null) {
				formEndtime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
			} else {
				formEndtime = '17:00';
			}
			
			formBreakduration = userData.default_break || 30;
		} else {
			formStarttime = '09:00';
			formEndtime = '17:00';
			formBreakduration = 30;
		}
		
		formAbsenceType = 'work';
		formComment = '';
		showForm = true;
	}
	
	function openEditForm(entry) {
		editingEntry = entry;
		formDate = entry.date;
		formStarttime = entry.starttime || '';
		formEndtime = entry.endtime || '';
		formBreakduration = entry.breakduration || 30;
		formAbsenceType = entry.absence_type || 'work';
		formComment = entry.comment || '';
		showForm = true;
	}
	
	function closeForm() {
		showForm = false;
		editingEntry = null;
	}
	
	function loadStandardTimes() {
		if (!userData || !formDate) return;
		
		// Bestimme Wochentag für den gewählten Tag
		const date = new Date(formDate + 'T00:00:00');
		const dayOfWeek = date.getDay();
		
		let startHour = null, startMinute = null, endHour = null, endMinute = null;
		
		switch(dayOfWeek) {
			case 1: // Montag
				startHour = userData.default_monday_start_hour;
				startMinute = userData.default_monday_start_minute;
				endHour = userData.default_monday_end_hour;
				endMinute = userData.default_monday_end_minute;
				break;
			case 2: // Dienstag
				startHour = userData.default_tuesday_start_hour;
				startMinute = userData.default_tuesday_start_minute;
				endHour = userData.default_tuesday_end_hour;
				endMinute = userData.default_tuesday_end_minute;
				break;
			case 3: // Mittwoch
				startHour = userData.default_wednesday_start_hour;
				startMinute = userData.default_wednesday_start_minute;
				endHour = userData.default_wednesday_end_hour;
				endMinute = userData.default_wednesday_end_minute;
				break;
			case 4: // Donnerstag
				startHour = userData.default_thursday_start_hour;
				startMinute = userData.default_thursday_start_minute;
				endHour = userData.default_thursday_end_hour;
				endMinute = userData.default_thursday_end_minute;
				break;
			case 5: // Freitag
				startHour = userData.default_friday_start_hour;
				startMinute = userData.default_friday_start_minute;
				endHour = userData.default_friday_end_hour;
				endMinute = userData.default_friday_end_minute;
				break;
			case 6: // Samstag
				startHour = userData.default_saturday_start_hour;
				startMinute = userData.default_saturday_start_minute;
				endHour = userData.default_saturday_end_hour;
				endMinute = userData.default_saturday_end_minute;
				break;
			case 0: // Sonntag
				startHour = userData.default_sunday_start_hour;
				startMinute = userData.default_sunday_start_minute;
				endHour = userData.default_sunday_end_hour;
				endMinute = userData.default_sunday_end_minute;
				break;
		}
		
		// Formatiere Zeit, wenn Daten vorhanden
		if (startHour !== null && startMinute !== null) {
			formStarttime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
		} else {
			formStarttime = '09:00';
		}
		
		if (endHour !== null && endMinute !== null) {
			formEndtime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
		} else {
			formEndtime = '17:00';
		}
		
		formBreakduration = userData.default_break || 30;
	}
	

	async function saveEntry() {
		try {
			const isAbsent = formAbsenceType === 'vacation' || formAbsenceType === 'comp_time';
			const payload = {
				user_id: user.id,
				date: formDate,
				starttime: isAbsent ? null : formStarttime,
				endtime: isAbsent ? null : formEndtime,
				breakduration: isAbsent ? 0 : formBreakduration,
				absence_type: formAbsenceType === 'work' ? null : formAbsenceType,
				comment: formComment
			};
			
			let response;
			if (editingEntry) {
				response = await fetch(`${base}/api/timetable/${editingEntry.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else {
				response = await fetch(`${base}/api/timetable`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}
			
			const result = await response.json();
			if (result.success) {
				showToast(result.message);
				closeForm();
				loadEntries();
			} else {
				showToast(result.message);
			}
		} catch (e) {
			showToast('Fehler beim Speichern');
		}
	}

	async function deleteEntry(id) {
		if (!confirm('Eintrag wirklich löschen?')) return;
		
		try {
			const response = await fetch(`${base}/api/timetable/${id}`, {
				method: 'DELETE'
			});
			const result = await response.json();
			if (result.success) {
				showToast(result.message);
				loadEntries();
			}
		} catch (e) {
			showToast('Fehler beim Löschen');
		}
	}

	function showToast(message) {
		toast = message;
		setTimeout(() => { toast = ''; }, 3000);
	}

	function formatDate(dateStr) {
		const date = new Date(dateStr + 'T00:00:00');
		const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
		return `${days[date.getDay()]}, ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
	}

	function calculateHours(entry) {
		if (!entry) return '-';
		
		if (entry.absence_type === 'vacation') return '7:48h';
		if (entry.absence_type === 'comp_time') return '-';
		
		if (!entry.starttime || !entry.endtime) return '-';
		
		const start = entry.starttime.split(':');
		const end = entry.endtime.split(':');
		const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
		const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
		const workMin = endMin - startMin - (entry.breakduration || 0);
		
		const hours = Math.floor(workMin / 60);
		const mins = workMin % 60;
		
		return `${hours}:${String(mins).padStart(2, '0')}h`;
	}

	function calculateTotalHours() {
		let totalMinutes = 0;
		
		for (const day of allDays) {
			if (day.entry) {
				if (day.entry.absence_type === 'vacation') {
					// Urlaub zählt als 7:48h (468 Minuten)
					totalMinutes += 468;
				} else if (day.entry.absence_type === 'comp_time') {
					// Freizeitausgleich zählt nicht zur Arbeitszeit
					// (wird nicht addiert)
				} else if (day.entry.starttime && day.entry.endtime) {
					const start = day.entry.starttime.split(':');
					const end = day.entry.endtime.split(':');
					const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
					const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
					const workMin = endMin - startMin - (day.entry.breakduration || 0);
					totalMinutes += workMin;
				}
			}
		}
		
		const hours = Math.floor(totalMinutes / 60);
		const mins = totalMinutes % 60;
		
		return `${hours}:${String(mins).padStart(2, '0')}h`;
	}

	function countWorkDays() {
		return allDays.filter(day => day.entry && !day.entry.absence_type).length;
	}

	function countVacationDays() {
		return allDays.filter(day => day.entry && day.entry.absence_type === 'vacation').length;
	}

	function countCompTimeDays() {
		return allDays.filter(day => day.entry && day.entry.absence_type === 'comp_time').length;
	}

	function calculateTargetHours() {
		// Nutze die gespeicherten target_minutes aus der Datenbank
		const minutes = targetMinutes;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}:${String(mins).padStart(2, '0')}h`;
	}

	function calculateDifference() {
		if (targetMinutes === 0) {
			return { text: '-', isPositive: true, minutes: 0 };
		}
		
		// Berechne Ist-Zeit in Minuten (NUR für diesen Monat, ohne Übertrag)
		let actualMinutes = 0;
		for (const day of allDays) {
			if (day.entry) {
				if (day.entry.absence_type === 'vacation') {
					actualMinutes += 468; // Urlaub = 7:48h
				} else if (day.entry.absence_type === 'comp_time') {
					// Freizeitausgleich zählt nicht zur Arbeitszeit
				} else if (day.entry.starttime && day.entry.endtime) {
					const start = day.entry.starttime.split(':');
					const end = day.entry.endtime.split(':');
					const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
					const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
					const workMin = endMin - startMin - (day.entry.breakduration || 0);
					actualMinutes += workMin;
				}
			}
		}
		
		// Differenz NUR für diesen Monat (ohne Vormonats-Übertrag)
		const diffMinutes = actualMinutes - targetMinutes;
		const isPositive = diffMinutes >= 0;
		const absDiff = Math.abs(diffMinutes);
		const hours = Math.floor(absDiff / 60);
		const mins = absDiff % 60;
		
		return {
			text: `${isPositive ? '+' : '-'}${hours}:${String(mins).padStart(2, '0')}h`,
			isPositive: isPositive,
			minutes: diffMinutes
		};
	}

	function calculateTotalCarryover() {
		const diff = calculateDifference();
		if (diff.text === '-') {
			return { text: '-', isPositive: true };
		}
		
		// Addiere die Monatsdifferenz zum Vormonats-Übertrag
		const totalMinutes = diff.minutes + previousMonthCarryover;
		const isPositive = totalMinutes >= 0;
		const absDiff = Math.abs(totalMinutes);
		const hours = Math.floor(absDiff / 60);
		const mins = absDiff % 60;
		
		return {
			text: `${isPositive ? '+' : '-'}${hours}:${String(mins).padStart(2, '0')}h`,
			isPositive: isPositive
		};
	}

	function formatMinutesToTime(minutes) {
		const isPositive = minutes >= 0;
		const absDiff = Math.abs(minutes);
		const hours = Math.floor(absDiff / 60);
		const mins = absDiff % 60;
		
		return {
			text: `${isPositive ? '+' : '-'}${hours}:${String(mins).padStart(2, '0')}h`,
			isPositive: isPositive
		};
	}

	async function loadPreviousMonthCarryover() {
		try {
			const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
			const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
			
			const response = await fetch(`${base}/api/carryover-corrections?user_id=${user.id}&month=${prevMonth}&year=${prevYear}`);
			const result = await response.json();
			
			if (result.success && result.data) {
				// Manuell korrigierter Wert aus der Datenbank
				previousMonthCarryover = result.data.carryover_minutes || 0;
			} else {
				// Kein manueller Wert vorhanden - berechne den Übertrag
				previousMonthCarryover = await calculateCarryoverFromLastKnownValue(prevMonth, prevYear);
			}
		} catch (e) {
			console.error('Fehler beim Laden des Vormonats-Übertrags:', e);
			previousMonthCarryover = 0;
		}
	}

	async function calculateCarryoverFromLastKnownValue(targetMonth, targetYear) {
		try {
			// Finde den jüngsten (neuesten) manuellen Eintrag vor dem Zielmonat
			const lastKnown = await findLastKnownCarryover(targetMonth, targetYear);
			
			// Wenn kein manueller Eintrag gefunden wurde, starte bei 0
			let accumulatedCarryover = lastKnown.carryover;
			let startMonth = lastKnown.month;
			let startYear = lastKnown.year;
			
			// Berechne von startMonth bis targetMonth vorwärts
			while (startYear < targetYear || (startYear === targetYear && startMonth < targetMonth)) {
				// Nächsten Monat berechnen
				startMonth++;
				if (startMonth > 12) {
					startMonth = 1;
					startYear++;
				}
				
				// Berechne Differenz für diesen Monat
				const monthDiff = await calculateMonthDifference(startMonth, startYear, accumulatedCarryover);
				accumulatedCarryover += monthDiff;
			}
			
			return accumulatedCarryover;
		} catch (e) {
			console.error('Fehler beim Berechnen des Übertrags:', e);
			return 0;
		}
	}

	async function findLastKnownCarryover(beforeMonth, beforeYear) {
		// Suche rückwärts nach dem letzten manuellen Eintrag (max 24 Monate zurück)
		let searchMonth = beforeMonth;
		let searchYear = beforeYear;
		
		for (let i = 0; i < 24; i++) {
			searchMonth--;
			if (searchMonth < 1) {
				searchMonth = 12;
				searchYear--;
			}
			
			try {
				const response = await fetch(`${base}/api/carryover-corrections?user_id=${user.id}&month=${searchMonth}&year=${searchYear}`);
				const result = await response.json();
				
				if (result.success && result.data) {
					return {
						carryover: result.data.carryover_minutes || 0,
						month: searchMonth,
						year: searchYear
					};
				}
			} catch (e) {
				console.error(`Fehler beim Suchen in ${searchMonth}/${searchYear}:`, e);
			}
		}
		
		// Kein manueller Eintrag gefunden, starte mit 0 im Monat vor beforeMonth
		searchMonth = beforeMonth - 1;
		searchYear = beforeYear;
		if (searchMonth < 1) {
			searchMonth = 12;
			searchYear--;
		}
		
		return {
			carryover: 0,
			month: searchMonth,
			year: searchYear
		};
	}

	async function calculateMonthDifference(month, year, previousCarryover) {
		try {
			// Lade Einträge des Monats
			const entriesResponse = await fetch(
				`${base}/api/timetable?user_id=${user.id}&month=${month}&year=${year}`
			);
			const entriesResult = await entriesResponse.json();
			
			if (!entriesResult.success) {
				return 0;
			}
			
			// Lade Sollarbeitszeit des Monats
			const targetResponse = await fetch(`${base}/api/target-hours?user_id=${user.id}&year=${year}`);
			
			if (!targetResponse.ok) {
				return 0;
			}
			
			const targetResult = await targetResponse.json();
			
			if (!targetResult.success) {
				return 0;
			}
			
			const monthData = targetResult.data.find(d => d.month === month);
			const targetMinutesMonth = monthData ? monthData.target_minutes : 0;
			
			if (targetMinutesMonth === 0) {
				return 0;
			}
			
			// Berechne Ist-Zeit des Monats
			let actualMinutes = 0;
			for (const entry of entriesResult.data) {
				if (entry.absence_type === 'vacation') {
					actualMinutes += 468; // Urlaub = 7:48h
				} else if (entry.absence_type === 'comp_time') {
					// Freizeitausgleich zählt nicht zur Arbeitszeit
				} else if (entry.starttime && entry.endtime) {
					const start = entry.starttime.split(':');
					const end = entry.endtime.split(':');
					const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
					const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
					const workMin = endMin - startMin - (entry.breakduration || 0);
					actualMinutes += workMin;
				}
			}
			
			// Differenz berechnen: Nur die reine Monatsdifferenz ohne Übertrag
			// Der Übertrag wird in calculateCarryoverFromLastKnownValue() separat behandelt
			return actualMinutes - targetMinutesMonth;
		} catch (e) {
			console.error(`Fehler beim Berechnen der Differenz für ${month}/${year}:`, e);
			return 0;
		}
	}

	function openCarryoverModal() {
		const minutes = Math.abs(previousMonthCarryover);
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		carryoverCorrectionTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
		carryoverIsPositive = previousMonthCarryover >= 0;
		showCarryoverModal = true;
	}

	async function saveCarryoverCorrection() {
		try {
			const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
			const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
			
			// Konvertiere hh:mm zu Minuten
			const timeParts = carryoverCorrectionTime.split(':');
			const hours = parseInt(timeParts[0] || 0);
			const mins = parseInt(timeParts[1] || 0);
			const totalMinutes = (hours * 60 + mins) * (carryoverIsPositive ? 1 : -1);
			
			const response = await fetch(`${base}/api/carryover-corrections`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: user.id,
					month: prevMonth,
					year: prevYear,
					carryover_minutes: totalMinutes
				})
			});
			
			const result = await response.json();
			if (result.success) {
				showToast('Korrektur gespeichert');
				showCarryoverModal = false;
				await loadPreviousMonthCarryover();
			} else {
				showToast(result.message || 'Fehler beim Speichern');
			}
		} catch (e) {
			console.error('Fehler beim Speichern:', e);
			showToast('Fehler beim Speichern');
		}
	}

	async function deleteCarryoverCorrection() {
		if (!confirm('Korrektur wirklich löschen?')) return;
		
		try {
			const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
			const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
			
			const response = await fetch(`${base}/api/carryover-corrections?user_id=${user.id}&month=${prevMonth}&year=${prevYear}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			if (result.success) {
				showToast('Korrektur gelöscht');
				showCarryoverModal = false;
				await loadPreviousMonthCarryover();
			} else {
				showToast(result.message || 'Fehler beim Löschen');
			}
		} catch (e) {
			console.error('Fehler beim Löschen:', e);
			showToast('Fehler beim Löschen');
		}
	}

	function goToCurrentMonth() {
		const today = new Date();
		currentYear = today.getFullYear();
		currentMonth = today.getMonth() + 1;
	}

	async function fillMonthWithDefaults() {
		if (!confirm('Möchten Sie alle fehlenden Arbeitstage mit den Standard-Arbeitszeiten ausfüllen?')) return;
		
		try {
			let addedCount = 0;
			
			for (const day of allDays) {
				// Nur an Wochentagen (Mo-Fr) ohne vorhandenen Eintrag und ohne Feiertag
				if (!day.entry && !day.holiday && day.dayOfWeek >= 1 && day.dayOfWeek <= 5) {
					// Hole Standard-Arbeitszeiten für diesen Wochentag
					let startHour = null, startMinute = null, endHour = null, endMinute = null;
					
					if (userData) {
						switch(day.dayOfWeek) {
							case 1: // Montag
								startHour = userData.default_monday_start_hour;
								startMinute = userData.default_monday_start_minute;
								endHour = userData.default_monday_end_hour;
								endMinute = userData.default_monday_end_minute;
								break;
							case 2: // Dienstag
								startHour = userData.default_tuesday_start_hour;
								startMinute = userData.default_tuesday_start_minute;
								endHour = userData.default_tuesday_end_hour;
								endMinute = userData.default_tuesday_end_minute;
								break;
							case 3: // Mittwoch
								startHour = userData.default_wednesday_start_hour;
								startMinute = userData.default_wednesday_start_minute;
								endHour = userData.default_wednesday_end_hour;
								endMinute = userData.default_wednesday_end_minute;
								break;
							case 4: // Donnerstag
								startHour = userData.default_thursday_start_hour;
								startMinute = userData.default_thursday_start_minute;
								endHour = userData.default_thursday_end_hour;
								endMinute = userData.default_thursday_end_minute;
								break;
							case 5: // Freitag
								startHour = userData.default_friday_start_hour;
								startMinute = userData.default_friday_start_minute;
								endHour = userData.default_friday_end_hour;
								endMinute = userData.default_friday_end_minute;
								break;
						}
						
						// Nur hinzufügen wenn Start- und Endzeit definiert sind
						if (startHour !== null && startMinute !== null && endHour !== null && endMinute !== null) {
							const starttime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
							const endtime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
							
							const response = await fetch(`${base}/api/timetable`, {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({
									user_id: user.id,
									date: day.date,
									starttime: starttime,
									endtime: endtime,
									breakduration: userData.default_break || 30,
									absence_type: null,
									comment: ''
								})
							});
							
							const result = await response.json();
							if (result.success) {
								addedCount++;
							}
						}
					}
				}
			}
			
			showToast(`${addedCount} Einträge hinzugefügt`);
			await loadEntries();
		} catch (e) {
			console.error('Fehler beim Ausfüllen:', e);
			showToast('Fehler beim Ausfüllen');
		}
	}

	onMount(async () => {
		// Dynamischer Import von jsPDF und autoTable
		if (typeof window !== 'undefined') {
			const jsPDFModule = await import('jspdf');
			jsPDF = jsPDFModule.default;
			const autoTableModule = await import('jspdf-autotable');
			autoTable = autoTableModule.default;
		}
	});

	async function printMonth() {
		if (!jsPDF || !autoTable) {
			alert('PDF-Bibliothek wird geladen, bitte versuchen Sie es in einem Moment erneut.');
			return;
		}

		try {
			// Erstelle neues PDF im Querformat
			const doc = new jsPDF({
				orientation: 'landscape',
				unit: 'mm',
				format: 'a4'
			});

			// Titel und Benutzerinfo
			doc.setFontSize(16);
			doc.setFont(undefined, 'bold');
			doc.text(`Arbeitszeiten ${months[currentMonth - 1]} ${currentYear}`, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
			
			doc.setFontSize(10);
			doc.setFont(undefined, 'normal');
			doc.text(`${user.first_name} ${user.last_name}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

			// Extrahiere Tabellendaten
			const tableHead = [['Datum', 'Von', 'Bis', 'Pause (Min)', 'Arbeitszeit', 'Status', 'Anmerkung']];
			
			// Übertrag-Zeile
			const carryoverRow = [
				{ content: 'Übertrag aus Vormonat:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 245, 245] } },
				{ content: formatMinutesToTime(previousMonthCarryover).text, styles: { fontStyle: 'bold', textColor: previousMonthCarryover >= 0 ? [0, 128, 0] : [200, 0, 0], fillColor: [245, 245, 245] } },
				{ content: '', colSpan: 2, styles: { fillColor: [245, 245, 245] } }
			];

			// Hauptdaten
			const tableBody = [];
			tableBody.push(carryoverRow);

			allDays.forEach(day => {
				const dayLabel = `${day.dayName}, ${day.day}.${currentMonth}.${currentYear}${day.holiday ? ' - ' + day.holiday.name : ''}`;
				
				if (day.entry) {
					let status = 'Arbeitszeit';
					if (day.entry.absence_type === 'vacation') status = 'Urlaub';
					if (day.entry.absence_type === 'comp_time') status = 'Freizeitausgleich';

					let rowStyle = {};
					if (day.entry.absence_type === 'vacation' || day.entry.absence_type === 'comp_time') {
						rowStyle = { fillColor: [250, 250, 250] };
					}

					tableBody.push([
						dayLabel,
						formatTime(day.entry.starttime),
						formatTime(day.entry.endtime),
						day.entry.breakduration || '-',
						calculateHours(day.entry),
						status,
						day.entry.comment || '-'
					]);
				} else {
					const isWeekendOrHoliday = day.holiday || day.dayOfWeek === 0 || day.dayOfWeek === 6;
					tableBody.push({
						content: [
							dayLabel,
							'-',
							'-',
							'-',
							'-',
							day.holiday ? 'Feiertag' : '-',
							day.holiday ? day.holiday.name : '-'
						],
						styles: isWeekendOrHoliday ? { fillColor: [240, 240, 240] } : {}
					});
				}
			});

			// Footer-Zeilen (Zusammenfassung)
			const footerRows = [
				[
					{ content: 'Ist-Arbeitszeit:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
					{ content: calculateTotalHours(), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
					{ content: `${countWorkDays()} Arbeitstage | ${countVacationDays()} Urlaub | ${countCompTimeDays()} Freizeitausgleich`, colSpan: 2, styles: { fillColor: [230, 230, 230] } }
				]
			];

			if (targetMinutes > 0) {
				footerRows.push([
					{ content: 'Soll-Arbeitszeit:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
					{ content: calculateTargetHours(), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
					{ content: targetWorkDays > 0 ? `${targetWorkDays} Arbeitstage (Soll)` : '', colSpan: 2, styles: { fillColor: [230, 230, 230] } }
				]);

				const diff = calculateDifference();
				if (diff.text !== '-') {
					footerRows.push([
						{ content: 'Differenz:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
						{ content: diff.text, styles: { fontStyle: 'bold', textColor: diff.isPositive ? [0, 128, 0] : [200, 0, 0], fillColor: [230, 230, 230] } },
						{ content: '', colSpan: 2, styles: { fillColor: [230, 230, 230] } }
					]);

					const totalCarry = calculateTotalCarryover();
					footerRows.push([
						{ content: 'Übertrag in Folgemonat:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [200, 220, 240] } },
						{ content: totalCarry.text, styles: { fontStyle: 'bold', textColor: totalCarry.isPositive ? [0, 128, 0] : [200, 0, 0], fillColor: [200, 220, 240] } },
						{ content: 'Kumulierter Übertrag', colSpan: 2, styles: { fillColor: [200, 220, 240] } }
					]);
				}
			}

			tableBody.push(...footerRows);

			// Erstelle Tabelle mit autoTable
			autoTable(doc, {
				head: tableHead,
				body: tableBody,
				startY: 28,
				theme: 'grid',
				styles: {
					fontSize: 8,
					cellPadding: 2,
					lineColor: [150, 150, 150],
					lineWidth: 0.1
				},
				headStyles: {
					fillColor: [220, 220, 220],
					textColor: [0, 0, 0],
					fontStyle: 'bold',
					halign: 'left'
				},
				columnStyles: {
					0: { cellWidth: 60 },  // Datum
					1: { cellWidth: 18, halign: 'center' },  // Von
					2: { cellWidth: 18, halign: 'center' },  // Bis
					3: { cellWidth: 20, halign: 'center' },  // Pause
					4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },  // Arbeitszeit
					5: { cellWidth: 35, halign: 'left' },   // Status
					6: { cellWidth: 'auto' }  // Anmerkung
				},
				// Zebra-Streifen für bessere Lesbarkeit
				alternateRowStyles: {
					fillColor: [249, 249, 249]
				},
				didDrawPage: function(data) {
					// Fußzeile mit Seitenzahlen
					const pageCount = doc.internal.getNumberOfPages();
					const pageSize = doc.internal.pageSize;
					const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
					doc.setFontSize(9);
					doc.setTextColor(100);
					doc.text(
						`Seite ${doc.internal.getCurrentPageInfo().pageNumber} von ${pageCount}`,
						pageSize.getWidth() / 2,
						pageHeight - 10,
						{ align: 'center' }
					);
				}
			});

			// Speichere PDF
			doc.save(`Arbeitszeiten_${months[currentMonth - 1]}_${currentYear}.pdf`);
			showToast('PDF wurde erfolgreich erstellt');
		} catch (e) {
			console.error('Fehler beim Erstellen des PDFs:', e);
			showToast('Fehler beim Erstellen des PDFs');
		}
	}
</script>

<style>
	@media print {
		/* Verstecke Navigation und Buttons beim Drucken */
		:global(nav),
		:global(.btn),
		:global(button),
		:global(.toast) {
			display: none !important;
		}

		/* Verstecke die Aktions-Spalte */
		:global(th:last-child),
		:global(td:last-child) {
			display: none !important;
		}

		/* Optimiere Tabelle für Druck */
		:global(.table) {
			font-size: 10pt;
		}

		/* Seitenumbrüche vermeiden */
		:global(tr) {
			page-break-inside: avoid;
		}

		/* Header auf jeder Seite wiederholen */
		:global(thead) {
			display: table-header-group;
		}

		:global(tfoot) {
			display: table-footer-group;
		}

		/* Entferne Hintergrundfarben für besseren Druck */
		:global(.table-warning),
		:global(.table-info),
		:global(.table-secondary),
		:global(.table-primary) {
			background-color: transparent !important;
		}

		/* Schwarz-Weiß Badges */
		:global(.badge) {
			border: 1px solid #000;
			background-color: white !important;
			color: black !important;
		}

		/* Titel für Druck anpassen */
		:global(h1),
		:global(h3) {
			page-break-after: avoid;
		}

		/* Entferne unnötige Cards */
		:global(.card) {
			border: none !important;
			box-shadow: none !important;
		}
	}
</style>

<div class="row">
	<div class="col-12">
		<div class="d-flex justify-content-between align-items-center mb-4">
			<h1>
				<i class="bi bi-calendar3" onclick={goToCurrentMonth} style="cursor: pointer;" title="Zum aktuellen Monat springen"></i> Meine Arbeitszeiten</h1>
			<div>
				<button class="btn btn-success me-2" onclick={fillMonthWithDefaults}>
					Monat ausfüllen
				</button>
				<button class="btn btn-outline-primary" onclick={printMonth}>
					<i class="bi bi-printer"></i> Drucken
				</button>
			</div>
		</div>
		
		<div class="card mb-4">
			<div class="card-body">
				<div class="d-flex justify-content-between align-items-center">
					<button class="btn btn-outline-secondary" onclick={previousMonth} aria-label="Vorheriger Monat">
						<i class="bi bi-chevron-left"></i>
					</button>
					<h3 class="mb-0">{months[currentMonth - 1]} {currentYear}</h3>
					<button class="btn btn-outline-secondary" onclick={nextMonth} aria-label="Nächster Monat">
						<i class="bi bi-chevron-right"></i>
					</button>
				</div>
			</div>
		</div>
		
		{#if loading}
			<div class="text-center py-5">
				<div class="spinner-border text-primary" role="status"></div>
			</div>
		{:else}
			<div class="table-responsive">
				<table class="table table-hover">
					<thead class="table-light">
						<tr>
							<th>Datum</th>
							<th>Von</th>
							<th>Bis</th>
							<th>Pause (Min)</th>
							<th>Arbeitszeit</th>
							<th>Status</th>
							<th>Anmerkung</th>
							<th>Aktionen</th>
						</tr>
					</thead>
					<tbody>
						<tr class="table-light fw-bold">
							<td colspan="4" class="text-end"><strong>Übertrag aus Vormonat:</strong></td>
							<td>
								<strong class={previousMonthCarryover >= 0 ? 'text-success' : 'text-danger'}>
									{formatMinutesToTime(previousMonthCarryover).text}
								</strong>
							</td>
							<td colspan="2"></td>
							<td>
								<button class="btn btn-sm btn-warning" onclick={openCarryoverModal}>
									<i class="bi bi-pencil-square"></i> Übertrag korrigieren
								</button>
							</td>
						</tr>
						{#each allDays as day}
							<tr class:table-warning={day.entry?.absence_type === 'vacation'} 
							    class:table-info={day.entry?.absence_type === 'comp_time'}
							    class:table-secondary={day.holiday || day.dayOfWeek === 0 || day.dayOfWeek === 6}
							    class:table-primary={day.isToday}
							    style={day.isToday ? 'border-left: 4px solid #0d6efd;' : ''}>
								<td>
									<strong>{day.dayName}</strong>, {day.day}.{currentMonth}.{currentYear}
									{#if day.holiday}
										<span class="badge bg-secondary ms-2"><i class="bi bi-star"></i> {day.holiday.name}</span>
									{/if}
									{#if day.isToday}
										<span class="badge bg-primary ms-2">Heute</span>
									{/if}
								</td>
								{#if day.entry}
									<td>{formatTime(day.entry.starttime)}</td>
									<td>{formatTime(day.entry.endtime)}</td>
									<td>{day.entry.breakduration || '-'}</td>
									<td><strong>{calculateHours(day.entry)}</strong></td>
									<td>
										{#if day.entry.absence_type === 'vacation'}
											<span class="badge bg-warning text-dark">
												<i class="bi bi-umbrella"></i> Urlaub
											</span>
										{:else if day.entry.absence_type === 'comp_time'}
											<span class="badge bg-info text-dark">
												<i class="bi bi-clock-history"></i> Freizeitausgleich
											</span>
										{:else}
											<span class="badge bg-success">
												<i class="bi bi-check-circle"></i> Arbeitszeit
											</span>
										{/if}
									</td>
									<td>{day.entry.comment || '-'}</td>
									<td>
										<button class="btn btn-sm btn-outline-primary me-1" onclick={() => openEditForm(day.entry)}>
											<i class="bi bi-pencil"></i>
										</button>
										<button class="btn btn-sm btn-outline-danger" onclick={() => deleteEntry(day.entry.id)}>
											<i class="bi bi-trash"></i>
										</button>
									</td>
								{:else}
									<td>-</td>
									<td>-</td>
									<td>-</td>
									<td>-</td>
									<td>-</td>
									<td>{day.holiday ? day.holiday.name : '-'}</td>
									<td>
										<button class="btn btn-sm btn-outline-success" onclick={() => openNewForm(day.date)}>
											<i class="bi bi-plus-circle"></i>
										</button>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
					<tfoot class="table-light">
						<tr>
							<td colspan="4" class="text-end"><strong>Ist-Arbeitszeit:</strong></td>
							<td><strong class="text-primary">{calculateTotalHours()}</strong></td>
							<td colspan="3">
								<span class="badge bg-success me-2">{countWorkDays()} Arbeitstage</span>
								<span class="badge bg-warning text-dark me-2">{countVacationDays()} Urlaub</span>
							<span class="badge bg-info text-dark">{countCompTimeDays()} Freizeitausgleich</span>
							</td>
						</tr>
						{#if targetMinutes > 0}
							<tr>
								<td colspan="4" class="text-end"><strong>Soll-Arbeitszeit:</strong></td>
								<td><strong class="text-info">{calculateTargetHours()}</strong></td>
								<td colspan="3">
									{#if targetWorkDays > 0}
										<span class="badge bg-info text-dark">{targetWorkDays} Arbeitstage (Soll)</span>
									{/if}
								</td>
							</tr>
							<tr class="fw-bold">
								<td colspan="4" class="text-end">Differenz:</td>
								<td>
									{#if calculateDifference().text !== '-'}
										{@const diff = calculateDifference()}
										<strong class={diff.isPositive ? 'text-success' : 'text-danger'}>
											{diff.text}
										</strong>
									{:else}
										<span class="text-muted">-</span>
									{/if}
								</td>
								<td colspan="3"></td>
							</tr>
						<tr class="fw-bold table-primary">
							<td colspan="4" class="text-end">Übertrag in Folgemonat:</td>
							<td>
								{#if calculateDifference().text !== '-'}
									{@const totalCarry = calculateTotalCarryover()}
									<strong class={totalCarry.isPositive ? 'text-success' : 'text-danger'}>
										{totalCarry.text}
									</strong>
								{:else}
									<span class="text-muted">-</span>
								{/if}
							</td>
							<td colspan="3">
								<span class="badge bg-secondary">Kumulierter Übertrag</span>
							</td>
						</tr>
					{/if}					</tfoot>
				</table>
			</div>
			
			{#if !loading}
				<div class="card mt-4">
					<div class="card-body">
						<div class="d-flex justify-content-between align-items-center">
							<button class="btn btn-outline-secondary" onclick={previousMonth} aria-label="Vorheriger Monat">
								<i class="bi bi-chevron-left"></i>
							</button>
							<h3 class="mb-0">{months[currentMonth - 1]} {currentYear}</h3>
							<button class="btn btn-outline-secondary" onclick={nextMonth} aria-label="Nächster Monat">
								<i class="bi bi-chevron-right"></i>
							</button>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

{#if showForm}
	<div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">
						{editingEntry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
					</h5>
					<button type="button" class="btn-close" onclick={closeForm}></button>
				</div>
				<div class="modal-body">
					<div class="mb-3">
						<label class="form-label" for="formDate">Datum</label>
						<input type="date" class="form-control" id="formDate" bind:value={formDate} required>
					</div>
					
					<div class="mb-3">
						<label class="form-label">Typ</label>
						<div class="form-check">
							<input class="form-check-input" type="radio" name="absenceType" id="typeWork" value="work" bind:group={formAbsenceType}>
							<label class="form-check-label" for="typeWork">
								Arbeitszeit
							</label>
						</div>
						<div class="form-check">
							<input class="form-check-input" type="radio" name="absenceType" id="typeVacation" value="vacation" bind:group={formAbsenceType}>
							<label class="form-check-label" for="typeVacation">
								Urlaub
							</label>
						</div>
						<div class="form-check">
							<input class="form-check-input" type="radio" name="absenceType" id="typeCompTime" value="comp_time" bind:group={formAbsenceType}>
							<label class="form-check-label" for="typeCompTime">
								Freizeitausgleich
							</label>
						</div>
					</div>
					
					{#if formAbsenceType === 'work'}
						<div class="row">
							<div class="col-md-6 mb-3">
								<label class="form-label" for="formStarttime">Startzeit</label>
								<input type="time" class="form-control" id="formStarttime" bind:value={formStarttime}>
							</div>
							<div class="col-md-6 mb-3">
								<label class="form-label" for="formEndtime">Endzeit</label>
								<input type="time" class="form-control" id="formEndtime" bind:value={formEndtime}>
							</div>
						</div>
						
						<div class="mb-3">
							<label class="form-label" for="formBreakduration">Pause (Minuten)</label>
							<input type="number" class="form-control" id="formBreakduration" bind:value={formBreakduration} min="0" step="15">
						</div>
					{/if}
					
					<div class="mb-3">
						<label class="form-label" for="formComment">Anmerkung</label>
						<textarea class="form-control" id="formComment" bind:value={formComment} rows="2"></textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-warning me-auto" onclick={loadStandardTimes}>
						<i class="bi bi-clock-history"></i> Standard-Zeiten
					</button>
					<button type="button" class="btn btn-secondary" onclick={closeForm}>Abbrechen</button>
					<button type="button" class="btn btn-primary" onclick={saveEntry}>Speichern</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showCarryoverModal}
	<div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">Vormonats-Übertrag korrigieren</h5>
					<button type="button" class="btn-close" onclick={() => showCarryoverModal = false}></button>
				</div>
				<div class="modal-body">
					
					<div class="mb-3">
						{#if true}
							{@const prevMonth = currentMonth - 1 === 0 ? 12 : currentMonth - 1}
							{@const prevYear = currentMonth - 1 === 0 ? currentYear - 1 : currentYear}
							<label class="form-label">Aktueller Wert aus Vormonat <strong>({months[prevMonth - 1]} {prevYear})</strong>:</label>
						{/if}
						<div class="form-control-plaintext">
							<strong class={previousMonthCarryover >= 0 ? 'text-success' : 'text-danger'}>
								{formatMinutesToTime(previousMonthCarryover).text}
							</strong>
						</div>
					</div>
					
					<div class="mb-3">
						<label class="form-label">Korrigierter Übertrag:</label>
						<div class="row">
							<div class="col-4">
								<div class="form-check">
									<input 
										class="form-check-input" 
										type="radio" 
										name="carryoverSign" 
										id="positiveRadio"
										checked={carryoverIsPositive}
										onchange={() => carryoverIsPositive = true}
									>
									<label class="form-check-label" for="positiveRadio">
										+ Plus
									</label>
								</div>
								<div class="form-check">
									<input 
										class="form-check-input" 
										type="radio" 
										name="carryoverSign" 
										id="negativeRadio"
										checked={!carryoverIsPositive}
										onchange={() => carryoverIsPositive = false}
									>
									<label class="form-check-label" for="negativeRadio">
										- Minus
									</label>
								</div>
							</div>
							<div class="col-8">
								<label class="form-label">Zeit (hh:mm)</label>
								<div class="d-flex gap-2 align-items-center">
									<input 
										type="time" 
										class="form-control" 
										bind:value={carryoverCorrectionTime} 
									>
								</div>
								<small class="form-text text-muted">z.B. 07:48 für 7 Stunden 48 Minuten</small>
							</div>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-danger me-auto" onclick={deleteCarryoverCorrection}>
						<i class="bi bi-trash"></i> Korrektur löschen
					</button>
					<button type="button" class="btn btn-secondary" onclick={() => showCarryoverModal = false}>
						Abbrechen
					</button>
					<button type="button" class="btn btn-primary" onclick={saveCarryoverCorrection}>
						<i class="bi bi-check-lg"></i> Speichern
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if toast}
	<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
		<div class="toast show" role="alert">
			<div class="toast-header">
				<strong class="me-auto">Benachrichtigung</strong>
				<button type="button" class="btn-close" onclick={() => toast = ''}></button>
			</div>
			<div class="toast-body">
				{toast}
			</div>
		</div>
	</div>
{/if}
