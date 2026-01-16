import { json } from '@sveltejs/kit';
import { query, run } from '$lib/db';

/**
 * GET /api/target-hours?user_id=1&year=2025
 * Holt alle Sollarbeitszeiten für einen User und ein Jahr
 * Joined mit work_days_calendar für globale Arbeitstage
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
			`SELECT 
				th.id, 
				th.user_id, 
				th.year, 
				th.month, 
				th.target_minutes,
				wdc.work_days,
				u.employment_percentage
			FROM target_hours th
			LEFT JOIN work_days_calendar wdc ON th.year = wdc.year AND th.month = wdc.month
			JOIN users u ON th.user_id = u.id
			WHERE th.user_id = ? AND th.year = ?
			ORDER BY th.month`,
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
		const { user_id, year, month, target_minutes: customTargetMinutes } = data;

		if (!user_id || !year || !month) {
			console.error('Validierung fehlgeschlagen:', { user_id, year, month });
			return json({ success: false, message: 'user_id, year und month erforderlich' }, { status: 400 });
		}

		let target_minutes;
		
		// Wenn target_minutes explizit übergeben werden, nutze diese
		if (customTargetMinutes !== undefined && customTargetMinutes !== null) {
			target_minutes = customTargetMinutes;
		} else {
			// Ansonsten berechne basierend auf work_days_calendar und employment_percentage
			const userResult = await query(
				'SELECT employment_percentage FROM users WHERE id = ?',
				[user_id]
			);

			if (userResult.length === 0) {
				return json({ success: false, message: 'Benutzer nicht gefunden' }, { status: 404 });
			}

			// Hole work_days aus globaler Tabelle
			const workDaysResult = await query(
				'SELECT work_days FROM work_days_calendar WHERE year = ? AND month = ?',
				[year, month]
			);

			const workDays = workDaysResult.length > 0 ? workDaysResult[0].work_days : 0;
			const employmentPercentage = userResult[0].employment_percentage || 100;
			target_minutes = Math.round(workDays * 468 * (employmentPercentage / 100));
		}

		// Prüfe ob Eintrag existiert
		const existing = await query(
			'SELECT id FROM target_hours WHERE user_id = ? AND year = ? AND month = ?',
			[user_id, year, month]
		);

		if (existing.length > 0) {
			// UPDATE
			await run(
				'UPDATE target_hours SET target_minutes = ? WHERE user_id = ? AND year = ? AND month = ?',
				[target_minutes, user_id, year, month]
			);
		} else {
			// INSERT
			await run(
				'INSERT INTO target_hours (user_id, year, month, target_minutes) VALUES (?, ?, ?, ?)',
				[user_id, year, month, target_minutes]
			);
		}

		return json({ success: true, message: 'Sollarbeitszeit gespeichert' });
	} catch (e) {
		console.error('Fehler beim Speichern der Sollarbeitszeit:', e);
		const errorMessage = e instanceof Error ? e.message : 'Unbekannter Fehler';
		return json({ success: false, message: `Fehler beim Speichern: ${errorMessage}` }, { status: 500 });
	}
}
