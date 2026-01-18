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
		const { name, email, password, is_admin, is_leitung, employment_percentage = 100 } = await request.json();
		
		if (!name || !email || !password) {
			return json({ success: false, message: 'Name, Email und Passwort sind erforderlich' }, { status: 400 });
		}

		await run(
			`INSERT INTO users (
				name, email, password, is_admin, is_leitung, employment_percentage
			) VALUES (?, ?, ?, ?, ?, ?)`,
			[name, email, password, is_admin ? 1 : 0, is_leitung ? 1 : 0, employment_percentage]
		);
		
		const userId = await getLastInsertId();
		
		// Erstelle target_hours Einträge für alle existierenden work_days_calendar Einträge
		// ab dem aktuellen Jahr
		await createTargetHoursForNewUser(userId, employment_percentage);
		
		return json({ success: true, data: { id: userId }, message: 'Benutzer erfolgreich erstellt' });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}

/**
 * Erstellt target_hours Einträge für einen neuen User basierend auf existierenden work_days_calendar Einträgen
 * @param {number} userId 
 * @param {number} employmentPercentage 
 */
async function createTargetHoursForNewUser(userId, employmentPercentage) {
	try {
		// Hole das aktuelle Jahr
		const currentYearResult = await query('SELECT YEAR(CURDATE()) as current_year');
		const currentYear = currentYearResult[0].current_year;
		
		// Finde alle work_days_calendar Einträge ab dem aktuellen Jahr
		const workDaysEntries = await query(
			'SELECT year, month, work_days FROM work_days_calendar WHERE year >= ? ORDER BY year, month',
			[currentYear]
		);
		
		// Erstelle für jeden Eintrag einen target_hours Eintrag
		for (const entry of workDaysEntries) {
			const targetMinutes = Math.round(entry.work_days * 468 * (employmentPercentage / 100));
			
			// Prüfe ob Eintrag bereits existiert (sollte nicht der Fall sein für neuen User)
			const existing = await query(
				'SELECT id FROM target_hours WHERE user_id = ? AND year = ? AND month = ?',
				[userId, entry.year, entry.month]
			);
			
			if (existing.length === 0) {
				await run(
					'INSERT INTO target_hours (user_id, year, month, target_minutes) VALUES (?, ?, ?, ?)',
					[userId, entry.year, entry.month, targetMinutes]
				);
			}
		}
	} catch (error) {
		// Log error aber nicht werfen, da User bereits erstellt wurde
		console.error('Fehler beim Erstellen von target_hours für neuen User:', error);
	}
}
