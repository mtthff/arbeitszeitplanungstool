import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

export async function load({ cookies }) {
	const sessionCookie = cookies.get('session');
	
	if (!sessionCookie) {
		throw redirect(303, `${base}/login`);
	}
	
	const user = JSON.parse(sessionCookie);
	
	// Nur Leitung darf Jahresplanung sehen
	if (!user.is_leitung) {
		throw redirect(303, `${base}/`);
	}
	
	return {
		user
	};
}
