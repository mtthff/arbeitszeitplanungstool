<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	
	let { data, children } = $props();
	
	let user = $derived(data.user);
	
	async function logout() {
		const response = await fetch(`${base}/api/auth/logout`, {
			method: 'POST'
		});
		
		if (response.ok) {
			window.location.href = `${base}/login`;
		}
	}
</script>

<svelte:head>
	<title>Arbeitszeitplanungstool</title>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
	<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</svelte:head>

{#if user && $page.url.pathname !== `${base}/login`}
	<nav class="navbar navbar-expand-lg navbar-dark bg-primary">
		<div class="container-fluid">
			<a class="navbar-brand" href="{base}/">
				<i class="bi bi-clock-history"></i> Arbeitszeitplanung
			</a>
			<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-label="Toggle navigation">
				<span class="navbar-toggler-icon"></span>
			</button>
			<div class="collapse navbar-collapse" id="navbarNav">
				<ul class="navbar-nav me-auto">
					<li class="nav-item">
						<a class="nav-link" href="{base}/">
							<i class="bi bi-calendar3"></i> Meine Zeiten
						</a>
					</li>
					<li class="nav-item">
						<a class="nav-link" href="{base}/profil">
							<i class="bi bi-person-circle"></i> Profil
						</a>
					</li>
					{#if user.is_leitung}
						<li class="nav-item">
							<a class="nav-link" href="{base}/team">
								<i class="bi bi-people"></i> Team-Übersicht
							</a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="{base}/arbeitskalender">
								<i class="bi bi-calendar3"></i> Arbeitskalender
							</a>
						</li>
					{/if}
					{#if user.is_admin}
						<li class="nav-item">
							<a class="nav-link" href="{base}/admin">
								<i class="bi bi-gear"></i> Administration
							</a>
						</li>
					{/if}
				</ul>
				<div class="d-flex align-items-center text-white">
					<span class="me-3">
						<i class="bi bi-person-circle"></i> {user.name}
						{#if user.is_admin}
							<span class="badge bg-danger">Admin</span>
						{/if}
						{#if user.is_leitung}
							<span class="badge bg-warning text-dark">Leitung</span>
						{/if}
						<span class="badge bg-light text-dark">Mitarbeiter:in</span>
					</span>
					<button class="btn btn-outline-light btn-sm" onclick={logout}>
						<i class="bi bi-box-arrow-right"></i> Abmelden
					</button>
				</div>
			</div>
		</div>
	</nav>
{/if}

<main class="container-fluid py-4">
	{@render children()}
</main>

<style>
	:global(body) {
		background-color: #f8f9fa;
	}
</style>
