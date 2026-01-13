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
	
	const months = [
		'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
	];
	
	$effect(() => {
		loadUsers();
	});
	
	async function loadUsers() {
		try {
			const response = await fetch(`${base}/api/users`);
			const result = await response.json();
			if (result.success) {
				// ALLE Benutzer laden (alle sind Mitarbeiter)
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
											<td>{entry.starttime || '-'}</td>
											<td>{entry.endtime || '-'}</td>
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
