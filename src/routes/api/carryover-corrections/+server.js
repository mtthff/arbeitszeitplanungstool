import { json } from '@sveltejs/kit';
import { query, run } from '$lib/db';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, cookies }) {
	const sessionCookie = cookies.get('session');
	if (!sessionCookie) {
		return json({ success: false, message: 'Nicht authentifiziert' }, { status: 401 });
	}

	const userId = url.searchParams.get('user_id');
	const year = url.searchParams.get('year');
	const month = url.searchParams.get('month');

	if (!userId || !year || !month) {
		return json({ success: false, message: 'user_id, year und month sind erforderlich' }, { status: 400 });
	}

	try {
		const corrections = await query(
			'SELECT * FROM carryover_corrections WHERE user_id = ? AND year = ? AND month = ?',
			[userId, year, month]
		);

		if (corrections.length > 0) {
			return json({ success: true, data: corrections[0] });
		} else {
			return json({ success: true, data: null });
		}
	} catch (error) {
		console.error('Fehler beim Laden der Korrektur:', error);
		return json({ success: false, message: 'Datenbankfehler' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, cookies }) {
	const sessionCookie = cookies.get('session');
	if (!sessionCookie) {
		return json({ success: false, message: 'Nicht authentifiziert' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { user_id, year, month, carryover_minutes } = body;

		if (user_id === undefined || year === undefined || month === undefined || carryover_minutes === undefined) {
			return json({ success: false, message: 'Alle Felder sind erforderlich' }, { status: 400 });
		}

		// Prüfe ob bereits ein Eintrag existiert
		const existing = await query(
			'SELECT id FROM carryover_corrections WHERE user_id = ? AND year = ? AND month = ?',
			[user_id, year, month]
		);

		if (existing.length > 0) {
			// Update
			await run(
				'UPDATE carryover_corrections SET carryover_minutes = ? WHERE user_id = ? AND year = ? AND month = ?',
				[carryover_minutes, user_id, year, month]
			);
		} else {
			// Insert
			await run(
				'INSERT INTO carryover_corrections (user_id, year, month, carryover_minutes) VALUES (?, ?, ?, ?)',
				[user_id, year, month, carryover_minutes]
			);
		}

		return json({ success: true, message: 'Korrektur gespeichert' });
	} catch (error) {
		console.error('Fehler beim Speichern der Korrektur:', error);
		return json({ success: false, message: 'Datenbankfehler' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ url, cookies }) {
	const sessionCookie = cookies.get('session');
	if (!sessionCookie) {
		return json({ success: false, message: 'Nicht authentifiziert' }, { status: 401 });
	}

	const userId = url.searchParams.get('user_id');
	const year = url.searchParams.get('year');
	const month = url.searchParams.get('month');

	if (!userId || !year || !month) {
		return json({ success: false, message: 'user_id, year und month sind erforderlich' }, { status: 400 });
	}

	try {
		await run(
			'DELETE FROM carryover_corrections WHERE user_id = ? AND year = ? AND month = ?',
			[userId, year, month]
		);

		return json({ success: true, message: 'Korrektur gelöscht' });
	} catch (error) {
		console.error('Fehler beim Löschen der Korrektur:', error);
		return json({ success: false, message: 'Datenbankfehler' }, { status: 500 });
	}
}
