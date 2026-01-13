import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ cookies }) {
	// Lösche Cookie mit beiden Pfaden (alt und neu)
	cookies.delete('session', { path: '/' });
	cookies.delete('session', { path: '/azp' });
	return json({ success: true });
}
