// createAdmin.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
// Load environment variables from a .env file located in the project root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createAdmin(username, password) {
  if (!username || !password) {
    console.error('Username and password are required.');
    process.exit(1);
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute(
      'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );

    console.log(`Admin user "${username}" created with ID: ${result.insertId}`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.error(`Error: Username "${username}" already exists.`);
    } else {
      console.error('Error creating admin user:', error);
    }
  } finally {
    await pool.end();
  }
}

// Get username and password from command-line arguments
const username = process.argv[2];
const password = process.argv[3];

createAdmin(username, password);
