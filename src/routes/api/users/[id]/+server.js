import { json } from '@sveltejs/kit';
import { query, run } from '$lib/db.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	try {
		const users = await query(
			`SELECT 
				id, 
				name, 
				email, 
				is_admin, 
				is_leitung,
				default_monday_start_hour,
				default_monday_start_minute,
				default_monday_end_hour,
				default_monday_end_minute,
				default_tuesday_start_hour,
				default_tuesday_start_minute,
				default_tuesday_end_hour,
				default_tuesday_end_minute,
				default_wednesday_start_hour,
				default_wednesday_start_minute,
				default_wednesday_end_hour,
				default_wednesday_end_minute,
				default_thursday_start_hour,
				default_thursday_start_minute,
				default_thursday_end_hour,
				default_thursday_end_minute,
				default_friday_start_hour,
				default_friday_start_minute,
				default_friday_end_hour,
				default_friday_end_minute,
				default_saturday_start_hour,
				default_saturday_start_minute,
				default_saturday_end_hour,
				default_saturday_end_minute,
				default_sunday_start_hour,
				default_sunday_start_minute,
				default_sunday_end_hour,
				default_sunday_end_minute,
				default_break,
				created_at
			FROM users 
			WHERE id = ?`,
			[params.id]
		);
		
		if (users.length === 0) {
			return json({ success: false, message: 'Benutzer nicht gefunden' }, { status: 404 });
		}
		
		return json({ success: true, data: users[0] });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, request }) {
	try {
		const data = await request.json();
		
		// Baue UPDATE-Anweisung dynamisch auf
		const updates = [];
		const values = [];
		
		if (data.name !== undefined) {
			updates.push('name = ?');
			values.push(data.name);
		}
		if (data.email !== undefined) {
			updates.push('email = ?');
			values.push(data.email);
		}
		if (data.password !== undefined) {
			updates.push('password = ?');
			values.push(data.password);
		}
		if (data.is_admin !== undefined) {
			updates.push('is_admin = ?');
			values.push(data.is_admin ? 1 : 0);
		}
		if (data.is_leitung !== undefined) {
			updates.push('is_leitung = ?');
			values.push(data.is_leitung ? 1 : 0);
		}
		
		// Standard-Arbeitszeiten - separate Felder für jeden Wochentag
		const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
		for (const day of days) {
			if (data[`default_${day}_start_hour`] !== undefined) {
				updates.push(`default_${day}_start_hour = ?`);
				values.push(data[`default_${day}_start_hour`] === '' ? null : data[`default_${day}_start_hour`]);
			}
			if (data[`default_${day}_start_minute`] !== undefined) {
				updates.push(`default_${day}_start_minute = ?`);
				values.push(data[`default_${day}_start_minute`] === '' ? null : data[`default_${day}_start_minute`]);
			}
			if (data[`default_${day}_end_hour`] !== undefined) {
				updates.push(`default_${day}_end_hour = ?`);
				values.push(data[`default_${day}_end_hour`] === '' ? null : data[`default_${day}_end_hour`]);
			}
			if (data[`default_${day}_end_minute`] !== undefined) {
				updates.push(`default_${day}_end_minute = ?`);
				values.push(data[`default_${day}_end_minute`] === '' ? null : data[`default_${day}_end_minute`]);
			}
		}
		
		if (data.default_break !== undefined) {
			updates.push('default_break = ?');
			values.push(data.default_break || 30);
		}
		
		if (updates.length === 0) {
			return json({ success: false, message: 'Keine Daten zum Aktualisieren' }, { status: 400 });
		}
		
		values.push(params.id);
		
		await run(
			`UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
			values
		);
		
		return json({ success: true, message: 'Benutzer erfolgreich aktualisiert' });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params }) {
	try {
		await run('DELETE FROM users WHERE id = ?', [params.id]);
		return json({ success: true, message: 'Benutzer erfolgreich gelöscht' });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}
