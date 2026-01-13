<script>
	import { base } from '$app/paths';
	
	let users = $state([]);
	let loading = $state(false);
	let showForm = $state(false);
	let editingUser = $state(null);
	let toast = $state('');
	
	// Formularfelder
	let formName = $state('');
	let formEmail = $state('');
	let formPassword = $state('');
	let formIsAdmin = $state(false);
	let formIsLeitung = $state(false);
	
	$effect(() => {
		loadData();
	});
	
	async function loadData() {
		loading = true;
		try {
			const response = await fetch(`${base}/api/users`);
			const result = await response.json();
			
			if (result.success) users = result.data;
		} catch (e) {
			showToast('Fehler beim Laden');
		} finally {
			loading = false;
		}
	}
	
	function openNewForm() {
		editingUser = null;
		formName = '';
		formEmail = '';
		formPassword = '';
		formIsAdmin = false;
		formIsLeitung = false;
		showForm = true;
	}
	
	function openEditForm(user) {
		editingUser = user;
		formName = user.name;
		formEmail = user.email;
		formPassword = '';
		formIsAdmin = user.is_admin === 1;
		formIsLeitung = user.is_leitung === 1;
		showForm = true;
	}
	
	function closeForm() {
		showForm = false;
		editingUser = null;
	}
	
	async function saveUser() {
		if (!formName || !formEmail || (!editingUser && !formPassword)) {
			showToast('Bitte alle Felder ausfüllen');
			return;
		}
		
		try {
			const payload = {
				name: formName,
				email: formEmail,
				password: formPassword,
				is_admin: formIsAdmin,
				is_leitung: formIsLeitung
			};
			
			let response;
			if (editingUser) {
				response = await fetch(`${base}/api/users/${editingUser.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else {
				response = await fetch(`${base}/api/users`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}
			
			const result = await response.json();
			if (result.success) {
				showToast(result.message);
				closeForm();
				loadData();
			} else {
				showToast(result.message);
			}
		} catch (e) {
			showToast('Fehler beim Speichern');
		}
	}
	
	async function deleteUser(id) {
		if (!confirm('Benutzer wirklich löschen? Alle zugehörigen Arbeitszeiten werden ebenfalls gelöscht.')) return;
		
		try {
			const response = await fetch(`${base}/api/users/${id}`, {
				method: 'DELETE'
			});
			const result = await response.json();
			if (result.success) {
				showToast(result.message);
				loadData();
			}
		} catch (e) {
			showToast('Fehler beim Löschen');
		}
	}
	
	function showToast(message) {
		toast = message;
		setTimeout(() => { toast = ''; }, 3000);
	}
	
	function getRoleBadges(user) {
		const badges = [];
		if (user.is_admin) badges.push({ text: 'Admin', class: 'bg-danger' });
		if (user.is_leitung) badges.push({ text: 'Leitung', class: 'bg-warning text-dark' });
		if (!user.is_admin && !user.is_leitung) badges.push({ text: 'Mitarbeiter:in', class: 'bg-secondary' });
		return badges;
	}
</script>

<div class="row">
	<div class="col-12">
		<div class="d-flex justify-content-between align-items-center mb-4">
			<h1><i class="bi bi-gear"></i> Administration</h1>
			<button class="btn btn-primary" onclick={openNewForm}>
				<i class="bi bi-person-plus"></i> Neuer Benutzer
			</button>
		</div>
		
		<div class="card">
			<div class="card-header bg-primary text-white">
				<strong>Benutzerverwaltung</strong>
			</div>
			<div class="card-body">
				{#if loading}
					<div class="text-center py-3">
						<div class="spinner-border text-primary" role="status"></div>
					</div>
				{:else}
					<div class="table-responsive">
						<table class="table table-hover">
							<thead>
								<tr>
									<th>ID</th>
									<th>Name</th>
									<th>E-Mail</th>
									<th>Berechtigungen</th>
									<th>Erstellt am</th>
									<th>Aktionen</th>
								</tr>
							</thead>
							<tbody>
								{#each users as user}
									<tr>
										<td>{user.id}</td>
										<td>{user.name}</td>
										<td>{user.email}</td>
										<td>
											{#each getRoleBadges(user) as badge}
												<span class="badge {badge.class} me-1">{badge.text}</span>
											{/each}
										</td>
										<td>{new Date(user.created_at).toLocaleDateString('de-DE')}</td>
										<td>
											<button class="btn btn-sm btn-outline-primary me-1" onclick={() => openEditForm(user)}>
												<i class="bi bi-pencil"></i> Bearbeiten
											</button>
											<button class="btn btn-sm btn-outline-danger" onclick={() => deleteUser(user.id)}>
												<i class="bi bi-trash"></i> Löschen
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
		
		<div class="card mt-4">
			<div class="card-header bg-info text-white">
				<strong>Berechtigungen-Übersicht</strong>
			</div>
			<div class="card-body">
				<div class="row">
					<div class="col-md-4 mb-3">
						<div class="card">
							<div class="card-body">
								<h5 class="card-title">
									<i class="bi bi-person text-secondary"></i> Mitarbeiter:in
								</h5>
								<p class="card-text text-muted">
									<strong>Standard-Berechtigung</strong><br>
									Alle Benutzer sind Mitarbeiter:innen und können:
								</p>
								<ul class="small">
									<li>Eigene Arbeitszeiten planen und einsehen</li>
									<li>Urlaub und Freiwünsche eintragen</li>
									<li>Monatsansicht der eigenen Zeiten</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="col-md-4 mb-3">
						<div class="card">
							<div class="card-body">
								<h5 class="card-title">
									<i class="bi bi-person-badge text-warning"></i> Leitung
								</h5>
								<p class="card-text text-muted">
									<strong>Zusätzliche Berechtigung</strong><br>
									Kann zusätzlich:
								</p>
								<ul class="small">
									<li>Alle Mitarbeiter:innen und deren Zeiten einsehen</li>
									<li>Team-Übersicht nutzen</li>
									<li>Anmerkungen per E-Mail senden</li>
									<li>Eigenes Arbeitszeitkonto führen</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="col-md-4 mb-3">
						<div class="card">
							<div class="card-body">
								<h5 class="card-title">
									<i class="bi bi-shield-lock text-danger"></i> Admin
								</h5>
								<p class="card-text text-muted">
									<strong>Zusätzliche Berechtigung</strong><br>
									Kann zusätzlich:
								</p>
								<ul class="small">
									<li>Benutzer anlegen und verwalten</li>
									<li>Berechtigungen zuweisen</li>
									<li>Admin-Panel nutzen</li>
									<li>Eigenes Arbeitszeitkonto führen</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if showForm}
	<div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">
						{editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
					</h5>
					<button type="button" class="btn-close" onclick={closeForm}></button>
				</div>
				<div class="modal-body">
					<div class="mb-3">
						<label class="form-label">Name</label>
						<input type="text" class="form-control" bind:value={formName} required>
					</div>
					
					<div class="mb-3">
						<label class="form-label">E-Mail</label>
						<input type="email" class="form-control" bind:value={formEmail} required>
					</div>
					
					<div class="mb-3">
						<label class="form-label">
							Passwort {editingUser ? '(leer lassen für keine Änderung)' : ''}
						</label>
						<input type="password" class="form-control" bind:value={formPassword}>
					</div>
					
					<div class="mb-3">
						<label class="form-label d-block">Zusätzliche Berechtigungen</label>
						<div class="form-check">
							<input 
								type="checkbox" 
								class="form-check-input" 
								id="checkLeitung"
								bind:checked={formIsLeitung}
							>
							<label class="form-check-label" for="checkLeitung">
								<i class="bi bi-person-badge text-warning"></i> Leitung
								<small class="text-muted d-block">Kann alle Mitarbeiter:innen einsehen</small>
							</label>
						</div>
						<div class="form-check mt-2">
							<input 
								type="checkbox" 
								class="form-check-input" 
								id="checkAdmin"
								bind:checked={formIsAdmin}
							>
							<label class="form-check-label" for="checkAdmin">
								<i class="bi bi-shield-lock text-danger"></i> Admin
								<small class="text-muted d-block">Kann Benutzer verwalten</small>
							</label>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={closeForm}>Abbrechen</button>
					<button type="button" class="btn btn-primary" onclick={saveUser}>Speichern</button>
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
