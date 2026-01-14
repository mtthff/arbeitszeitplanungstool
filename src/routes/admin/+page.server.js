import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

/** @param {{ cookies: any }} param0 */
export async function load({ cookies }) {
	const sessionCookie = cookies.get('session');
	
	if (!sessionCookie) {
		throw redirect(303, `${base}/login`);
	}
	
	const user = JSON.parse(sessionCookie);
	
	// Nur Admin darf Admin-Panel sehen
	if (!user.is_admin) {
		throw redirect(303, `${base}/`);
	}
	
	return {};
}
