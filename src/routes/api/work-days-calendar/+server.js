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

		return json({ success: true, message: 'Arbeitstage gespeichert' });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}
