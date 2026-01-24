import { json } from '@sveltejs/kit';
import { query, run } from '$lib/db.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { user_id, start_date, old_schedule, new_schedule } = await request.json();
		
		if (!user_id || !start_date || !old_schedule || !new_schedule) {
			return json({ 
				success: false, 
				message: 'user_id, start_date, old_schedule und new_schedule sind erforderlich' 
			}, { status: 400 });
		}
		
		// Lade alle Timetable-Einträge ab dem Startdatum
		const entries = await query(
			`SELECT * FROM timetable 
			WHERE user_id = ? AND date >= ? 
			ORDER BY date`,
			[user_id, start_date]
		);
		
		let updatedCount = 0;
		
		// Hilfsfunktion zum Erstellen einer Zeit aus Stunden und Minuten
		function createTime(hour, minute) {
			if (hour === null || minute === null) return null;
			return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
		}
		
		// Hilfsfunktion zum Vergleichen zweier Zeiten (nur HH:MM)
		function timesMatch(time1, time2) {
			if (time1 === null && time2 === null) return true;
			if (time1 === null || time2 === null) return false;
			
			// Nimm nur HH:MM ohne Sekunden
			const t1 = time1.substring(0, 5);
			const t2 = time2.substring(0, 5);
			return t1 === t2;
		}
		
		// Erstelle Mapping für alte Standardzeiten pro Wochentag (0=Sonntag, 1=Montag, ...)
		const oldStandards = {
			1: { // Montag
				start: createTime(old_schedule.default_monday_start_hour, old_schedule.default_monday_start_minute),
				end: createTime(old_schedule.default_monday_end_hour, old_schedule.default_monday_end_minute)
			},
			2: { // Dienstag
				start: createTime(old_schedule.default_tuesday_start_hour, old_schedule.default_tuesday_start_minute),
				end: createTime(old_schedule.default_tuesday_end_hour, old_schedule.default_tuesday_end_minute)
			},
			3: { // Mittwoch
				start: createTime(old_schedule.default_wednesday_start_hour, old_schedule.default_wednesday_start_minute),
				end: createTime(old_schedule.default_wednesday_end_hour, old_schedule.default_wednesday_end_minute)
			},
			4: { // Donnerstag
				start: createTime(old_schedule.default_thursday_start_hour, old_schedule.default_thursday_start_minute),
				end: createTime(old_schedule.default_thursday_end_hour, old_schedule.default_thursday_end_minute)
			},
			5: { // Freitag
				start: createTime(old_schedule.default_friday_start_hour, old_schedule.default_friday_start_minute),
				end: createTime(old_schedule.default_friday_end_hour, old_schedule.default_friday_end_minute)
			},
			6: { // Samstag
				start: createTime(old_schedule.default_saturday_start_hour, old_schedule.default_saturday_start_minute),
				end: createTime(old_schedule.default_saturday_end_hour, old_schedule.default_saturday_end_minute)
			},
			0: { // Sonntag
				start: createTime(old_schedule.default_sunday_start_hour, old_schedule.default_sunday_start_minute),
				end: createTime(old_schedule.default_sunday_end_hour, old_schedule.default_sunday_end_minute)
			}
		};
		
		// Erstelle Mapping für neue Standardzeiten
		const newStandards = {
			1: { // Montag
				start: createTime(new_schedule.default_monday_start_hour, new_schedule.default_monday_start_minute),
				end: createTime(new_schedule.default_monday_end_hour, new_schedule.default_monday_end_minute)
			},
			2: { // Dienstag
				start: createTime(new_schedule.default_tuesday_start_hour, new_schedule.default_tuesday_start_minute),
				end: createTime(new_schedule.default_tuesday_end_hour, new_schedule.default_tuesday_end_minute)
			},
			3: { // Mittwoch
				start: createTime(new_schedule.default_wednesday_start_hour, new_schedule.default_wednesday_start_minute),
				end: createTime(new_schedule.default_wednesday_end_hour, new_schedule.default_wednesday_end_minute)
			},
			4: { // Donnerstag
				start: createTime(new_schedule.default_thursday_start_hour, new_schedule.default_thursday_start_minute),
				end: createTime(new_schedule.default_thursday_end_hour, new_schedule.default_thursday_end_minute)
			},
			5: { // Freitag
				start: createTime(new_schedule.default_friday_start_hour, new_schedule.default_friday_start_minute),
				end: createTime(new_schedule.default_friday_end_hour, new_schedule.default_friday_end_minute)
			},
			6: { // Samstag
				start: createTime(new_schedule.default_saturday_start_hour, new_schedule.default_saturday_start_minute),
				end: createTime(new_schedule.default_saturday_end_hour, new_schedule.default_saturday_end_minute)
			},
			0: { // Sonntag
				start: createTime(new_schedule.default_sunday_start_hour, new_schedule.default_sunday_start_minute),
				end: createTime(new_schedule.default_sunday_end_hour, new_schedule.default_sunday_end_minute)
			}
		};
		
		// Durchlaufe alle Einträge und prüfe, ob sie den alten Standards entsprechen
		for (const entry of entries) {
			// Überspringe Einträge mit Abwesenheitstyp
			if (entry.absence_type) {
				continue;
			}
			
			// Bestimme den Wochentag
			const date = new Date(entry.date);
			const dayOfWeek = date.getDay(); // 0=Sonntag, 1=Montag, ...
			
			const oldStandard = oldStandards[/** @type {0|1|2|3|4|5|6} */ (dayOfWeek)];
			const newStandard = newStandards[/** @type {0|1|2|3|4|5|6} */ (dayOfWeek)];
			
			// Prüfe, ob der Eintrag den alten Standardzeiten entspricht
			const matchesOldStandard = 
				timesMatch(entry.starttime, oldStandard.start) && 
				timesMatch(entry.endtime, oldStandard.end);
			
			if (matchesOldStandard) {
				// Aktualisiere mit den neuen Standardzeiten
				await run(
					`UPDATE timetable 
					SET starttime = ?, endtime = ?, breakduration = ?
					WHERE id = ?`,
					[
						newStandard.start, 
						newStandard.end, 
						new_schedule.default_break || old_schedule.default_break || 30,
						entry.id
					]
				);
				updatedCount++;
			}
		}
		
		return json({ 
			success: true, 
			message: `${updatedCount} Einträge wurden aktualisiert`,
			updated: updatedCount
		});
		
	} catch (error) {
		console.error('Fehler in POST /api/timetable/update-standards:', error);
		return json({ success: false, message: error?.message || 'Ein Fehler ist aufgetreten' }, { status: 500 });
	}
}
