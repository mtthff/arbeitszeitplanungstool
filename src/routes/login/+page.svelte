<script>
	import { base } from '$app/paths';
	
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	
	async function handleLogin() {
		error = '';
		loading = true;
		
		try {
			const response = await fetch(`${base}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			
			const result = await response.json();
			
			if (result.success) {
				window.location.href = `${base}/`;
			} else {
				error = result.message || 'Login fehlgeschlagen';
			}
		} catch (e) {
			error = 'Ein Fehler ist aufgetreten';
		} finally {
			loading = false;
		}
	}
	
	function handleSubmit(e) {
		e.preventDefault();
		handleLogin();
	}
</script>

<div class="row justify-content-center mt-5">
	<div class="col-md-4">
		<div class="card shadow">
			<div class="card-body p-4">
				<h2 class="card-title text-center mb-4">
					<i class="bi bi-clock-history text-primary"></i>
					<br>
					Arbeitszeitplanung
				</h2>
				
				{#if error}
					<div class="alert alert-danger" role="alert">
						<i class="bi bi-exclamation-triangle"></i> {error}
					</div>
				{/if}
				
				<form onsubmit={handleSubmit}>
					<div class="mb-3">
						<label for="email" class="form-label">E-Mail</label>
						<input
							type="email"
							class="form-control"
							id="email"
							bind:value={email}
							required
							disabled={loading}
						>
					</div>
					
					<div class="mb-3">
						<label for="password" class="form-label">Passwort</label>
						<input
							type="password"
							class="form-control"
							id="password"
							bind:value={password}
							required
							disabled={loading}
						>
					</div>
					
					<button type="submit" class="btn btn-primary w-100" disabled={loading}>
						{#if loading}
							<span class="spinner-border spinner-border-sm me-2" role="status"></span>
						{/if}
						Anmelden
					</button>
				</form>
			</div>
		</div>
	</div>
</div>

<style>
	.card {
		border: none;
		border-radius: 1rem;
	}
</style>
