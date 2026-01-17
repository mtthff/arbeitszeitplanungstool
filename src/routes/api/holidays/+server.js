import { json } from '@sveltejs/kit';
import { initDB } from '$lib/db.js';

export async function GET({ url, locals }) {
	if (!locals.user || !locals.user.is_leitung) {
		return json({ success: false, message: 'Keine Berechtigung' }, { status: 403 });
	}

	const year = url.searchParams.get('year');

	if (!year) {
		return json({ success: false, message: 'Jahr erforderlich' }, { status: 400 });
	}

	try {
		const db = initDB();
		const [holidays] = await db.execute(
			'SELECT * FROM holidays WHERE year = ? ORDER BY date ASC',
			[year]
		);

		return json({ success: true, data: holidays });
	} catch (error) {
		console.error('Fehler beim Laden der Feiertage:', error);
		return json({ success: false, message: 'Datenbankfehler' }, { status: 500 });
	}
}

export async function POST({ request, locals }) {
	if (!locals.user || !locals.user.is_leitung) {
		return json({ success: false, message: 'Keine Berechtigung' }, { status: 403 });
	}

	const { year, date, name } = await request.json();

	if (!year || !date || !name) {
		return json({ success: false, message: 'Jahr, Datum und Name erforderlich' }, { status: 400 });
	}

	try {
		const db = initDB();
		await db.execute(
			'INSERT INTO holidays (year, date, name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
			[year, date, name]
		);

		return json({ success: true, message: 'Feiertag gespeichert' });
	} catch (error) {
		console.error('Fehler beim Speichern des Feiertags:', error);
		return json({ success: false, message: 'Datenbankfehler' }, { status: 500 });
	}
}

export async function DELETE({ url, locals }) {
	if (!locals.user || !locals.user.is_leitung) {
		return json({ success: false, message: 'Keine Berechtigung' }, { status: 403 });
	}

	const id = url.searchParams.get('id');

	if (!id) {
		return json({ success: false, message: 'ID erforderlich' }, { status: 400 });
	}

	try {
		const db = initDB();
		await db.execute('DELETE FROM holidays WHERE id = ?', [id]);

		return json({ success: true, message: 'Feiertag gelöscht' });
	} catch (error) {
		console.error('Fehler beim Löschen des Feiertags:', error);
		return json({ success: false, message: 'Datenbankfehler' }, { status: 500 });
	}
}
