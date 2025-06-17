// server.js

// --- Imports ---
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer');
const app = express();
const port = 3000;

// --- Load environment variables ---
dotenv.config();
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'API_KEY', 'API_BASE_URL', 'SESSION_SECRET'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Missing environment variable: ${varName}`);
    process.exit(1);
  }
}

// --- Middleware Setup ---
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'webfront')));
app.use('/mapfront', express.static(path.join(__dirname, 'mapfront')));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- CORS ---
const allowedOrigins = ['http://127.0.0.1:3000', 'http://localhost:3000'];
const apiCors = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy violation'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
});
app.use('/api', apiCors);
app.use('/signup', apiCors);

// --- Rate Limiting ---
const rateLimit = require('express-rate-limit');
app.use('/signup', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

// --- Session & Auth Setup ---
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Database Pool ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).promise();

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM admins WHERE username = ?', [username]);
    if (rows.length === 0) return done(null, false, { message: 'Incorrect username.' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return done(null, false, { message: 'Incorrect password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM admins WHERE id = ?', [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// --- Email Setup ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// --- Routes ---
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'webfront/pages/login.html'));
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect('/login?error=1');
    req.logIn(user, err => {
      if (err) return next(err);
      return res.redirect('/map');
    });
  })(req, res, next);
});

app.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

app.get('/map', isAuthenticated, (req, res) => {
  console.log(`✅ Serving /map to ${req.user.username}`);
  res.sendFile(path.join(__dirname, 'mapfront/pages/map.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'webfront/pages/index.html'));
});

app.get('/api/config', (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
    apiUrl: process.env.API_BASE_URL
  });
});

app.get('/getTagForCoordinates', async (req, res) => {
  const { latitude, longitude } = req.query;
  try {
    const [results] = await pool.execute(
      'SELECT tag FROM polygons WHERE ST_CONTAINS(polygon_geometry, POINT(?, ?))',
      [longitude, latitude]
    );
    res.json({ tag: results[0]?.tag || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/insertPolygon', isAuthenticated, async (req, res) => {
  const { polygon_geometry, color, tag } = req.body;
  try {
    const [results] = await pool.execute(
      'INSERT INTO polygons (polygon_geometry, color, tag) VALUES (ST_GEOMFROMTEXT(?), ?, ?)',
      [polygon_geometry, color, tag]
    );
    res.status(200).json({ insertId: results.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/deletePolygon/:id', isAuthenticated, async (req, res) => {
  try {
    await pool.execute('DELETE FROM polygons WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/updatePolygon/:id', isAuthenticated, async (req, res) => {
  const { polygon_geometry, color, tag } = req.body;
  try {
    await pool.execute(
      'UPDATE polygons SET polygon_geometry = ST_GEOMFROMTEXT(?), color = ?, tag = ? WHERE id = ?',
      [polygon_geometry, color, tag, req.params.id]
    );
    res.status(200).json({ message: 'Polygon updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getPolygons', async (req, res) => {
  try {
    const [results] = await pool.execute(
      'SELECT id, ST_AsText(polygon_geometry) AS polygon_geometry, color, tag FROM polygons'
    );
    res.json({ polygons: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/storeAddress', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).send('Address is required');
  try {
    await pool.query('INSERT INTO addresses (address) VALUES (?)', [address]);
    res.status(200).json({ message: 'Address stored successfully' });
  } catch (err) {
    console.error('Error inserting address:', err);
    res.status(500).send('Failed to store address');
  }
});

app.post('/signup', async (req, res) => {
  const { name, email, phone, address, plan } = req.body;
  if (!name || !email || !phone || !address || !plan) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    await pool.execute(
      'INSERT INTO signups (name, email, phone, address, plan) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, address, plan]
    );

    await transporter.sendMail({
      from: process.env.EMAIL_SENDER,
      to: ['jmiller@nptel.com', 'ppenrose@nptel.com'],
      subject: 'New Fiber Sign-Up!',
      text: `A new user signed up:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nAddress: ${address}\nPlan: ${plan}`
    });

    res.status(200).json({ success: true, message: 'Sign up successful!' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Start the Server ---
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
