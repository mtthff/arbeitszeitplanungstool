import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

/** @param {{ cookies: any }} param0 */
export async function load({ cookies }) {
	const sessionCookie = cookies.get('session');
	
	if (sessionCookie) {
		throw redirect(303, `${base}/`);
	}
	
	return {};
}
