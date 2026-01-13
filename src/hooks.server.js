/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const sessionCookie = event.cookies.get('session');
	
	if (sessionCookie) {
		try {
			event.locals.user = JSON.parse(sessionCookie);
		} catch (e) {
			// Cookie ungültig
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}
	
	return resolve(event);
}
