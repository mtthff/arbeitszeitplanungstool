import { json } from '@sveltejs/kit';
import { query, run, getLastInsertId } from '$lib/db.js';

/**
 * GET /api/work-days-calendar?year=2026
 * Holt alle Arbeitstage für ein Jahr (12 Monate)
 */
export async function GET({ url }) {
	try {
		const year = url.searchParams.get('year');

		if (!year) {
			return json({ success: false, message: 'year erforderlich' }, { status: 400 });
		}

		const results = await query(
			'SELECT * FROM work_days_calendar WHERE year = ? ORDER BY month',
			[year]
		);

		return json({ success: true, data: results });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}

/**
 * POST /api/work-days-calendar
 * Erstellt oder aktualisiert Arbeitstage für einen Monat
 * und aktualisiert automatisch target_hours für alle Benutzer
 */
export async function POST({ request }) {
	try {
		const data = await request.json();
		const { year, month, work_days } = data;

		if (!year || !month || work_days === undefined) {
			return json({ success: false, message: 'year, month und work_days erforderlich' }, { status: 400 });
		}

		// Prüfe ob Eintrag existiert
		const existing = await query(
			'SELECT id FROM work_days_calendar WHERE year = ? AND month = ?',
			[year, month]
		);

		if (existing.length > 0) {
			// UPDATE
			await run(
				'UPDATE work_days_calendar SET work_days = ? WHERE year = ? AND month = ?',
				[work_days, year, month]
			);
		} else {
			// INSERT
			await run(
				'INSERT INTO work_days_calendar (year, month, work_days) VALUES (?, ?, ?)',
				[year, month, work_days]
			);
		}

		// Automatisch target_hours für alle Benutzer aktualisieren/erstellen
		await updateTargetHoursForAllUsers(year, month, work_days);

		return json({ success: true, message: 'Arbeitstage gespeichert und Sollarbeitszeiten aktualisiert' });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}

/**
 * Aktualisiert oder erstellt target_hours für alle Benutzer basierend auf neuen work_days
 * @param {number} year 
 * @param {number} month 
 * @param {number} work_days 
 */
async function updateTargetHoursForAllUsers(year, month, work_days) {
	// Hole alle Benutzer
	const users = await query('SELECT id, employment_percentage FROM users');

	for (const user of users) {
		const targetMinutes = Math.round(work_days * 468 * (user.employment_percentage / 100));

		// Prüfe ob target_hours Eintrag existiert
		const existing = await query(
			'SELECT id FROM target_hours WHERE user_id = ? AND year = ? AND month = ?',
			[user.id, year, month]
		);

		if (existing.length > 0) {
			// UPDATE
			await run(
				'UPDATE target_hours SET target_minutes = ? WHERE user_id = ? AND year = ? AND month = ?',
				[targetMinutes, user.id, year, month]
			);
		} else {
			// INSERT
			await run(
				'INSERT INTO target_hours (user_id, year, month, target_minutes) VALUES (?, ?, ?, ?)',
				[user.id, year, month, targetMinutes]
			);
		}
	}
}
