# personalCFNMap

**Community Fiber Network Query & Management Tool**  
A Dockerized Node.js + MySQL application for managing and visualizing fiber serviceability polygons.

---

## Features

- View and search serviceable addresses on a dynamic map
- Store, query, and display custom polygon zones (e.g. `Future`, `Developing`, `Completed`)
- Secure login system for internal access
- Docker-based deployment with persistent MySQL storage
- Backup and restore SQL data with ease

---

## Tech Stack

- Frontend: HTML/CSS/JS (via `public/`)
- Backend: Node.js + Express
- Database: MySQL 8.0
- Hosting: Docker + docker-compose

---

## Local Development Setup

### 1. Clone the Repo

```bash
git clone https://github.com/milljs03/personalCFNMap.git
cd personalCFNMap
2. Create the .env File
 the example and fill in your secrets:

bash

Edit
cp .env.example .env
Example .env values:

env

Edit
DB_HOST=db
DB_USER=cfn_user
DB_PASSWORD=your-db-password
DB_NAME=mydb
SESSION_SECRET=your-session-secret
EMAIL_SENDER=your@email.com
EMAIL_PASSWORD=your-email-password
API_KEY=your-api-key
API_BASE_URL=http://localhost:3000
3. Start the App with Docker
bash

Edit
docker compose up -d
App: http://localhost:3000

MySQL: localhost:3306 (inside container is db:3306)

4. (Optional) Restore Polygon Data
To restore from a SQL dump (e.g. Dump20250206_fixed.sql):

bash

Edit
docker cp Dump20250206_fixed.sql cfn-map-db:/tmp/backup.sql
docker exec -it cfn-map-db bash
mysql -u root -p"$DB_PASSWORD" "$DB_NAME" < /tmp/backup.sql
Project Structure
graphql

Edit
.
├── docker-compose.yml        # Main docker orchestration file
├── server.js                 # Express backend
├── .env.example              # Environment variable template
├── public/                   # Frontend HTML/JS/CSS
├── db_backups/               # Optional: store your SQL backups here
└── init.sql (optional)       # Optional auto-init SQL on first run
Backup Instructions
Create a Backup from Docker
bash

Edit
bash ./backup_db.sh
Creates a timestamped file in /db_backups like:

bash

Edit
db_backups/mydb_backup_2025-06-23_14-45-00.sql
Manual Backup via Workbench
Open MySQL Workbench → Server → Data Export

Choose mydb → Dump structure and data → Export to .sql

Production Deployment Guide
To deploy on a public server (e.g. DigitalOcean, AWS, bare VPS):

1. Install Docker and Docker Compose
bash

Edit
sudo apt update && sudo apt install docker.io docker-compose -y
2. Clone the Repo and Set Up .env
bash

Edit
git clone https://github.com/milljs03/personalCFNMap.git
cd personalCFNMap
cp .env.example .env
nano .env  # Edit values
3. Run the App
bash

Edit
docker compose up -d
4. Set Up a Domain (Optional)
Use Nginx or Caddy to point your domain to localhost:3000. Sample Nginx config:

nginx

Edit
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
Security Tips
Never commit real .env files to GitHub

Use Docker volumes (db_data) to persist data across restarts

Use SSL (via Let’s Encrypt) for public deployments

Troubleshooting
MySQL won't start: Check if the volume is corrupted or port 3306 is in use

No polygons showing: Make sure you restored the SQL dump properly

Login doesn't work: Check session secret and DB user setup

License
MIT (c) 2025 Josiah Miller

