import { redirect } from '@sveltejs/kit';

/** @param {{ cookies: any }} param0 */
export async function load({ cookies }) {
	const sessionCookie = cookies.get('session');
	
	if (sessionCookie) {
		throw redirect(303, '/azp/');
	}
	
	return {};
}
