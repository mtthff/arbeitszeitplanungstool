<script>
	import { base } from '$app/paths';
	
	let { data } = $props();
	let user = $derived(data.user);
	
	let users = $state([]);
	let selectedUser = $state(null);
	let currentYear = $state(new Date().getFullYear());
	let currentMonth = $state(new Date().getMonth() + 1);
	let entries = $state([]);
	let loading = $state(false);
	let emailSubject = $state('');
	let emailBody = $state('');
	let showEmailModal = $state(false);
	let toast = $state('');
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
	
	function formatTime(timeStr) {
		if (!timeStr) return '-';
		// Zeit ist im Format HH:MM:SS, wir wollen nur HH:MM
		return timeStr.substring(0, 5);
	}
	
	$effect(() => {
		loadUsers();
	});
	
	async function loadUsers() {
		try {
			const response = await fetch(`${base}/api/users`);
			const result = await response.json();
			if (result.success) {
				// Nur nicht-archivierte Benutzer laden
				users = result.data;
				if (users.length > 0 && !selectedUser) {
					selectedUser = users[0].id;
				}
			}
		} catch (e) {
			showToast('Fehler beim Laden der Benutzer');
		}
	}
	
	$effect(() => {
		if (selectedUser) {
			loadEntries();
			loadTargetHours();
			loadPreviousMonthCarryover();
		}
	});
	
	async function loadEntries() {
		loading = true;
		try {
			const response = await fetch(
				`${base}/api/timetable?user_id=${selectedUser}&month=${currentMonth}&year=${currentYear}`
			);
			const result = await response.json();
			if (result.success) {
				entries = result.data;
			}
		} catch (e) {
			showToast('Fehler beim Laden');
		} finally {
			loading = false;
		}
	}
	
	async function loadTargetHours() {
		try {
			const response = await fetch(`${base}/api/target-hours?user_id=${selectedUser}&year=${currentYear}`);
			
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
	
	function openEmailModal() {
		const selectedUserObj = users.find(u => u.id === selectedUser);
		emailSubject = `Arbeitszeit ${months[currentMonth - 1]} ${currentYear}`;
		emailBody = `Hallo ${selectedUserObj?.name},\n\n`;
		showEmailModal = true;
	}
	
	function sendEmail() {
		const selectedUserObj = users.find(u => u.id === selectedUser);
		const mailto = `mailto:${selectedUserObj?.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
		window.location.href = mailto;
		showEmailModal = false;
		showToast('E-Mail-Client geöffnet');
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
		if (entry.vacation || !entry.starttime || !entry.endtime) return '-';
		
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
		
		for (const entry of entries) {
			if (entry.vacation) {
				// Urlaubstag zählt als 7:48h (468 Minuten)
				totalMinutes += 468;
			} else if (entry.starttime && entry.endtime) {
				const start = entry.starttime.split(':');
				const end = entry.endtime.split(':');
				const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
				const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
				const workMin = endMin - startMin - (entry.breakduration || 0);
				totalMinutes += workMin;
			}
		}
		
		const hours = Math.floor(totalMinutes / 60);
		const mins = totalMinutes % 60;
		
		return `${hours}:${String(mins).padStart(2, '0')}h`;
	}
	
	function countWorkDays() {
		return entries.filter(entry => !entry.vacation).length;
	}
	
	function countVacationDays() {
		return entries.filter(entry => entry.vacation).length;
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
		for (const entry of entries) {
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
		if (!selectedUser) {
			previousMonthCarryover = 0;
			return;
		}
		
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
				`${base}/api/carryover-corrections?user_id=${selectedUser}&year=${prevYear}&month=${prevMonth}`
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
				`${base}/api/timetable?user_id=${selectedUser}&month=${prevMonth}&year=${prevYear}`
			);
			const entriesResult = await entriesResponse.json();
			
			// Lade Soll-Stunden des Vormonats
			const targetResponse = await fetch(
				`${base}/api/target-hours?user_id=${selectedUser}&year=${prevYear}`
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
		if (!selectedUser) return;
		
		// Konvertiere aktuelle previousMonthCarryover in Stunden/Minuten
		const absMinutes = Math.abs(previousMonthCarryover);
		carryoverCorrectionHours = Math.floor(absMinutes / 60);
		carryoverCorrectionMinutes = absMinutes % 60;
		carryoverIsPositive = previousMonthCarryover >= 0;
		showCarryoverModal = true;
	}
	
	async function saveCarryoverCorrection() {
		if (!selectedUser) return;
		
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
					user_id: selectedUser,
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
		if (!selectedUser) return;
		
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
				`${base}/api/carryover-corrections?user_id=${selectedUser}&year=${prevYear}&month=${prevMonth}`,
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
</script>

<div class="row">
	<div class="col-12">
		<h1><i class="bi bi-people"></i> Team-Übersicht</h1>
		
		<div class="row mt-4">
			<div class="col-md-3 mb-3">
				<div class="card">
					<div class="card-header bg-primary text-white">
						<strong>Alle Mitarbeiter:innen</strong>
					</div>
					<div class="list-group list-group-flush">
						{#each users as u}
							<button
								class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
								class:active={selectedUser === u.id}
								onclick={() => selectedUser = u.id}
							>
								<span>
									<i class="bi bi-person"></i> {u.name}
								</span>
								<span>
									{#if u.is_admin}
										<span class="badge bg-danger" title="Admin">A</span>
									{/if}
									{#if u.is_leitung}
										<span class="badge bg-warning text-dark" title="Leitung">L</span>
									{/if}
								</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
			
			<div class="col-md-9">
				{#if selectedUser}
					<div class="card mb-3">
						<div class="card-body">
							<div class="d-flex justify-content-between align-items-center">
								<div>
									<button class="btn btn-outline-secondary" onclick={previousMonth}>
										<i class="bi bi-chevron-left"></i>
									</button>
									<span class="mx-3 fs-5"><strong>{months[currentMonth - 1]} {currentYear}</strong></span>
									<button class="btn btn-outline-secondary" onclick={nextMonth}>
										<i class="bi bi-chevron-right"></i>
									</button>
								</div>
							<button class="btn btn-primary" onclick={openEmailModal}>
								<i class="bi bi-envelope"></i> Anmerkung senden
							</button>
							</div>
						</div>
					</div>
					
					{#if loading}
						<div class="text-center py-5">
							<div class="spinner-border text-primary" role="status"></div>
						</div>
					{:else if entries.length === 0}
						<div class="alert alert-info">
							<i class="bi bi-info-circle"></i> Keine Einträge für diesen Monat vorhanden.
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
									</tr>
								</thead>
								<tbody>
									{#each entries as entry}
										<tr class:table-warning={entry.vacation === 1}>
											<td>{formatDate(entry.date)}</td>
									<td>{formatTime(entry.starttime)}</td>
									<td>{formatTime(entry.endtime)}</td>
											<td>{entry.breakduration || '-'}</td>
											<td><strong>{calculateHours(entry)}</strong></td>
											<td>
												{#if entry.vacation === 1}
													<span class="badge bg-warning text-dark">
														<i class="bi bi-umbrella"></i> Urlaub/Frei
													</span>
												{:else}
													<span class="badge bg-success">
														<i class="bi bi-check-circle"></i> Arbeitszeit
													</span>
												{/if}
											</td>
											<td>{entry.comment || '-'}</td>
										</tr>
									{/each}
								</tbody>
								<tfoot class="table-light">
									<tr>
										<td colspan="4" class="text-end"><strong>Ist-Arbeitszeit:</strong></td>
										<td><strong class="text-primary">{calculateTotalHours()}</strong></td>
										<td colspan="2">
											<span class="badge bg-success me-2">{countWorkDays()} Arbeitstage</span>
											<span class="badge bg-warning text-dark">{countVacationDays()} Urlaub</span>
										</td>
									</tr>
									{#if targetWorkDays > 0}
										<tr>
											<td colspan="4" class="text-end"><strong>Soll-Arbeitszeit:</strong></td>
											<td><strong class="text-info">{calculateTargetHours()}</strong></td>
											<td colspan="2">
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
											<td colspan="2"></td>
										</tr>									<tr>
										<td colspan="4" class="text-end"><strong>Summe aus Vormonat:</strong></td>
										<td>
											<strong class={previousMonthCarryover >= 0 ? 'text-success' : 'text-danger'}>
												{formatMinutesToTime(previousMonthCarryover).text}
											</strong>
										</td>
										<td colspan="2"></td>
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
										<td colspan="2">
											<span class="badge bg-secondary">Kumulierter Übertrag</span>
										</td>
									</tr>									{/if}
								</tfoot>
							</table>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>

{#if showEmailModal}
	<div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">Anmerkung per E-Mail senden</h5>
					<button type="button" class="btn-close" onclick={() => showEmailModal = false}></button>
				</div>
				<div class="modal-body">
					<div class="mb-3">
						<label class="form-label">Betreff</label>
						<input type="text" class="form-control" bind:value={emailSubject}>
					</div>
					<div class="mb-3">
						<label class="form-label">Nachricht</label>
						<textarea class="form-control" bind:value={emailBody} rows="6"></textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => showEmailModal = false}>Abbrechen</button>
					<button type="button" class="btn btn-primary" onclick={sendEmail}>
						<i class="bi bi-send"></i> E-Mail-Client öffnen
					</button>
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
					<div class="alert alert-info">
						<i class="bi bi-info-circle"></i> Hier können Sie den Übertrag aus dem Vormonat manuell korrigieren. 
						Dies überschreibt die automatische Berechnung für diesen Monat.
					</div>
					
					<div class="mb-3">
						<label class="form-label">Aktueller Wert aus Vormonat:</label>
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
