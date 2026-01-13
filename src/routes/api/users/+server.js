import { json } from '@sveltejs/kit';
import { query, run, getLastInsertId } from '$lib/db.js';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	try {
		const users = await query(`
			SELECT 
				id, 
				name, 
				email, 
				is_admin, 
				is_leitung,
				created_at
			FROM users 
			ORDER BY name
		`);
		return json({ success: true, data: users });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { name, email, password, is_admin, is_leitung } = await request.json();
		
		if (!name || !email || !password) {
			return json({ success: false, message: 'Name, Email und Passwort sind erforderlich' }, { status: 400 });
		}

		await run(
			'INSERT INTO users (name, email, password, is_admin, is_leitung) VALUES (?, ?, ?, ?, ?)',
			[name, email, password, is_admin ? 1 : 0, is_leitung ? 1 : 0]
		);
		
		const id = await getLastInsertId();
		
		return json({ success: true, data: { id }, message: 'Benutzer erfolgreich erstellt' });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}
