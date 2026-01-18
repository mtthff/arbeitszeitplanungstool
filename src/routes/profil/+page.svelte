<script>
// @ts-nocheck

	import { base } from '$app/paths';
	
	let { data } = $props();
	let user = $derived(data.user);
	
	// Persönliche Daten
	let email = $state('');
	let employmentPercentage = $state(100);
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	
	// Rahmendienstplan - separate Felder für jeden Tag
	let mondayStartHour = $state(9);
	let mondayStartMinute = $state(0);
	let mondayEndHour = $state(17);
	let mondayEndMinute = $state(0);
	
	let tuesdayStartHour = $state(9);
	let tuesdayStartMinute = $state(0);
	let tuesdayEndHour = $state(17);
	let tuesdayEndMinute = $state(0);
	
	let wednesdayStartHour = $state(9);
	let wednesdayStartMinute = $state(0);
	let wednesdayEndHour = $state(17);
	let wednesdayEndMinute = $state(0);
	
	let thursdayStartHour = $state(9);
	let thursdayStartMinute = $state(0);
	let thursdayEndHour = $state(17);
	let thursdayEndMinute = $state(0);
	
	let fridayStartHour = $state(9);
	let fridayStartMinute = $state(0);
	let fridayEndHour = $state(17);
	let fridayEndMinute = $state(0);
	
	let saturdayStartHour = $state(null);
	let saturdayStartMinute = $state(null);
	let saturdayEndHour = $state(null);
	let saturdayEndMinute = $state(null);
	
	let sundayStartHour = $state(null);
	let sundayStartMinute = $state(null);
	let sundayEndHour = $state(null);
	let sundayEndMinute = $state(null);
	
	let defaultBreak = $state(30);
	
	// Freier Tag Checkboxen
	let mondayIsFree = $state(false);
	let tuesdayIsFree = $state(false);
	let wednesdayIsFree = $state(false);
	let thursdayIsFree = $state(false);
	let fridayIsFree = $state(false);
	let saturdayIsFree = $state(true);
	let sundayIsFree = $state(true);
	
	let toast = $state('');
	let activeTab = $state('worktimes'); // 'personal', 'worktimes', oder 'target'
	let loading = $state(true);
	
	// Sollarbeitszeit
	let currentYear = $state(new Date().getFullYear());
	let targetHours = $state(Array(12).fill(0).map((_, i) => ({ month: i + 1, work_days: 0 })));
	let decimalHours = $state(Array(12).fill('0.00'));
	
	const monthNames = [
		'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
	];
	
	// Initialisiere Felder wenn user verfügbar ist
	$effect(() => {
		if (user) {
			loadUserData();
			loadTargetHours();
		}
	});
	
	async function loadUserData() {
		try {
			const response = await fetch(`${base}/api/users/${user.id}`);
			const result = await response.json();
			
			if (result.success) {
				const userData = result.data;
				email = userData.email || '';
				employmentPercentage = userData.employment_percentage || 100;
				
				// Montag
				mondayIsFree = userData.default_monday_start_hour === null;
				mondayStartHour = userData.default_monday_start_hour ?? 9;
				mondayStartMinute = userData.default_monday_start_minute ?? 0;
				mondayEndHour = userData.default_monday_end_hour ?? 17;
				mondayEndMinute = userData.default_monday_end_minute ?? 0;
				
				// Dienstag
				tuesdayIsFree = userData.default_tuesday_start_hour === null;
				tuesdayStartHour = userData.default_tuesday_start_hour ?? 9;
				tuesdayStartMinute = userData.default_tuesday_start_minute ?? 0;
				tuesdayEndHour = userData.default_tuesday_end_hour ?? 17;
				tuesdayEndMinute = userData.default_tuesday_end_minute ?? 0;
				
				// Mittwoch
				wednesdayIsFree = userData.default_wednesday_start_hour === null;
				wednesdayStartHour = userData.default_wednesday_start_hour ?? 9;
				wednesdayStartMinute = userData.default_wednesday_start_minute ?? 0;
				wednesdayEndHour = userData.default_wednesday_end_hour ?? 17;
				wednesdayEndMinute = userData.default_wednesday_end_minute ?? 0;
				
				// Donnerstag
				thursdayIsFree = userData.default_thursday_start_hour === null;
				thursdayStartHour = userData.default_thursday_start_hour ?? 9;
				thursdayStartMinute = userData.default_thursday_start_minute ?? 0;
				thursdayEndHour = userData.default_thursday_end_hour ?? 17;
				thursdayEndMinute = userData.default_thursday_end_minute ?? 0;
				
				// Freitag
				fridayIsFree = userData.default_friday_start_hour === null;
				fridayStartHour = userData.default_friday_start_hour ?? 9;
				fridayStartMinute = userData.default_friday_start_minute ?? 0;
				fridayEndHour = userData.default_friday_end_hour ?? 17;
				fridayEndMinute = userData.default_friday_end_minute ?? 0;
				
				// Samstag
				saturdayIsFree = userData.default_saturday_start_hour === null;
				saturdayStartHour = userData.default_saturday_start_hour ?? 9;
				saturdayStartMinute = userData.default_saturday_start_minute ?? 0;
				saturdayEndHour = userData.default_saturday_end_hour ?? 17;
				saturdayEndMinute = userData.default_saturday_end_minute ?? 0;
				
				// Sonntag
				sundayIsFree = userData.default_sunday_start_hour === null;
				sundayStartHour = userData.default_sunday_start_hour ?? 9;
				sundayStartMinute = userData.default_sunday_start_minute ?? 0;
				sundayEndHour = userData.default_sunday_end_hour ?? 17;
				sundayEndMinute = userData.default_sunday_end_minute ?? 0;
				
				defaultBreak = userData.default_break || 30;
			}
		} catch (e) {
			console.error('Fehler beim Laden:', e);
		} finally {
			loading = false;
		}
	}
	
	async function savePersonalData() {
		if (newPassword && newPassword !== confirmPassword) {
			showToast('Passwörter stimmen nicht überein');
			return;
		}
		
		if (newPassword && newPassword.length < 6) {
			showToast('Passwort muss mindestens 6 Zeichen lang sein');
			return;
		}
		
		try {
			const payload = {
				email: email,
				employment_percentage: employmentPercentage
			};
			
			if (newPassword) {
				// @ts-ignore
				payload.password = newPassword;
			}
			
			const response = await fetch(`${base}/api/users/${user.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			
			const result = await response.json();
			if (result.success) {
				showToast('Persönliche Daten gespeichert');
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
			} else {
				showToast(result.message || 'Fehler beim Speichern');
			}
		} catch (e) {
			showToast('Fehler beim Speichern');
		}
	}
	
	// @ts-ignore
	async function saveWorkTimes() {
		try {
			const payload = {
				default_monday_start_hour: mondayIsFree ? null : mondayStartHour,
				default_monday_start_minute: mondayIsFree ? null : mondayStartMinute,
				default_monday_end_hour: mondayIsFree ? null : mondayEndHour,
				default_monday_end_minute: mondayIsFree ? null : mondayEndMinute,
				
				default_tuesday_start_hour: tuesdayIsFree ? null : tuesdayStartHour,
				default_tuesday_start_minute: tuesdayIsFree ? null : tuesdayStartMinute,
				default_tuesday_end_hour: tuesdayIsFree ? null : tuesdayEndHour,
				default_tuesday_end_minute: tuesdayIsFree ? null : tuesdayEndMinute,
				
				default_wednesday_start_hour: wednesdayIsFree ? null : wednesdayStartHour,
				default_wednesday_start_minute: wednesdayIsFree ? null : wednesdayStartMinute,
				default_wednesday_end_hour: wednesdayIsFree ? null : wednesdayEndHour,
				default_wednesday_end_minute: wednesdayIsFree ? null : wednesdayEndMinute,
				
				default_thursday_start_hour: thursdayIsFree ? null : thursdayStartHour,
				default_thursday_start_minute: thursdayIsFree ? null : thursdayStartMinute,
				default_thursday_end_hour: thursdayIsFree ? null : thursdayEndHour,
				default_thursday_end_minute: thursdayIsFree ? null : thursdayEndMinute,
				
				default_friday_start_hour: fridayIsFree ? null : fridayStartHour,
				default_friday_start_minute: fridayIsFree ? null : fridayStartMinute,
				default_friday_end_hour: fridayIsFree ? null : fridayEndHour,
				default_friday_end_minute: fridayIsFree ? null : fridayEndMinute,
				
				default_saturday_start_hour: saturdayIsFree ? null : saturdayStartHour,
				default_saturday_start_minute: saturdayIsFree ? null : saturdayStartMinute,
				default_saturday_end_hour: saturdayIsFree ? null : saturdayEndHour,
				default_saturday_end_minute: saturdayIsFree ? null : saturdayEndMinute,
				
				default_sunday_start_hour: sundayIsFree ? null : sundayStartHour,
				default_sunday_start_minute: sundayIsFree ? null : sundayStartMinute,
				default_sunday_end_hour: sundayIsFree ? null : sundayEndHour,
				default_sunday_end_minute: sundayIsFree ? null : sundayEndMinute,
				
				default_break: defaultBreak
			};
			
			
			const response = await fetch(`${base}/api/users/${user.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			
			const result = await response.json();
			
			if (result.success) {
				showToast('Rahmendienstplan gespeichert');
				// Lade Daten neu
				await loadUserData();
			} else {
				showToast(result.message || 'Fehler beim Speichern');
			}
		} catch (e) {
			console.error('Fehler:', e);
			showToast('Fehler beim Speichern');
		}
	}
	
	async function loadTargetHours() {
		try {
			const response = await fetch(`${base}/api/target-hours?user_id=${user.id}&year=${currentYear}`);
			const result = await response.json();
			
			if (result.success) {
				// Erstelle Array mit allen 12 Monaten
				const loadedData = result.data;
				targetHours = Array(12).fill(0).map((_, i) => {
					const month = i + 1;
					// @ts-ignore
					const existing = loadedData.find(d => d.month === month);
					const workDays = existing ? existing.work_days : 0; // work_days kommt nun aus work_days_calendar
					const storedMinutes = existing ? existing.target_minutes : null;
					const calculatedMinutes = Math.round(workDays * 468 * (employmentPercentage / 100));
					return {
						month: month,
						work_days: workDays, // read-only, aus globaler Tabelle
						target_minutes: storedMinutes ?? calculatedMinutes
					};
				});
				// Aktualisiere decimalHours Array
				decimalHours = targetHours.map(e => getDecimalHoursFromMinutes(e.target_minutes));
			}
		} catch (e) {
			console.error('Fehler beim Laden der Sollarbeitszeit:', e);
		}
	}
	
	async function saveTargetHours() {
		try {
			// Speichere nur die target_minutes (work_days ist read-only aus globaler Tabelle)
			for (const entry of targetHours) {
				// Berechne nur automatisch wenn employmentPercentage === 100 (Feld ist disabled)
				// Ansonsten: nutze den vom Benutzer eingegebenen Wert
				let targetMinutes = entry.target_minutes;
				if (employmentPercentage === 100) {
					// Bei 100% Auslastung automatisch berechnen (Feld ist deaktiviert)
					targetMinutes = Math.round((entry.work_days || 0) * 468 * (employmentPercentage / 100));
					entry.target_minutes = targetMinutes;
				}

				const payload = {
					user_id: user.id,
					year: currentYear,
					month: entry.month,
					// @ts-ignore
					target_minutes: targetMinutes
				};
				
				
				const response = await fetch(`${base}/api/target-hours`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				
				const result = await response.json();
				
				if (!result.success) {
					throw new Error(result.message);
				}
			}
			
			showToast('Sollarbeitszeit gespeichert');
			await loadTargetHours();
		} catch (e) {
			console.error('Fehler beim Speichern:', e);
			showToast('Fehler beim Speichern');
		}
	}
	
	// @ts-ignore
	function calculateTargetHours(workDays, targetMinutes = null) {
		// Nutze gespeicherte target_minutes falls verfügbar, sonst berechne mit employmentPercentage
		let minutes;
		if (targetMinutes !== null && targetMinutes !== undefined) {
			minutes = targetMinutes;
		} else {
			// Fallback: 7:48h = 468 Minuten pro Tag × Beschäftigungsumfang
			minutes = Math.round(workDays * 468 * (employmentPercentage / 100));
		}
		// Dezimaldarstellung: Minuten in Dezimalstunden umrechnen
		const decimalHours = (minutes / 60).toFixed(2);
		return `${decimalHours}h`;
	}
	
	// @ts-ignore
	function updateTargetMinutes(entry, decimalHours) {
		// Konvertiere Dezimalstunden in Minuten
		const hours = parseFloat(decimalHours || 0);
		entry.target_minutes = Math.round(hours * 60);
	}
	
	// @ts-ignore
	function getDecimalHoursFromMinutes(minutes) {
		// Konvertiere Minuten in Dezimalstunden
		return ((minutes || 0) / 60).toFixed(2);
	}
	
	// @ts-ignore
	function updateWorkDays(entry, newWorkDays) {
		entry.work_days = parseInt(newWorkDays) || 0;
		// Aktualisiere target_minutes automatisch basierend auf employment_percentage
		entry.target_minutes = Math.round(entry.work_days * 468 * (employmentPercentage / 100));
	}
	
	// @ts-ignore
	function showToast(message) {
		toast = message;
		setTimeout(() => { toast = ''; }, 3000);
	}
</script>

{#if !user}
	<div class="text-center py-5">
		<div class="spinner-border text-primary" role="status"></div>
		<p class="mt-3">Laden...</p>
	</div>
{:else}
	<div class="row">
		<div class="col-12">
			<h1><i class="bi bi-person-circle"></i> Mein Profil</h1>
			<p class="text-muted">Eingeloggt als: <strong>{user.name}</strong></p>
			
			<ul class="nav nav-tabs mb-4">
				<li class="nav-item">
					<button 
						class="nav-link" 
						class:active={activeTab === 'personal'}
						onclick={() => activeTab = 'personal'}
					>
						<i class="bi bi-person"></i> Persönliche Daten
					</button>
				</li>
				<li class="nav-item">
					<button 
						class="nav-link" 
						class:active={activeTab === 'worktimes'}
						onclick={() => activeTab = 'worktimes'}
					>
						<i class="bi bi-clock"></i> Rahmendienstplan
					</button>
				</li>
				<li class="nav-item">
					<button 
						class="nav-link" 
						class:active={activeTab === 'target'}
						onclick={() => activeTab = 'target'}
					>
						<i class="bi bi-calendar2-check"></i> Sollarbeitszeit
					</button>
				</li>
			</ul>
			
			{#if activeTab === 'personal'}
			<div class="card">
				<div class="card-header">
					<h5 class="mb-0"><i class="bi bi-envelope"></i> E-Mail & Passwort</h5>
				</div>
				<div class="card-body">
					<form onsubmit={(e) => { e.preventDefault(); savePersonalData(); }}>
						<div class="mb-3">
							<label for="email" class="form-label">E-Mail-Adresse</label>
							<input 
								id="email"
								type="email" 
								class="form-control" 
								bind:value={email} 
								required
							>
						</div>
					
					<div class="mb-3">
						<label for="employment-percentage" class="form-label">Beschäftigungsumfang</label>
						<div class="input-group">
							<input 
								id="employment-percentage"
								type="number" 
								class="form-control" 
								bind:value={employmentPercentage}
								min="1"
								max="100"
								required
							>
							<span class="input-group-text">%</span>
						</div>
						<small class="form-text text-muted">Vollzeit = 100%, Teilzeit z.B. 50%</small>
					</div>
					
					<hr class="my-4">
					
					<h6 class="mb-3">Passwort ändern (optional)</h6>
					
					<div class="mb-3">
						<label for="new-password" class="form-label">Neues Passwort</label>
						<input 
							id="new-password"
							type="password" 
							class="form-control" 
							bind:value={newPassword}
							placeholder="Leer lassen, um nicht zu ändern"
						>
						<small class="form-text text-muted">Mindestens 6 Zeichen</small>
					</div>
						
						<div class="mb-3">
							<label for="confirm-password" class="form-label">Passwort bestätigen</label>
							<input 
								id="confirm-password"
								type="password" 
								class="form-control" 
								bind:value={confirmPassword}
								placeholder="Passwort wiederholen"
							>
						</div>
						
						<button type="submit" class="btn btn-primary">
							<i class="bi bi-check-circle"></i> Speichern
						</button>
					</form>
				</div>
			</div>
		{/if}
		
		{#if activeTab === 'worktimes'}
			<div class="card">
				<div class="card-header">
					<h5 class="mb-0"><i class="bi bi-calendar-week"></i> Rahmendienstplan pro Wochentag</h5>
				</div>
				<div class="card-body">
					<div class="alert alert-info mb-4">
						<i class="bi bi-info-circle"></i> 
						<strong>Hinweis:</strong> Der Rahmendienstplan wird von der Leitung verwaltet und kann hier nur eingesehen werden.
					</div>
					
					<div class="table-responsive" style="max-width: 700px; margin: 0 auto;">
						<table class="table table-bordered table-sm">
							<thead class="table-light">
								<tr>
									<th>Wochentag</th>
									<th>Von</th>
									<th>Bis</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td><strong>Montag</strong></td>
									<td>{mondayIsFree ? '-' : `${String(mondayStartHour).padStart(2, '0')}:${String(mondayStartMinute).padStart(2, '0')}`}</td>
									<td>{mondayIsFree ? '-' : `${String(mondayEndHour).padStart(2, '0')}:${String(mondayEndMinute).padStart(2, '0')}`}</td>
									<td>{@html mondayIsFree ? '<span class="badge bg-secondary">Frei</span>' : '<span class="badge bg-success">Arbeitstag</span>'}</td>
								</tr>
								<tr>
									<td><strong>Dienstag</strong></td>
									<td>{tuesdayIsFree ? '-' : `${String(tuesdayStartHour).padStart(2, '0')}:${String(tuesdayStartMinute).padStart(2, '0')}`}</td>
									<td>{tuesdayIsFree ? '-' : `${String(tuesdayEndHour).padStart(2, '0')}:${String(tuesdayEndMinute).padStart(2, '0')}`}</td>
									<td>{@html tuesdayIsFree ? '<span class="badge bg-secondary">Frei</span>' : '<span class="badge bg-success">Arbeitstag</span>'}</td>
								</tr>
								<tr>
									<td><strong>Mittwoch</strong></td>
									<td>{wednesdayIsFree ? '-' : `${String(wednesdayStartHour).padStart(2, '0')}:${String(wednesdayStartMinute).padStart(2, '0')}`}</td>
									<td>{wednesdayIsFree ? '-' : `${String(wednesdayEndHour).padStart(2, '0')}:${String(wednesdayEndMinute).padStart(2, '0')}`}</td>
									<td>{@html wednesdayIsFree ? '<span class="badge bg-secondary">Frei</span>' : '<span class="badge bg-success">Arbeitstag</span>'}</td>
								</tr>
								<tr>
									<td><strong>Donnerstag</strong></td>
									<td>{thursdayIsFree ? '-' : `${String(thursdayStartHour).padStart(2, '0')}:${String(thursdayStartMinute).padStart(2, '0')}`}</td>
									<td>{thursdayIsFree ? '-' : `${String(thursdayEndHour).padStart(2, '0')}:${String(thursdayEndMinute).padStart(2, '0')}`}</td>
									<td>{@html thursdayIsFree ? '<span class="badge bg-secondary">Frei</span>' : '<span class="badge bg-success">Arbeitstag</span>'}</td>
								</tr>
								<tr>
									<td><strong>Freitag</strong></td>
									<td>{fridayIsFree ? '-' : `${String(fridayStartHour).padStart(2, '0')}:${String(fridayStartMinute).padStart(2, '0')}`}</td>
									<td>{fridayIsFree ? '-' : `${String(fridayEndHour).padStart(2, '0')}:${String(fridayEndMinute).padStart(2, '0')}`}</td>
									<td>{@html fridayIsFree ? '<span class="badge bg-secondary">Frei</span>' : '<span class="badge bg-success">Arbeitstag</span>'}</td>
								</tr>
								<tr>
									<td><strong>Samstag</strong></td>
									<td>{saturdayIsFree ? '-' : `${String(saturdayStartHour).padStart(2, '0')}:${String(saturdayStartMinute).padStart(2, '0')}`}</td>
									<td>{saturdayIsFree ? '-' : `${String(saturdayEndHour).padStart(2, '0')}:${String(saturdayEndMinute).padStart(2, '0')}`}</td>
									<td>{@html saturdayIsFree ? '<span class="badge bg-secondary">Frei</span>' : '<span class="badge bg-success">Arbeitstag</span>'}</td>
								</tr>
								<tr>
									<td><strong>Sonntag</strong></td>
									<td>{sundayIsFree ? '-' : `${String(sundayStartHour).padStart(2, '0')}:${String(sundayStartMinute).padStart(2, '0')}`}</td>
									<td>{sundayIsFree ? '-' : `${String(sundayEndHour).padStart(2, '0')}:${String(sundayEndMinute).padStart(2, '0')}`}</td>
									<td>{@html sundayIsFree ? '<span class="badge bg-secondary">Frei</span>' : '<span class="badge bg-success">Arbeitstag</span>'}</td>
								</tr>
							</tbody>
						</table>
					</div>
					
					<div class="mt-3">
						<strong>Standard-Pausenzeit:</strong> {defaultBreak} Minuten
					</div>
				</div>
			</div>
		{/if}
		
		
		{#if activeTab === 'target'}
			<div class="card">
				<div class="card-header d-flex justify-content-between align-items-center">
					<h5 class="mb-0"><i class="bi bi-calendar2-check"></i> Sollarbeitszeit {currentYear}</h5>
					<div>
						<button class="btn btn-sm btn-outline-secondary me-2" onclick={() => { currentYear--; loadTargetHours(); }}>
							<i class="bi bi-chevron-left"></i> {currentYear - 1}
						</button>
						<button class="btn btn-sm btn-outline-secondary" onclick={() => { currentYear++; loadTargetHours(); }}>
							{currentYear + 1} <i class="bi bi-chevron-right"></i>
						</button>
					</div>
				</div>
				<div class="card-body">
					<form onsubmit={(e) => { e.preventDefault(); saveTargetHours(); }}>
						
						<div class="table-responsive">
							<table class="table table-hover">
								<thead class="table-light">
									<tr>
										<th>Monat</th>
										<th>Arbeitstage</th>
										<th>Sollarbeitszeit</th>
									</tr>
								</thead>
								<tbody>
									{#each targetHours as entry, index}
										<tr>
											<td><strong>{monthNames[entry.month - 1]}</strong></td>
											<td>
												<span class="text-muted">
													{entry.work_days} Tage
												</span>
											</td>
											<td>
												<div class="d-flex gap-2 align-items-center">
													<input 
														type="number" 
														class="form-control" 
														style="width: 100px;"
														bind:value={decimalHours[index]}
														onchange={() => updateTargetMinutes(entry, decimalHours[index])}
														disabled={employmentPercentage === 100}
														min="0"
														step="any"
														lang="de"
													>
													<span class="text-muted">h</span>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
								<tfoot class="table-light">
									<tr>
										<td><strong>Gesamt</strong></td>
										<td><strong>{targetHours.reduce((sum, e) => sum + (e.work_days || 0), 0)} Tage</strong></td>
										<td><strong class="text-primary">{calculateTargetHours(0, targetHours.reduce((sum, e) => sum + (e.target_minutes || 0), 0))}</strong></td>
									</tr>
								</tfoot>
							</table>
						</div>
						
						<button type="submit" class="btn btn-primary mt-3">
							<i class="bi bi-check-circle"></i> Speichern
						</button>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
{/if}

{#if toast}
	<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 9999">
		<div class="toast show" role="alert">
			<div class="toast-header bg-success text-white">
				<i class="bi bi-check-circle-fill me-2"></i>
				<strong class="me-auto">Erfolg</strong>
				<button type="button" class="btn-close btn-close-white" aria-label="Nachricht schließen" onclick={() => toast = ''}></button>
			</div>
			<div class="toast-body">
				{toast}
			</div>
		</div>
	</div>
{/if}
