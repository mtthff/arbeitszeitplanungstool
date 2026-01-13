import { json } from '@sveltejs/kit';
import { query, run } from '$lib/db';

/**
 * GET /api/target-hours?user_id=1&year=2025
 * Holt alle Sollarbeitszeiten für einen User und ein Jahr
 */
export async function GET({ url }) {
	try {
		const user_id = url.searchParams.get('user_id');
		const year = url.searchParams.get('year');

		if (!user_id || !year) {
			console.error('Fehlende Parameter');
			return json({ success: false, message: 'user_id und year erforderlich' }, { status: 400 });
		}

		const results = await query(
			'SELECT * FROM target_hours WHERE user_id = ? AND year = ? ORDER BY month',
			[user_id, year]
		);

		return json({ success: true, data: results });
	} catch (e) {
		console.error('Fehler beim Laden der Sollarbeitszeit:', e);
		const errorMessage = e instanceof Error ? e.message : 'Unbekannter Fehler';
		return json({ success: false, message: `Fehler beim Laden: ${errorMessage}` }, { status: 500 });
	}
}

/**
 * POST /api/target-hours
 * Erstellt oder aktualisiert Sollarbeitszeit für einen Monat
 */
export async function POST({ request }) {
	try {
		const data = await request.json();
		const { user_id, year, month, work_days } = data;

		if (!user_id || !year || !month || work_days === undefined) {
			console.error('Validierung fehlgeschlagen:', { user_id, year, month, work_days });
			return json({ success: false, message: 'Alle Felder erforderlich' }, { status: 400 });
		}

		// Prüfe ob Eintrag existiert
		const existing = await query(
			'SELECT id FROM target_hours WHERE user_id = ? AND year = ? AND month = ?',
			[user_id, year, month]
		);

		if (existing.length > 0) {
			// UPDATE
			await run(
				'UPDATE target_hours SET work_days = ? WHERE user_id = ? AND year = ? AND month = ?',
				[work_days, user_id, year, month]
			);
		} else {
			// INSERT
			await run(
				'INSERT INTO target_hours (user_id, year, month, work_days) VALUES (?, ?, ?, ?)',
				[user_id, year, month, work_days]
			);
		}

		return json({ success: true, message: 'Sollarbeitszeit gespeichert' });
	} catch (e) {
		console.error('Fehler beim Speichern der Sollarbeitszeit:', e);
		const errorMessage = e instanceof Error ? e.message : 'Unbekannter Fehler';
		return json({ success: false, message: `Fehler beim Speichern: ${errorMessage}` }, { status: 500 });
	}
}
