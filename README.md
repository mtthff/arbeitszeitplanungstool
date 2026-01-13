# AZN-Planung

Ein vollständiges SvelteKit-basiertes Tool zur Arbeitszeitplanung mit rollenbasierter Zugriffskontrolle und MySQL-Datenbank.

## Features

- ✅ **Rollenbasierte Authentifizierung** (Admin, Leitung, Mitarbeiter:in)
- ✅ **Arbeitszeitplanung** mit Start-/Endzeit, Pausen
- ✅ **Urlaubs- und Freiwunsch-Verwaltung**
- ✅ **Monatsansicht** für alle Einträge
- ✅ **Team-Übersicht** für Leitungskräfte
- ✅ **E-Mail-Benachrichtigungen** für Anmerkungen
- ✅ **Benutzerverwaltung** für Admins
- ✅ **Bootstrap 5 UI** - responsive und modern
- ✅ **MySQL-Datenbank** - zuverlässig und skalierbar
- ✅ **Base Path Support** - funktioniert in Unterverzeichnissen

## Technologie-Stack

- **Frontend:** SvelteKit 2.x (JavaScript + JSDoc)
- **Backend:** SvelteKit API Routes
- **Datenbank:** MySQL mit mysql2
- **Adapter:** @sveltejs/adapter-node
- **UI Framework:** Bootstrap 5 (CDN)
- **Base Path:** `/azn-planung` (permanent für Dev & Production)

## Rollen & Berechtigungen

**Wichtig:** Alle Benutzer sind Mitarbeiter:innen und führen ein Arbeitszeitkonto. Admin und Leitung sind zusätzliche Berechtigungen, die einzelnen Mitarbeitern zugewiesen werden können.

### Mitarbeiter:in (Standard)
- ✅ Eigene Arbeitszeiten eintragen und bearbeiten
- ✅ Urlaub und Freiwünsche planen
- ✅ Monatsansicht der eigenen Zeiten

### Leitung (Zusatzberechtigung)
- ✅ Alle unter Mitarbeiter:in genannten Rechte
- ✅ Alle Mitarbeiter:innen und deren Arbeitszeiten einsehen
- ✅ Team-Übersicht nach Monaten
- ✅ Anmerkungen per E-Mail versenden

### Admin (Zusatzberechtigung)
- ✅ Alle unter Mitarbeiter:in genannten Rechte
- ✅ Benutzer anlegen, bearbeiten, löschen
- ✅ Berechtigungen (Admin/Leitung) zuweisen
- ✅ Komplette Benutzerverwaltung
- ❌ Keine Team-Übersicht (nur Leitung hat Zugriff)

**Beispiel:** Ein Benutzer kann gleichzeitig Admin UND Leitung sein und führt trotzdem ein eigenes Arbeitszeitkonto.

## Installation & Entwicklung

### Voraussetzungen

- Node.js 18+ 
- npm oder pnpm

### Setup

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# App öffnen im Browser
http://localhost:5173/azn-planung
```


## Production Deployment

### Build erstellen

```bash
# Production Build
npm run build

# Lokaler Test des Builds
npm run preview
```

### Server-Deployment (z.B. Uberspace)

#### 1. Projekt bauen

```bash
npm run build
```

#### 2. Files hochladen

Lade folgende Dateien/Ordner auf deinen Server:

```
/build/           # Gebaute Anwendung
/node_modules/    # Dependencies (oder npm install auf dem Server)
package.json      # Für Dependencies
```

#### 3. Server starten

```bash
# Dependencies installieren (falls nicht hochgeladen)
npm install --production

# Server starten
cd build
node index.js
```

Der Server läuft standardmäßig auf Port 3000.

#### 4. Webserver-Konfiguration

##### Nginx

Erstelle eine Nginx-Konfiguration für das Unterverzeichnis `/azn-planung`:

```nginx
location /azn-planung/ {
    proxy_pass http://localhost:3000/azn-planung/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Dann Nginx neu laden:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

##### Apache

Erstelle eine `.htaccess` oder Apache-Config:

```apache
<IfModule mod_proxy.c>
    ProxyPass /azn-planung http://localhost:3000/azn-planung
    ProxyPassReverse /azn-planung http://localhost:3000/azn-planung
    ProxyPreserveHost On
</IfModule>
```

Benötigte Apache-Module aktivieren:

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo systemctl restart apache2
```

#### 5. Dauerhafter Betrieb mit PM2 (empfohlen)

```bash
# PM2 installieren
npm install -g pm2

# App starten
cd build
pm2 start index.js --name azn-planung

# Automatischer Start nach Reboot
pm2 startup
pm2 save
```

### Uberspace-spezifische Anleitung

```bash
# 1. Port für die App reservieren
uberspace port add

# Notiere dir die Port-Nummer (z.B. 40132)

# 2. Backend starten
cd ~/azn-planung/build
PORT=40132 node index.js &

# 3. Web-Backend konfigurieren
uberspace web backend set UBERSPACENAME.uber.space/azn-planung --http --port 40132

# 4. Dauerhafter Betrieb mit supervisord
cat > ~/etc/services.d/azn-planung.ini << EOF
[program:azn-planung]
command=node /home/USER/azn-planung/build/index.js
environment=PORT=40132
autostart=yes
autorestart=yes
startsecs=30
EOF

# Service starten
supervisorctl reread
supervisorctl update
supervisorctl start azn-planung
```

## Base Path Konfiguration

Die App ist **dauerhaft** für den Base Path `/azn-planung` konfiguriert:

- ✅ Development: `http://localhost:5173/azn-planung`
- ✅ Production: `https://UBERSPACENAME.uber.space/azn-planung`

**Wichtig:** Alle internen Links und API-Aufrufe nutzen automatisch den Base Path durch `$app/paths`.

## Datenbank

### Konfiguration

Die MySQL-Verbindung wird über Umgebungsvariablen konfiguriert:

```bash
DB_HOST=127.0.0.1        # Standard: 127.0.0.1
DB_PORT=3306             # Standard: 3306
DB_USER=root             # Standard: root
DB_PASSWORD=             # Pflichtfeld
DB_NAME=UBERSPACENAME_aznplanung  # Standard: UBERSPACENAME_aznplanung
```

### Setup

1. **MySQL-Datenbank erstellen:**

```bash
mysql -u root -p
CREATE DATABASE UBERSPACENAME_aznplanung CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

2. **Umgebungsvariablen setzen:**

Erstelle eine `.env` Datei im Projekt-Root:

```bash
DB_PASSWORD=dein_mysql_passwort
```

3. **Tabellen werden automatisch erstellt** beim ersten Start der App.

### Backup erstellen

```bash
# Komplettes Backup
mysqldump -u root -p UBERSPACENAME_aznplanung > backup-$(date +%Y%m%d).sql

# Nur Daten (ohne Schema)
mysqldump -u root -p --no-create-info UBERSPACENAME_aznplanung > data-backup.sql
```

### Datenbank zurücksetzen

```bash
mysql -u root -p
DROP DATABASE UBERSPACENAME_aznplanung;
CREATE DATABASE UBERSPACENAME_aznplanung CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Manuelle Datenbank-Verwaltung

```bash
# MySQL CLI öffnen
mysql -u root -p UBERSPACENAME_aznplanung

# Beispiel-Queries
SELECT * FROM users;
SELECT * FROM timetable WHERE user_id = 3;
```

## Projektstruktur

```
azn-planung/
├── src/
│   ├── lib/
│   │   ├── db.js                    # Datenbank-Logic
│   │   ├── index.js
│   │   └── assets/
│   └── routes/
│       ├── +layout.svelte           # Haupt-Layout mit Navigation
│       ├── +layout.server.js        # Session-Handling
│       ├── +page.svelte             # Arbeitszeitplanung (alle Mitarbeiter)
│       ├── +page.server.js          # Auth-Check
│       ├── login/
│       │   ├── +page.svelte         # Login-Seite
│       │   └── +page.server.js      # Login-Logic
│       ├── profil/
│       │   ├── +page.svelte         # Profil-Seite
│       │   └── +page.server.js      # Profil-Logic
│       ├── team/
│       │   ├── +page.svelte         # Team-Übersicht (Leitung/Admin)
│       │   └── +page.server.js      # Auth-Check Leitung
│       ├── admin/
│       │   ├── +page.svelte         # Admin-Panel
│       │   └── +page.server.js      # Auth-Check Admin
│       └── api/
│           ├── auth/
│           │   ├── login/+server.js
│           │   └── logout/+server.js
│           ├── roles/
│           ├── target-hours/
│           │   └── +server.js
│           ├── timetable/
│           │   ├── +server.js       # GET, POST
│           │   └── [id]/+server.js  # GET, PUT, DELETE
│           └── users/
│               ├── +server.js       # GET, POST
│               └── [id]/+server.js  # GET, PUT, DELETE
├── static/
│   └── robots.txt
├── svelte.config.js                 # SvelteKit Config mit base path
├── vite.config.js
├── package.json
└── .env                             # Umgebungsvariablen (DB-Zugangsdaten)
```

## API-Endpunkte

Alle Endpunkte sind unter `/azn-planung/api` verfügbar:

### Authentifizierung
- `POST /azn-planung/api/auth/login` - Login
- `POST /azn-planung/api/auth/logout` - Logout

### Benutzer
- `GET /azn-planung/api/users` - Alle Benutzer
- `POST /azn-planung/api/users` - Neuer Benutzer (erfordert: name, email, password, is_admin, is_leitung)
- `GET /azn-planung/api/users/:id` - Benutzer Details
- `PUT /azn-planung/api/users/:id` - Benutzer aktualisieren (Berechtigungen ändern)
- `DELETE /azn-planung/api/users/:id` - Benutzer löschen

### Arbeitszeiten
- `GET /azn-planung/api/timetable?user_id=X&month=Y&year=Z` - Einträge filtern
- `POST /azn-planung/api/timetable` - Neuer Eintrag
- `GET /azn-planung/api/timetable/:id` - Eintrag Details
- `PUT /azn-planung/api/timetable/:id` - Eintrag aktualisieren
- `DELETE /azn-planung/api/timetable/:id` - Eintrag löschen

## Umgebungsvariablen

Optional kannst du den Port über Umgebungsvariablen setzen:

```bash
PORT=3000 node build/index.js
```

## Troubleshooting

### App startet nicht

```bash
# Prüfe ob Port bereits belegt ist
netstat -tulpn | grep 3000

# Prüfe Logs
pm2 logs azn-planung
```

### Datenbank-Fehler

```bash
# Verbindung prüfen
mysql -u root -p UBERSPACENAME_aznplanung

# Umgebungsvariablen prüfen
echo $DB_PASSWORD

# MySQL-Service prüfen
sudo systemctl status mysql
```

### Base Path funktioniert nicht

- Stelle sicher, dass der Webserver korrekt auf `/azn-planung/` weiterleitet
- Prüfe ob `paths.base` in `svelte.config.js` auf `/azn-planung` gesetzt ist
- Alle Links müssen `${base}/...` verwenden (aus `$app/paths`)

## Weiterentwicklung

### Neue Features hinzufügen

1. API-Route in `src/routes/api/...` erstellen
2. UI-Komponente in `src/routes/...` erstellen
3. Datenbank-Queries in `src/lib/db.js` hinzufügen

### Datenbank-Schema ändern

Bearbeite die `createTables()` Funktion in `src/lib/db.js` und setze die Datenbank zurück (siehe Abschnitt "Datenbank zurücksetzen").

## Support & Kontakt

Bei Fragen oder Problemen:
- Prüfe die Logs: `pm2 logs azn-planung`
- Teste lokal mit `npm run dev`
- Prüfe Nginx/Apache Logs

## Lizenz

Private Nutzung - Alle Rechte vorbehalten.
