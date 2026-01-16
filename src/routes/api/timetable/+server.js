import { json } from '@sveltejs/kit';
import { query, run, getLastInsertId } from '$lib/db.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	try {
		const user_id = url.searchParams.get('user_id');
		const month = url.searchParams.get('month');
		const year = url.searchParams.get('year');
		
		let sql = `
			SELECT t.*, u.name as user_name 
			FROM timetable t 
			LEFT JOIN users u ON t.user_id = u.id
		`;
		const params = [];
		const conditions = [];
		
		if (user_id) {
			conditions.push('t.user_id = ?');
			params.push(user_id);
		}
		
		if (month && year) {
			conditions.push('YEAR(t.date) = ? AND MONTH(t.date) = ?');
			params.push(year, month);
		}
		
		if (conditions.length > 0) {
			sql += ' WHERE ' + conditions.join(' AND ');
		}
		
		sql += ' ORDER BY t.date DESC, u.name';
		
		const entries = await query(sql, params);
		
		// Konvertiere DATE-Felder zu YYYY-MM-DD Strings, um Zeitzonenprobleme zu vermeiden
		const formattedEntries = entries.map(entry => {
			if (entry.date) {
				// Wenn date ein Date-Objekt ist, zu lokalem String konvertieren
				if (entry.date instanceof Date) {
					const year = entry.date.getFullYear();
					const month = String(entry.date.getMonth() + 1).padStart(2, '0');
					const day = String(entry.date.getDate()).padStart(2, '0');
					entry.date = `${year}-${month}-${day}`;
				}
				// Wenn es ein ISO-String ist (mit T), nur Datums-Teil nehmen
				else if (typeof entry.date === 'string' && entry.date.includes('T')) {
					entry.date = entry.date.split('T')[0];
				}
			}
			return entry;
		});
		
		return json({ success: true, data: formattedEntries });
	} catch (error) {
		console.error('Fehler in GET /api/timetable:', error);
		return json({ success: false, message: error.message }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const data = await request.json();
		
		const { user_id, date, starttime, endtime, breakduration, absence_type, comment } = data;
		
		if (!user_id || !date) {
			return json({ success: false, message: 'user_id und date sind erforderlich' }, { status: 400 });
		}

		await run(
			`INSERT INTO timetable (user_id, date, starttime, endtime, breakduration, absence_type, comment) 
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[user_id, date, starttime || null, endtime || null, breakduration || 0, absence_type || null, comment || '']
		);
		
		const id = await getLastInsertId();
		
		return json({ success: true, data: { id }, message: 'Eintrag erfolgreich erstellt' });
	} catch (error) {
		console.error('Fehler in POST /api/timetable:', error);
		return json({ success: false, message: error.message }, { status: 500 });
	}
}
