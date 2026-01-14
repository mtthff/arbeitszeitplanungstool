<script>
	import { base } from '$app/paths';
	
	let { data } = $props();
	let user = $derived(data.user);
	
	let currentYear = $state(new Date().getFullYear());
	let currentMonth = $state(new Date().getMonth() + 1);
	let entries = $state([]);
	let allDays = $state([]);
	let loading = $state(false);
	let showForm = $state(false);
	let editingEntry = $state(null);
	
	// Formularfelder
	let formDate = $state('');
	let formStarttime = $state('');
	let formEndtime = $state('');
	let formBreakduration = $state(30);
	let formVacation = $state(false);
	let formComment = $state('');
	let toast = $state('');
	
	// User-Daten mit Standard-Arbeitszeiten
	let userData = $state(null);
	
	// Sollarbeitszeit für den aktuellen Monat
	let targetWorkDays = $state(0);
	
	// Übertrag aus Vormonat
	let previousMonthCarryover = $state(0);
	let showCarryoverModal = $state(false);
	let carryoverCorrectionHours = $state(0);
	let carryoverCorrectionMinutes = $state(0);
	let carryoverIsPositive = $state(true);
	
	const months = [
		'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
	];
	
	const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
	
	$effect(() => {
		loadUserData();
		loadEntries();
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
			} else {
				console.error('API Error:', result.message);
				targetWorkDays = 0;
			}
		} catch (e) {
			console.error('Fehler beim Laden der Sollarbeitszeit:', e);
			targetWorkDays = 0;
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
			
			days.push({
				date: dateStr,
				day: day,
				dayOfWeek: dayOfWeek,
				dayName: dayNames[dayOfWeek],
				entry: entry || null,
				isToday: dateStr === todayStr
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
		
		formVacation = false;
		formComment = '';
		showForm = true;
	}
	
	function openEditForm(entry) {
		editingEntry = entry;
		formDate = entry.date;
		formStarttime = entry.starttime || '';
		formEndtime = entry.endtime || '';
		formBreakduration = entry.breakduration || 30;
		formVacation = entry.vacation === 1;
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
			const payload = {
				user_id: user.id,
				date: formDate,
				starttime: formVacation ? null : formStarttime,
				endtime: formVacation ? null : formEndtime,
				breakduration: formVacation ? 0 : formBreakduration,
				vacation: formVacation,
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
		
		if (entry.vacation) return '7:48h';
		
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
				if (day.entry.vacation) {
					// Urlaubstag zählt als 7:48h (468 Minuten)
					totalMinutes += 468;
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
		return allDays.filter(day => day.entry && !day.entry.vacation).length;
	}
	
	function countVacationDays() {
		return allDays.filter(day => day.entry && day.entry.vacation).length;
	}
	
	function calculateTargetHours() {
		// 7:48h = 468 Minuten pro Tag
		const minutes = targetWorkDays * 468;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}:${String(mins).padStart(2, '0')}h`;
	}
	
	function calculateDifference() {
		if (targetWorkDays === 0) {
			return { text: '-', isPositive: true, minutes: 0 };
		}
		
		// Berechne Ist-Zeit in Minuten
		let actualMinutes = 0;
		for (const day of allDays) {
			if (day.entry) {
				if (day.entry.vacation) {
					actualMinutes += 468; // Urlaubstag = 7:48h
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
		
		// Berechne Soll-Zeit in Minuten
		const targetMinutes = targetWorkDays * 468;
		
		// Differenz
		const diffMinutes = actualMinutes - targetMinutes;
		const isPositive = diffMinutes >= 0;
		const absDiff = Math.abs(diffMinutes);
		const hours = Math.floor(absDiff / 60);
		const mins = absDiff % 60;
		
		const sign = isPositive ? '+' : '-';
		return { text: `${sign}${hours}:${String(mins).padStart(2, '0')}h`, isPositive, minutes: diffMinutes };
	}
	
	async function loadPreviousMonthCarryover() {
		try {
			// Berechne Vormonat
			let prevMonth = currentMonth - 1;
			let prevYear = currentYear;
			if (prevMonth === 0) {
				prevMonth = 12;
				prevYear--;
			}
			
			// Prüfe erst, ob eine manuelle Korrektur existiert
			const correctionResponse = await fetch(
				`${base}/api/carryover-corrections?user_id=${user.id}&year=${prevYear}&month=${prevMonth}`
			);
			const correctionResult = await correctionResponse.json();
			
			if (correctionResult.success && correctionResult.data) {
				// Verwende die manuelle Korrektur
				previousMonthCarryover = correctionResult.data.carryover_minutes;
				return;
			}
			
			// Falls keine Korrektur existiert, berechne automatisch
			// Lade Einträge des Vormonats
			const entriesResponse = await fetch(
				`${base}/api/timetable?user_id=${user.id}&month=${prevMonth}&year=${prevYear}`
			);
			const entriesResult = await entriesResponse.json();
			
			// Lade Soll-Stunden des Vormonats
			const targetResponse = await fetch(
				`${base}/api/target-hours?user_id=${user.id}&year=${prevYear}`
			);
			const targetResult = await targetResponse.json();
			
			if (!entriesResult.success || !targetResult.success) {
				previousMonthCarryover = 0;
				return;
			}
			
			const prevMonthData = targetResult.data.find(d => d.month === prevMonth);
			const prevTargetWorkDays = prevMonthData ? prevMonthData.work_days : 0;
			
			if (prevTargetWorkDays === 0) {
				previousMonthCarryover = 0;
				return;
			}
			
			// Berechne Ist-Zeit des Vormonats
			let actualMinutes = 0;
			for (const entry of entriesResult.data) {
				if (entry.vacation) {
					actualMinutes += 468; // Urlaubstag = 7:48h
				} else if (entry.starttime && entry.endtime) {
					const start = entry.starttime.split(':');
					const end = entry.endtime.split(':');
					const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
					const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
					const workMin = endMin - startMin - (entry.breakduration || 0);
					actualMinutes += workMin;
				}
			}
			
			// Berechne Soll-Zeit des Vormonats
			const targetMinutes = prevTargetWorkDays * 468;
			
			// Differenz = Übertrag
			previousMonthCarryover = actualMinutes - targetMinutes;
		} catch (e) {
			console.error('Fehler beim Laden des Vormonats-Übertrags:', e);
			previousMonthCarryover = 0;
		}
	}
	
	function formatMinutesToTime(minutes) {
		const isPositive = minutes >= 0;
		const absMinutes = Math.abs(minutes);
		const hours = Math.floor(absMinutes / 60);
		const mins = absMinutes % 60;
		const sign = isPositive ? '+' : '-';
		return { text: `${sign}${hours}:${String(mins).padStart(2, '0')}h`, isPositive };
	}
	
	function calculateTotalCarryover() {
		const currentDiff = calculateDifference();
		const totalMinutes = currentDiff.minutes + previousMonthCarryover;
		return formatMinutesToTime(totalMinutes);
	}
	
	function openCarryoverModal() {
		// Konvertiere aktuelle previousMonthCarryover in Stunden/Minuten
		const absMinutes = Math.abs(previousMonthCarryover);
		carryoverCorrectionHours = Math.floor(absMinutes / 60);
		carryoverCorrectionMinutes = absMinutes % 60;
		carryoverIsPositive = previousMonthCarryover >= 0;
		showCarryoverModal = true;
	}
	
	async function saveCarryoverCorrection() {
		// Berechne Vormonat (der korrigiert werden soll)
		let prevMonth = currentMonth - 1;
		let prevYear = currentYear;
		if (prevMonth === 0) {
			prevMonth = 12;
			prevYear--;
		}
		
		// Berechne Gesamtminuten
		const totalMinutes = (carryoverCorrectionHours * 60 + carryoverCorrectionMinutes) * (carryoverIsPositive ? 1 : -1);
		
		try {
			const response = await fetch(`${base}/api/carryover-corrections`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: user.id,
					year: prevYear,
					month: prevMonth,
					carryover_minutes: totalMinutes
				})
			});
			
			const result = await response.json();
			if (result.success) {
				showToast('Korrektur gespeichert');
				showCarryoverModal = false;
				// Neu laden
				await loadPreviousMonthCarryover();
			} else {
				showToast('Fehler beim Speichern');
			}
		} catch (e) {
			console.error('Fehler:', e);
			showToast('Fehler beim Speichern');
		}
	}
	
	async function deleteCarryoverCorrection() {
		if (!confirm('Möchten Sie die manuelle Korrektur wirklich löschen? Der Übertrag wird dann automatisch berechnet.')) {
			return;
		}
		
		// Berechne Vormonat (der korrigiert werden soll)
		let prevMonth = currentMonth - 1;
		let prevYear = currentYear;
		if (prevMonth === 0) {
			prevMonth = 12;
			prevYear--;
		}
		
		try {
			const response = await fetch(
				`${base}/api/carryover-corrections?user_id=${user.id}&year=${prevYear}&month=${prevMonth}`,
				{ method: 'DELETE' }
			);
			
			const result = await response.json();
			if (result.success) {
				showToast('Korrektur gelöscht');
				showCarryoverModal = false;
				// Neu laden
				await loadPreviousMonthCarryover();
			} else {
				showToast('Fehler beim Löschen');
			}
		} catch (e) {
			console.error('Fehler:', e);
			showToast('Fehler beim Löschen');
		}
	}

	async function fillMonthWithDefaults() {
		if (!userData) {
			showToast('Benutzerdaten nicht geladen');
			return;
		}
		
		if (!confirm('Alle verbleibenden Tage dieses Monats mit Standardarbeitszeiten ausfüllen?')) {
			return;
		}
		
		loading = true;
		let savedCount = 0;
		let errorCount = 0;
		
		try {
			// Heute als Startdatum
			const today = new Date();
			const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
			
			// Nur Tage ab heute und im aktuell gewählten Monat
			const daysToFill = allDays.filter(day => {
				// Nur Tage ohne Eintrag
				if (day.entry) return false;
				
				// Nur wenn im aktuell gewählten Monat
				const dayDate = new Date(day.date + 'T00:00:00');
				if (dayDate.getFullYear() !== currentYear || dayDate.getMonth() + 1 !== currentMonth) {
					return false;
				}
				
				// Nur Tage ab heute
				return day.date >= todayStr;
			});
			
			for (const day of daysToFill) {
				let startHour = null, startMinute = null, endHour = null, endMinute = null;
				
				// Hole Standardzeiten für diesen Wochentag
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
				
				// Wenn der Tag als freier Tag konfiguriert ist (NULL-Werte), überspringe
				if (startHour === null || startMinute === null || endHour === null || endMinute === null) {
					continue;
				}
				
				// Formatiere Zeiten
				const starttime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
				const endtime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
				
				const payload = {
					user_id: user.id,
					date: day.date,
					starttime: starttime,
					endtime: endtime,
					breakduration: userData.default_break || 30,
					vacation: false,
					comment: ''
				};
				
				try {
					const response = await fetch(`${base}/api/timetable`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload)
					});
					
					const result = await response.json();
					if (result.success) {
						savedCount++;
					} else {
						errorCount++;
					}
				} catch (e) {
					errorCount++;
				}
			}
			
			// Lade Einträge neu
			await loadEntries();
			
			if (savedCount > 0) {
				showToast(`${savedCount} Tag(e) erfolgreich ausgefüllt${errorCount > 0 ? `, ${errorCount} Fehler` : ''}`);
			} else {
				showToast('Keine Tage zum Ausfüllen gefunden');
			}
		} catch (e) {
			showToast('Fehler beim Ausfüllen des Monats');
		} finally {
			loading = false;
		}
	}
</script>

<div class="row">
	<div class="col-12">
		<div class="d-flex justify-content-between align-items-center mb-4">
			<h1><i class="bi bi-calendar3"></i> Meine Arbeitszeiten</h1>
			<div>
				<button class="btn btn-warning me-2" onclick={openCarryoverModal}>
					<i class="bi bi-pencil-square"></i> Vormonat korrigieren
				</button>
				<button class="btn btn-success me-2" onclick={fillMonthWithDefaults}>
					<i class="bi bi-calendar-check-fill"></i> Monat ausfüllen
				</button>
				<button class="btn btn-primary" onclick={openNewForm}>
					<i class="bi bi-plus-circle"></i> Neuer Eintrag
				</button>
			</div>
		</div>
		
		<div class="card mb-4">
			<div class="card-body">
				<div class="d-flex justify-content-between align-items-center">
					<button class="btn btn-outline-secondary" onclick={previousMonth}>
						<i class="bi bi-chevron-left"></i>
					</button>
					<h3 class="mb-0">{months[currentMonth - 1]} {currentYear}</h3>
					<button class="btn btn-outline-secondary" onclick={nextMonth}>
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
						{#each allDays as day}
							<tr class:table-warning={day.entry?.vacation === 1} 
							    class:table-secondary={day.dayOfWeek === 0 || day.dayOfWeek === 6}
							    class:table-primary={day.isToday}
							    style={day.isToday ? 'border-left: 4px solid #0d6efd;' : ''}>
								<td>
									<strong>{day.dayName}</strong>, {day.day}.{currentMonth}.{currentYear}
									{#if day.isToday}
										<span class="badge bg-primary ms-2">Heute</span>
									{/if}
								</td>
								{#if day.entry}
									<td>{day.entry.starttime || '-'}</td>
									<td>{day.entry.endtime || '-'}</td>
									<td>{day.entry.breakduration || '-'}</td>
									<td><strong>{calculateHours(day.entry)}</strong></td>
									<td>
										{#if day.entry.vacation === 1}
											<span class="badge bg-warning text-dark">
												<i class="bi bi-umbrella"></i> Urlaub/Frei
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
									<td>-</td>
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
								<span class="badge bg-warning text-dark">{countVacationDays()} Urlaub</span>
							</td>
						</tr>
						{#if targetWorkDays > 0}
							<tr>
								<td colspan="4" class="text-end"><strong>Soll-Arbeitszeit:</strong></td>
								<td><strong class="text-info">{calculateTargetHours()}</strong></td>
								<td colspan="3">
									<span class="badge bg-info text-dark">{targetWorkDays} Arbeitstage (Soll)</span>
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
							</tr>						<tr>
							<td colspan="4" class="text-end"><strong>Summe aus Vormonat:</strong></td>
							<td>
								<strong class={previousMonthCarryover >= 0 ? 'text-success' : 'text-danger'}>
									{formatMinutesToTime(previousMonthCarryover).text}
								</strong>
							</td>
							<td colspan="3"></td>
						</tr>
						<tr class="fw-bold table-primary">
							<td colspan="4" class="text-end">Übertrag +/-:</td>
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
						<label class="form-label">Datum</label>
						<input type="date" class="form-control" bind:value={formDate} required>
					</div>
					
					<div class="mb-3 form-check">
						<input type="checkbox" class="form-check-input" id="vacationCheck" bind:checked={formVacation}>
						<label class="form-check-label" for="vacationCheck">
							Urlaub / Freiwunsch
						</label>
					</div>
					
					{#if !formVacation}
						<div class="row">
							<div class="col-md-6 mb-3">
								<label class="form-label">Startzeit</label>
								<input type="time" class="form-control" bind:value={formStarttime}>
							</div>
							<div class="col-md-6 mb-3">
								<label class="form-label">Endzeit</label>
								<input type="time" class="form-control" bind:value={formEndtime}>
							</div>
						</div>
						
						<div class="mb-3">
							<label class="form-label">Pause (Minuten)</label>
							<input type="number" class="form-control" bind:value={formBreakduration} min="0" step="15">
						</div>
					{/if}
					
					<div class="mb-3">
						<label class="form-label">Anmerkung</label>
						<textarea class="form-control" bind:value={formComment} rows="2"></textarea>
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
							<div class="col-4">
								<label class="form-label">Stunden</label>
								<input 
									type="number" 
									class="form-control" 
									bind:value={carryoverCorrectionHours} 
									min="0"
								>
							</div>
							<div class="col-4">
								<label class="form-label">Minuten</label>
								<input 
									type="number" 
									class="form-control" 
									bind:value={carryoverCorrectionMinutes} 
									min="0" 
									max="59"
								>
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
