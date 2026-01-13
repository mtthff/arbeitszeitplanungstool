import mysql from 'mysql2/promise';

/** @type {import('mysql2/promise').Pool | null} */
let pool = null;

/**
 * Initialisiert den MySQL Connection Pool
 * @returns {import('mysql2/promise').Pool}
 */
export function initDB() {
	if (pool) return pool;

	pool = mysql.createPool({
		host: process.env.DB_HOST || '127.0.0.1',
		port: parseInt(process.env.DB_PORT || '3306'),
		user: process.env.DB_USER || 'root',
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0
	});

	return pool;
}

/**
 * Erstellt alle Tabellen (nur für Initialisierung)
 */
export async function createTables() {
	const db = initDB();

	// Users Tabelle
	await db.execute(`
		CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255) NOT NULL UNIQUE,
			password VARCHAR(255) NOT NULL,
			is_admin TINYINT(1) DEFAULT 0,
			is_leitung TINYINT(1) DEFAULT 0,
			default_monday_start_hour INT DEFAULT 9,
			default_monday_start_minute INT DEFAULT 0,
			default_monday_end_hour INT DEFAULT 17,
			default_monday_end_minute INT DEFAULT 0,
			default_tuesday_start_hour INT DEFAULT 9,
			default_tuesday_start_minute INT DEFAULT 0,
			default_tuesday_end_hour INT DEFAULT 17,
			default_tuesday_end_minute INT DEFAULT 0,
			default_wednesday_start_hour INT DEFAULT 9,
			default_wednesday_start_minute INT DEFAULT 0,
			default_wednesday_end_hour INT DEFAULT 17,
			default_wednesday_end_minute INT DEFAULT 0,
			default_thursday_start_hour INT DEFAULT 9,
			default_thursday_start_minute INT DEFAULT 0,
			default_thursday_end_hour INT DEFAULT 17,
			default_thursday_end_minute INT DEFAULT 0,
			default_friday_start_hour INT DEFAULT 9,
			default_friday_start_minute INT DEFAULT 0,
			default_friday_end_hour INT DEFAULT 17,
			default_friday_end_minute INT DEFAULT 0,
			default_saturday_start_hour INT DEFAULT NULL,
			default_saturday_start_minute INT DEFAULT NULL,
			default_saturday_end_hour INT DEFAULT NULL,
			default_saturday_end_minute INT DEFAULT NULL,
			default_sunday_start_hour INT DEFAULT NULL,
			default_sunday_start_minute INT DEFAULT NULL,
			default_sunday_end_hour INT DEFAULT NULL,
			default_sunday_end_minute INT DEFAULT NULL,
			default_break INT DEFAULT 30,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`);

	// Timetable Tabelle
	await db.execute(`
		CREATE TABLE IF NOT EXISTS timetable (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			date DATE NOT NULL,
			starttime TIME,
			endtime TIME,
			breakduration INT DEFAULT 0,
			vacation TINYINT(1) DEFAULT 0,
			comment TEXT,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_user_date (user_id, date)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`);

	// Target Hours Tabelle
	await db.execute(`
		CREATE TABLE IF NOT EXISTS target_hours (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			year INT NOT NULL,
			month INT NOT NULL,
			work_days INT NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_user_year_month (user_id, year, month)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`);
}

/**
 * Führt eine Query aus und gibt die Ergebnisse zurück
 * @param {string} sql 
 * @param {any[]} params 
 * @returns {Promise<any[]>}
 */
export async function query(sql, params = []) {
	const db = initDB();
	const [rows] = await db.execute(sql, params);
	return rows;
}

/**
 * Führt ein INSERT/UPDATE/DELETE aus
 * @param {string} sql 
 * @param {any[]} params 
 * @returns {Promise<any>}
 */
export async function run(sql, params = []) {
	const db = initDB();
	const [result] = await db.execute(sql, params);
	return result;
}

/**
 * Holt die letzte eingefügte ID
 * @returns {Promise<number>}
 */
export async function getLastInsertId() {
	const db = initDB();
	const [rows] = await db.execute('SELECT LAST_INSERT_ID() as id');
	return rows[0].id;
}

/**
 * Schließt die Datenbankverbindung (für graceful shutdown)
 */
export async function closeDB() {
	if (pool) {
		await pool.end();
		pool = null;
	}
}
