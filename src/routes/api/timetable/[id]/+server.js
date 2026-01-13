import { json } from '@sveltejs/kit';
import { query, run } from '$lib/db.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	try {
		const entries = await query(
			`SELECT t.*, u.name as user_name 
			FROM timetable t 
			LEFT JOIN users u ON t.user_id = u.id
			WHERE t.id = ?`,
			[params.id]
		);
		
		if (entries.length === 0) {
			return json({ success: false, message: 'Eintrag nicht gefunden' }, { status: 404 });
		}
		
		return json({ success: true, data: entries[0] });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, request }) {
	try {
		const { date, starttime, endtime, breakduration, vacation, comment } = await request.json();
		
		await run(
			`UPDATE timetable 
			SET date = ?, starttime = ?, endtime = ?, breakduration = ?, vacation = ?, comment = ?
			WHERE id = ?`,
			[date, starttime || null, endtime || null, breakduration || 0, vacation ? 1 : 0, comment || '', params.id]
		);
		
		return json({ success: true, message: 'Eintrag erfolgreich aktualisiert' });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params }) {
	try {
		await run('DELETE FROM timetable WHERE id = ?', [params.id]);
		return json({ success: true, message: 'Eintrag erfolgreich gelöscht' });
	} catch (error) {
		return json({ success: false, message: error.message }, { status: 500 });
	}
}
