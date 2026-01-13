<script>
	import { base } from '$app/paths';
	
	let { data } = $props();
	let user = $derived(data.user);
	
	// Persönliche Daten
	let email = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	
	// Standard-Arbeitszeiten - separate Felder für jeden Tag
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
				email: email
			};
			
			if (newPassword) {
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
				showToast('Standard-Arbeitszeiten gespeichert');
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
					const existing = loadedData.find(d => d.month === month);
					return {
						month: month,
						work_days: existing ? existing.work_days : 0
					};
				});
			}
		} catch (e) {
			console.error('Fehler beim Laden der Sollarbeitszeit:', e);
		}
	}
	
	async function saveTargetHours() {
		try {
			// Speichere alle Monate
			for (const entry of targetHours) {
				const payload = {
					user_id: user.id,
					year: currentYear,
					month: entry.month,
					work_days: entry.work_days || 0
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
	
	function calculateTargetHours(workDays) {
		// 7:48h = 7.8 Stunden = 468 Minuten pro Tag
		const minutes = workDays * 468;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}:${String(mins).padStart(2, '0')}h`;
	}
	
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
						<i class="bi bi-clock"></i> Standard-Arbeitszeiten
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
							<label class="form-label">E-Mail-Adresse</label>
							<input 
								type="email" 
								class="form-control" 
								bind:value={email} 
								required
							>
						</div>
						
						<hr class="my-4">
						
						<h6 class="mb-3">Passwort ändern (optional)</h6>
						
						<div class="mb-3">
							<label class="form-label">Neues Passwort</label>
							<input 
								type="password" 
								class="form-control" 
								bind:value={newPassword}
								placeholder="Leer lassen, um nicht zu ändern"
							>
							<small class="form-text text-muted">Mindestens 6 Zeichen</small>
						</div>
						
						<div class="mb-3">
							<label class="form-label">Passwort bestätigen</label>
							<input 
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
					<h5 class="mb-0"><i class="bi bi-calendar-week"></i> Standard-Arbeitszeiten pro Wochentag</h5>
				</div>
				<div class="card-body">
					<p class="text-muted mb-4">
						Geben Sie Ihre üblichen Arbeitszeiten ein. Für freie Tage lassen Sie alle Felder leer.
					</p>
					
					<form onsubmit={(e) => { e.preventDefault(); saveWorkTimes(); }}>
						<!-- Montag -->
						<div class="mb-4">
							<label class="form-label fw-bold">
								<i class="bi bi-circle-fill text-primary"></i> Montag
							</label>
							<div class="row g-2 align-items-end">
								<div class="col-auto">
									<label class="form-label small">Beginn Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={mondayIsFree ? "-" : mondayStartHour}
										oninput={(e) => { if (!mondayIsFree) mondayStartHour = parseInt(e.target.value) || 0; }}
										disabled={mondayIsFree}
										placeholder="9"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Beginn Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={mondayIsFree ? "-" : mondayStartMinute}
										oninput={(e) => { if (!mondayIsFree) mondayStartMinute = parseInt(e.target.value) || 0; }}
										disabled={mondayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={mondayIsFree ? "-" : mondayEndHour}
										oninput={(e) => { if (!mondayIsFree) mondayEndHour = parseInt(e.target.value) || 0; }}
										disabled={mondayIsFree}
										placeholder="17"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={mondayIsFree ? "-" : mondayEndMinute}
										oninput={(e) => { if (!mondayIsFree) mondayEndMinute = parseInt(e.target.value) || 0; }}
										disabled={mondayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<div class="form-check">
										<input 
											class="form-check-input" 
											type="checkbox" 
											bind:checked={mondayIsFree}
											id="mondayFree"
										>
										<label class="form-check-label small" for="mondayFree">
											Freier Tag
										</label>
									</div>
								</div>
							</div>
						</div>
						
						<!-- Dienstag -->
						<div class="mb-4">
							<label class="form-label fw-bold">
								<i class="bi bi-circle-fill text-primary"></i> Dienstag
							</label>
							<div class="row g-2 align-items-end">
								<div class="col-auto">
									<label class="form-label small">Beginn Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={tuesdayIsFree ? "-" : tuesdayStartHour}
										oninput={(e) => { if (!tuesdayIsFree) tuesdayStartHour = parseInt(e.target.value) || 0; }}
										disabled={tuesdayIsFree}
										placeholder="9"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Beginn Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={tuesdayIsFree ? "-" : tuesdayStartMinute}
										oninput={(e) => { if (!tuesdayIsFree) tuesdayStartMinute = parseInt(e.target.value) || 0; }}
										disabled={tuesdayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={tuesdayIsFree ? "-" : tuesdayEndHour}
										oninput={(e) => { if (!tuesdayIsFree) tuesdayEndHour = parseInt(e.target.value) || 0; }}
										disabled={tuesdayIsFree}
										placeholder="17"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={tuesdayIsFree ? "-" : tuesdayEndMinute}
										oninput={(e) => { if (!tuesdayIsFree) tuesdayEndMinute = parseInt(e.target.value) || 0; }}
										disabled={tuesdayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<div class="form-check">
										<input 
											class="form-check-input" 
											type="checkbox" 
											bind:checked={tuesdayIsFree}
											id="tuesdayFree"
										>
										<label class="form-check-label small" for="tuesdayFree">
											Freier Tag
										</label>
									</div>
								</div>
							</div>
						</div>
						
						<!-- Mittwoch -->
						<div class="mb-4">
							<label class="form-label fw-bold">
								<i class="bi bi-circle-fill text-primary"></i> Mittwoch
							</label>
							<div class="row g-2 align-items-end">
								<div class="col-auto">
									<label class="form-label small">Beginn Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={wednesdayIsFree ? "-" : wednesdayStartHour}
										oninput={(e) => { if (!wednesdayIsFree) wednesdayStartHour = parseInt(e.target.value) || 0; }}
										disabled={wednesdayIsFree}
										placeholder="9"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Beginn Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={wednesdayIsFree ? "-" : wednesdayStartMinute}
										oninput={(e) => { if (!wednesdayIsFree) wednesdayStartMinute = parseInt(e.target.value) || 0; }}
										disabled={wednesdayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={wednesdayIsFree ? "-" : wednesdayEndHour}
										oninput={(e) => { if (!wednesdayIsFree) wednesdayEndHour = parseInt(e.target.value) || 0; }}
										disabled={wednesdayIsFree}
										placeholder="17"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={wednesdayIsFree ? "-" : wednesdayEndMinute}
										oninput={(e) => { if (!wednesdayIsFree) wednesdayEndMinute = parseInt(e.target.value) || 0; }}
										disabled={wednesdayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<div class="form-check">
										<input 
											class="form-check-input" 
											type="checkbox" 
											bind:checked={wednesdayIsFree}
											id="wednesdayFree"
										>
										<label class="form-check-label small" for="wednesdayFree">
											Freier Tag
										</label>
									</div>
								</div>
							</div>
						</div>
						
						<!-- Donnerstag -->
						<div class="mb-4">
							<label class="form-label fw-bold">
								<i class="bi bi-circle-fill text-primary"></i> Donnerstag
							</label>
							<div class="row g-2 align-items-end">
								<div class="col-auto">
									<label class="form-label small">Beginn Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={thursdayIsFree ? "-" : thursdayStartHour}
										oninput={(e) => { if (!thursdayIsFree) thursdayStartHour = parseInt(e.target.value) || 0; }}
										disabled={thursdayIsFree}
										placeholder="9"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Beginn Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={thursdayIsFree ? "-" : thursdayStartMinute}
										oninput={(e) => { if (!thursdayIsFree) thursdayStartMinute = parseInt(e.target.value) || 0; }}
										disabled={thursdayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={thursdayIsFree ? "-" : thursdayEndHour}
										oninput={(e) => { if (!thursdayIsFree) thursdayEndHour = parseInt(e.target.value) || 0; }}
										disabled={thursdayIsFree}
										placeholder="17"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={thursdayIsFree ? "-" : thursdayEndMinute}
										oninput={(e) => { if (!thursdayIsFree) thursdayEndMinute = parseInt(e.target.value) || 0; }}
										disabled={thursdayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<div class="form-check">
										<input 
											class="form-check-input" 
											type="checkbox" 
											bind:checked={thursdayIsFree}
											id="thursdayFree"
										>
										<label class="form-check-label small" for="thursdayFree">
											Freier Tag
										</label>
									</div>
								</div>
							</div>
						</div>
						
						<!-- Freitag -->
						<div class="mb-4">
							<label class="form-label fw-bold">
								<i class="bi bi-circle-fill text-primary"></i> Freitag
							</label>
							<div class="row g-2 align-items-end">
								<div class="col-auto">
									<label class="form-label small">Beginn Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={fridayIsFree ? "-" : fridayStartHour}
										oninput={(e) => { if (!fridayIsFree) fridayStartHour = parseInt(e.target.value) || 0; }}
										disabled={fridayIsFree}
										placeholder="9"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Beginn Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={fridayIsFree ? "-" : fridayStartMinute}
										oninput={(e) => { if (!fridayIsFree) fridayStartMinute = parseInt(e.target.value) || 0; }}
										disabled={fridayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={fridayIsFree ? "-" : fridayEndHour}
										oninput={(e) => { if (!fridayIsFree) fridayEndHour = parseInt(e.target.value) || 0; }}
										disabled={fridayIsFree}
										placeholder="17"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={fridayIsFree ? "-" : fridayEndMinute}
										oninput={(e) => { if (!fridayIsFree) fridayEndMinute = parseInt(e.target.value) || 0; }}
										disabled={fridayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<div class="form-check">
										<input 
											class="form-check-input" 
											type="checkbox" 
											bind:checked={fridayIsFree}
											id="fridayFree"
										>
										<label class="form-check-label small" for="fridayFree">
											Freier Tag
										</label>
									</div>
								</div>
							</div>
						</div>
						
						<!-- Samstag -->
						<div class="mb-4">
							<label class="form-label fw-bold">
								<i class="bi bi-circle-fill text-primary"></i> Samstag
							</label>
							<div class="row g-2 align-items-end">
								<div class="col-auto">
									<label class="form-label small">Beginn Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={saturdayIsFree ? "-" : saturdayStartHour}
										oninput={(e) => { if (!saturdayIsFree) saturdayStartHour = parseInt(e.target.value) || 0; }}
										disabled={saturdayIsFree}
										placeholder="9"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Beginn Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={saturdayIsFree ? "-" : saturdayStartMinute}
										oninput={(e) => { if (!saturdayIsFree) saturdayStartMinute = parseInt(e.target.value) || 0; }}
										disabled={saturdayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Stunde</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={saturdayIsFree ? "-" : saturdayEndHour}
										oninput={(e) => { if (!saturdayIsFree) saturdayEndHour = parseInt(e.target.value) || 0; }}
										disabled={saturdayIsFree}
										placeholder="17"
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Minute</label>
									<input 
										type="text" 
										class="form-control text-center" 
										style="width: 70px;"
										value={saturdayIsFree ? "-" : saturdayEndMinute}
										oninput={(e) => { if (!saturdayIsFree) saturdayEndMinute = parseInt(e.target.value) || 0; }}
										disabled={saturdayIsFree}
										placeholder="0"
									>
								</div>
								<div class="col-auto">
									<div class="form-check">
										<input 
											class="form-check-input" 
											type="checkbox" 
											bind:checked={saturdayIsFree}
											id="saturdayFree"
										>
										<label class="form-check-label small" for="saturdayFree">
											Freier Tag
										</label>
									</div>
								</div>
							</div>
						</div>						<!-- Sonntag -->
						<div class="mb-4">
							<label class="form-label fw-bold">
								<i class="bi bi-circle-fill text-secondary"></i> Sonntag
							</label>
							<div class="row g-2 align-items-end">
								<div class="col-auto">
									<label class="form-label small">Beginn Stunde</label>
									<input 
										type="number" 
										class="form-control" 
										style="width: 70px;"
										bind:value={sundayStartHour}
										disabled={sundayIsFree}
										min="0"
										max="23"
										placeholder={sundayIsFree ? "-" : "Frei"}
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Beginn Minute</label>
									<input 
										type="number" 
										class="form-control" 
										style="width: 70px;"
										bind:value={sundayStartMinute}
										disabled={sundayIsFree}
										min="0"
										max="59"
										step="5"
										placeholder={sundayIsFree ? "-" : "Frei"}
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Stunde</label>
									<input 
										type="number" 
										class="form-control" 
										style="width: 70px;"
										bind:value={sundayEndHour}
										disabled={sundayIsFree}
										min="0"
										max="23"
										placeholder={sundayIsFree ? "-" : "Frei"}
									>
								</div>
								<div class="col-auto">
									<label class="form-label small">Ende Minute</label>
									<input 
										type="number" 
										class="form-control" 
										style="width: 70px;"
										bind:value={sundayEndMinute}
										disabled={sundayIsFree}
										min="0"
										max="59"
										step="5"
										placeholder={sundayIsFree ? "-" : "Frei"}
									>
								</div>
								<div class="col-auto">
									<div class="form-check">
										<input 
											class="form-check-input" 
											type="checkbox" 
											bind:checked={sundayIsFree}
											id="sundayFree"
										>
										<label class="form-check-label small" for="sundayFree">
											Freier Tag
										</label>
									</div>
								</div>
							</div>
						</div>						<hr class="my-4">
						
						<div class="mb-3">
							<label class="form-label fw-bold">Standard-Pause (Minuten)</label>
							<input 
								type="number" 
								class="form-control" 
								style="width: 100px;"
								bind:value={defaultBreak}
								min="0"
								max="60"
								step="5"
							>
							<small class="form-text text-muted">Maximale Pausendauer: 60 Minuten</small>
						</div>
						
						<div class="alert alert-info">
							<i class="bi bi-info-circle"></i> 
							<strong>Hinweis:</strong> Diese Zeiten werden beim Erstellen neuer Einträge vorausgefüllt.
						</div>
						
						<button type="submit" class="btn btn-primary">
							<i class="bi bi-check-circle"></i> Speichern
						</button>
					</form>
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
						<div class="alert alert-info mb-4">
							<i class="bi bi-info-circle"></i> 
							<strong>Hinweis:</strong> Tragen Sie für jeden Monat die Anzahl der Arbeitstage ein. 
							Ein Arbeitstag entspricht 7:48h (100%).
						</div>
						
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
												<input 
													type="number" 
													class="form-control" 
													style="width: 100px;"
													bind:value={entry.work_days}
													min="0"
													max="31"
												>
											</td>
											<td>
												<span class="badge bg-primary">{calculateTargetHours(entry.work_days)}</span>
											</td>
										</tr>
									{/each}
								</tbody>
								<tfoot class="table-light">
									<tr>
										<td><strong>Gesamt</strong></td>
										<td><strong>{targetHours.reduce((sum, e) => sum + (e.work_days || 0), 0)} Tage</strong></td>
										<td><strong class="text-primary">{calculateTargetHours(targetHours.reduce((sum, e) => sum + (e.work_days || 0), 0))}</strong></td>
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
