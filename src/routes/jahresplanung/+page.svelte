<script>
	import { base } from '$app/paths';
	
	let { data } = $props();
	let user = $derived(data.user);
	
	let availableYears = $state([]);
	let activeYear = $state(new Date().getFullYear());
	let workDays = $state(Array(12).fill(0).map((_, i) => ({ month: i + 1, work_days: 0 })));
	let holidays = $state([]);
	let loading = $state(false);
	let loadingHolidays = $state(false);
	let toast = $state('');
	let showNewYearModal = $state(false);
	let newYear = $state(new Date().getFullYear() + 1);
	let newHolidayDate = $state('');
	let newHolidayName = $state('');
	
	const monthNames = [
		'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
	];
	
	$effect(() => {
		loadAvailableYears();
	});
	
	$effect(() => {
		if (activeYear) {
			loadHolidays();
		}
	});
	
	async function loadAvailableYears() {
		try {
			// Lade alle verfügbaren Jahre aus der Datenbank
			const response = await fetch(`${base}/api/work-days-calendar?year=2020`); // Hack: lade erstmal 2020
			const result = await response.json();
			
			// Extrahiere unique Jahre
			const years = new Set();
			const currentYear = new Date().getFullYear();
			years.add(currentYear);
			
			// Lade tatsächliche Jahre
			for (let year = currentYear - 2; year <= currentYear + 2; year++) {
				const res = await fetch(`${base}/api/work-days-calendar?year=${year}`);
				const data = await res.json();
				if (data.success && data.data.length > 0) {
					years.add(year);
				}
			}
			
			availableYears = Array.from(years).sort((a, b) => a - b);
			loadWorkDays();
		} catch (e) {
			console.error('Fehler:', e);
			availableYears = [new Date().getFullYear()];
			loadWorkDays();
		}
	}
	
	async function loadWorkDays() {
		loading = true;
		try {
			const response = await fetch(`${base}/api/work-days-calendar?year=${activeYear}`);
			const result = await response.json();
			
			if (result.success) {
				workDays = Array(12).fill(0).map((_, i) => {
					const month = i + 1;
					const existing = result.data.find(d => d.month === month);
					return {
						month: month,
						work_days: existing ? existing.work_days : 0
					};
				});
			}
		} catch (e) {
			showToast('Fehler beim Laden');
		} finally {
			loading = false;
		}
	}
	
	function changeYear(year) {
		activeYear = year;
		loadWorkDays();
		loadHolidays();
	}
	
	async function loadHolidays() {
		loadingHolidays = true;
		try {
			const response = await fetch(`${base}/api/holidays?year=${activeYear}`);
			const result = await response.json();
			
			if (result.success) {
				holidays = result.data;
			}
		} catch (e) {
			console.error('Fehler beim Laden der Feiertage:', e);
		} finally {
			loadingHolidays = false;
		}
	}
	
	async function addHoliday() {
		if (!newHolidayDate || !newHolidayName) {
			showToast('Datum und Name erforderlich');
			return;
		}
		
		try {
			const response = await fetch(`${base}/api/holidays`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					year: activeYear,
					date: newHolidayDate,
					name: newHolidayName
				})
			});
			
			const result = await response.json();
			if (result.success) {
				showToast('Feiertag hinzugefügt');
				newHolidayDate = '';
				newHolidayName = '';
				loadHolidays();
			} else {
				showToast(result.message);
			}
		} catch (e) {
			showToast('Fehler beim Speichern');
		}
	}
	
	async function deleteHoliday(id) {
		if (!confirm('Feiertag wirklich löschen?')) return;
		
		try {
			const response = await fetch(`${base}/api/holidays?id=${id}`, {
				method: 'DELETE'
			});
			
			const result = await response.json();
			if (result.success) {
				showToast('Feiertag gelöscht');
				loadHolidays();
			} else {
				showToast(result.message);
			}
		} catch (e) {
			showToast('Fehler beim Löschen');
		}
	}
	
	async function saveWorkDays() {
		try {
			for (const entry of workDays) {
				const response = await fetch(`${base}/api/work-days-calendar`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						year: activeYear,
						month: entry.month,
						work_days: entry.work_days || 0
					})
				});
				
				const result = await response.json();
				if (!result.success) {
					throw new Error(result.message);
				}
			}
			
			showToast('Arbeitstage gespeichert');
		} catch (e) {
			showToast('Fehler beim Speichern');
		}
	}
	
	function openNewYearModal() {
		newYear = Math.max(...availableYears) + 1;
		showNewYearModal = true;
	}
	
	async function createNewYear() {
		if (!availableYears.includes(newYear)) {
			availableYears = [...availableYears, newYear].sort((a, b) => a - b);
			activeYear = newYear;
			workDays = Array(12).fill(0).map((_, i) => ({ month: i + 1, work_days: 0 }));
			showNewYearModal = false;
			showToast(`Jahr ${newYear} erstellt`);
		}
	}
	
	function showToast(message) {
		toast = message;
		setTimeout(() => { toast = ''; }, 3000);
	}
</script>

<div class="d-flex justify-content-between align-items-center mb-4">
	<h1><i class="bi bi-calendar3"></i> Jahresplanung</h1>
	<button class="btn btn-success" onclick={openNewYearModal}>
		<i class="bi bi-plus-circle"></i> Neues Jahr
	</button>
</div>

<div class="card">
	<div class="card-header bg-primary text-white">
		<strong>Arbeitstage pro Monat verwalten</strong>
	</div>
	<div class="card-body">
		<ul class="nav nav-tabs mb-4">
			{#each availableYears as year}
				<li class="nav-item">
					<button 
						class="nav-link" 
						class:active={activeYear === year}
						onclick={() => changeYear(year)}
					>
						{year}
					</button>
				</li>
			{/each}
		</ul>
		
		{#if loading}
			<div class="text-center py-3">
				<div class="spinner-border text-primary" role="status"></div>
			</div>
		{:else}
			<div class="row">
				<div class="col-md-6">
					<form onsubmit={(e) => { e.preventDefault(); saveWorkDays(); }}>
						<table class="table table-hover table-sm">
							<thead class="table-light">
								<tr>
									<th>Monat</th>
									<th style="width: 100px;">Arbeitstage</th>
								</tr>
							</thead>
							<tbody>
								{#each workDays as entry}
									<tr>
										<td><strong>{monthNames[entry.month - 1]}</strong></td>
										<td>
											<input 
												type="number" 
												class="form-control form-control-sm" 
												bind:value={entry.work_days}
												min="0"
												max="31"
												style="width: 80px;"
											>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
						
						<div class="text-center mt-3">
							<button type="submit" class="btn btn-primary">
								<i class="bi bi-check-circle"></i> Speichern
							</button>
						</div>
					</form>
				</div>
				
				<div class="col-md-6">
					<h5 class="mb-3">Feiertage {activeYear}</h5>
					
					<form onsubmit={(e) => { e.preventDefault(); addHoliday(); }} class="mb-4">
						<div class="row g-2">
							<div class="col-md-5">
								<input 
									type="date" 
									class="form-control form-control-sm" 
									bind:value={newHolidayDate}
									placeholder="Datum"
									required
								>
							</div>
							<div class="col-md-5">
								<input 
									type="text" 
									class="form-control form-control-sm" 
									bind:value={newHolidayName}
									placeholder="Name des Feiertags"
									required
								>
							</div>
							<div class="col-md-2">
								<button type="submit" class="btn btn-success btn-sm w-100">
									<i class="bi bi-plus"></i>
								</button>
							</div>
						</div>
					</form>
					
					{#if loadingHolidays}
						<div class="text-center py-3">
							<div class="spinner-border spinner-border-sm text-primary" role="status"></div>
						</div>
					{:else}
						<table class="table table-hover table-sm">
							<thead class="table-light">
								<tr>
									<th>Datum</th>
									<th>Name</th>
									<th style="width: 50px;"></th>
								</tr>
							</thead>
							<tbody>
								{#if holidays.length === 0}
									<tr>
										<td colspan="3" class="text-center text-muted">Keine Feiertage für {activeYear}</td>
									</tr>
								{:else}
									{#each holidays as holiday}
										<tr>
											<td>{new Date(holiday.date).toLocaleDateString('de-DE')}</td>
											<td>{holiday.name}</td>
											<td>
												<button 
													class="btn btn-danger btn-sm" 
													onclick={() => deleteHoliday(holiday.id)}
													title="Löschen"
												>
													<i class="bi bi-trash"></i>
												</button>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

{#if showNewYearModal}
	<div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">Neues Jahr erstellen</h5>
					<button type="button" class="btn-close" onclick={() => showNewYearModal = false}></button>
				</div>
				<div class="modal-body">
					<div class="mb-3">
						<label class="form-label">Jahr</label>
						<input 
							type="number" 
							class="form-control" 
							bind:value={newYear}
							min="2020"
							max="2100"
						>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => showNewYearModal = false}>Abbrechen</button>
					<button type="button" class="btn btn-primary" onclick={createNewYear}>Erstellen</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if toast}
	<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 9999">
		<div class="toast show" role="alert">
			<div class="toast-header bg-success text-white">
				<i class="bi bi-check-circle-fill me-2"></i>
				<strong class="me-auto">Erfolg</strong>
				<button type="button" class="btn-close btn-close-white" onclick={() => toast = ''}></button>
			</div>
			<div class="toast-body">
				{toast}
			</div>
		</div>
	</div>
{/if}
