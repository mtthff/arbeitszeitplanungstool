/** @type {import('./$types').LayoutServerLoad} */
export async function load({ cookies }) {
	const sessionCookie = cookies.get('session');
	let user = null;
	
	if (sessionCookie) {
		try {
			user = JSON.parse(sessionCookie);
		} catch (e) {
			// Cookie ungültig
		}
	}
	
	return { user };
}
