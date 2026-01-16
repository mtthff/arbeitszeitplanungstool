import { json } from '@sveltejs/kit';
import { query } from '$lib/db.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, cookies }) {
	try {
		const { email, password } = await request.json();
		
		if (!email || !password) {
			return json({ success: false, message: 'Email und Passwort erforderlich' }, { status: 400 });
		}

		const users = await query(
			`SELECT 
				id, 
				name, 
				email, 
				is_admin, 
				is_leitung,
				archived
			FROM users 
			WHERE email = ? AND password = ?`,
			[email, password]
		);
		
		if (users.length === 0) {
			return json({ success: false, message: 'Ungültige Anmeldedaten' }, { status: 401 });
		}
		
		const user = users[0];
		
		// Prüfe ob Benutzer archiviert ist
		if (user.archived) {
			return json({ success: false, message: 'Dieser Benutzer ist archiviert und kann sich nicht mehr anmelden' }, { status: 403 });
		}
		
		// Session-Cookie setzen
		cookies.set('session', JSON.stringify({
			id: user.id,
			name: user.name,
			email: user.email,
			is_admin: user.is_admin,
			is_leitung: user.is_leitung
		}), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 7 Tage
		});
		
		return json({ 
			success: true, 
			data: { 
				id: user.id, 
				name: user.name,
				is_admin: user.is_admin,
				is_leitung: user.is_leitung
			} 
		});
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}
