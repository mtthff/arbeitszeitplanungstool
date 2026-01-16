import { json } from '@sveltejs/kit';
import { query, run, getLastInsertId } from '$lib/db.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const includeArchived = url.searchParams.get('include_archived') === 'true';
		
		let queryStr = `
			SELECT 
				id, 
				name, 
				email, 
				is_admin, 
				is_leitung,
				archived,
				employment_percentage,
				created_at
			FROM users`;
		
		if (!includeArchived) {
			queryStr += ' WHERE archived = 0';
		}
		
		queryStr += ' ORDER BY name';
		
		const users = await query(queryStr);
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
			`INSERT INTO users (
				name, email, password, is_admin, is_leitung,
				default_monday_start_hour, default_monday_start_minute, default_monday_end_hour, default_monday_end_minute,
				default_tuesday_start_hour, default_tuesday_start_minute, default_tuesday_end_hour, default_tuesday_end_minute,
				default_wednesday_start_hour, default_wednesday_start_minute, default_wednesday_end_hour, default_wednesday_end_minute,
				default_thursday_start_hour, default_thursday_start_minute, default_thursday_end_hour, default_thursday_end_minute,
				default_friday_start_hour, default_friday_start_minute, default_friday_end_hour, default_friday_end_minute,
				default_saturday_start_hour, default_saturday_start_minute, default_saturday_end_hour, default_saturday_end_minute,
				default_sunday_start_hour, default_sunday_start_minute, default_sunday_end_hour, default_sunday_end_minute
			) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
			[name, email, password, is_admin ? 1 : 0, is_leitung ? 1 : 0]
		);
		
		const id = await getLastInsertId();
		
		return json({ success: true, data: { id }, message: 'Benutzer erfolgreich erstellt' });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}
