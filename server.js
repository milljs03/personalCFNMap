// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const app = express();
const port = 3000;
const nodemailer = require('nodemailer');

// --- NEW IMPORTS FOR AUTHENTICATION ---
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

// Load environment variables from a .env file
dotenv.config();

const rateLimit = require('express-rate-limit');
app.use('/signup', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'API_KEY', 'API_BASE_URL', 'SESSION_SECRET'];
for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        console.error(`Error: Missing required environment variable '${varName}'.`);
        console.error("Please ensure you have a complete .env file with all necessary values.");
        process.exit(1); // Exit the application with an error code
    }
}

// Middleware to parse JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Important for Passport forms

const allowedOrigins = [
    'http://127.0.0.1:3000'    // For accessing the app directly
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if the origin is in our list of allowed origins
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// Serve static files from the project root
app.use(express.static(__dirname));

// MySQL database connection pool setup
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise(); // Use the promise-based API for async/await

// --- AUTHENTICATION SETUP ---
app.use(session({
    secret: process.env.SESSION_SECRET, // Make sure to add SESSION_SECRET to your .env file
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if you are using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy for username/password authentication
passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) {
            return done(null, false, { message: 'Incorrect username.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Serialize user to store in session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM admins WHERE id = ?', [id]);
        done(null, rows[0]);
    } catch (err) {
        done(err);
    }
});

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}
// --- END AUTHENTICATION SETUP ---

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_SENDER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// --- ROUTES ---

// Login page route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'mapfront', 'pages', 'login.html'));
});

// Handle login form submission
app.post('/login', passport.authenticate('local', {
    successRedirect: '/map', // Redirect to the map page on successful login
    failureRedirect: '/login', // Redirect back to the login page on failure
    failureFlash: false // You can enable this to show flash messages
}));

// Logout route - Changed to POST
app.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Protected route for the map page
app.get('/map', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'mapfront', 'pages', 'map.html'));
});

// Handle GET request to the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'webfront', 'pages', 'index.html'));
});

// It provides both the Google API Key and the server's own base URL
app.get('/api/config', (req, res) => {
    res.json({
        apiKey: process.env.API_KEY,
        apiUrl: process.env.API_BASE_URL
    });
});

// Get the tag for a specific set of coordinates
app.get('/getTagForCoordinates', async (req, res) => {
    const { latitude, longitude } = req.query;
    const query = `SELECT tag FROM mydb.polygons WHERE ST_CONTAINS(polygon_geometry, POINT(?, ?))`;
    try {
        const [results] = await pool.execute(query, [longitude, latitude]);
        if (results.length > 0) {
            const tag = results[0].tag;
            console.log(`Tag for coordinates: ${latitude}, ${longitude} is ${tag}`);
            res.json({ tag: tag });
        } else {
            console.log('Point is not inside any polygon.');
            res.json({ tag: null });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Insert a polygon - PROTECTED
app.post('/insertPolygon', isAuthenticated, async (req, res) => {
    const { polygon_geometry, color, tag } = req.body;
    const query = `INSERT INTO polygons (polygon_geometry, color, tag) VALUES (ST_GEOMFROMTEXT(?), ?, ?)`;
    try {
        const [results] = await pool.execute(query, [polygon_geometry, color, tag]);
        const insertId = results.insertId;
        console.log(`Polygon inserted successfully with id: ${insertId}`);
        res.status(200).json({ insertId: insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete a polygon by ID - PROTECTED
app.delete('/deletePolygon/:id', isAuthenticated, async (req, res) => {
    const polygonId = req.params.id;
    const query = `DELETE FROM polygons WHERE id = ?`;
    try {
        await pool.execute(query, [polygonId]);
        console.log(`Polygon deleted successfully`);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update a polygon by ID - PROTECTED
app.put('/updatePolygon/:id', isAuthenticated, async (req, res) => {
    const polygonId = req.params.id;
    const { polygon_geometry, color, tag } = req.body;
    const query = `UPDATE polygons SET polygon_geometry = ST_GEOMFROMTEXT(?), color = ?, tag = ? WHERE id = ?`;
    try {
        await pool.execute(query, [polygon_geometry, color, tag, polygonId]);
        console.log(`Polygon updated successfully: ${polygonId}`);
        res.status(200).json({ message: 'Polygon updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Get all polygons - This can remain public if you want to show them on a public map
app.get('/getPolygons', async (req, res) => {
    const query = `SELECT id, ST_AsText(polygon_geometry) AS polygon_geometry, color, tag FROM polygons`;
    try {
        const [results] = await pool.execute(query);
        const polygons = results.map(row => ({
            id: row.id,
            polygon_geometry: row.polygon_geometry,
            color: row.color,
            tag: row.tag,
        }));
        res.json({ polygons });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/storeAddress', async (req, res) => {
    const address = req.body.address;
    console.log('Received address:', address);
    if (!address) {
        return res.status(400).send('Address is required');
    }
    const query = 'INSERT INTO addresses (address) VALUES (?)';
    try {
        await pool.query(query, [address]);
        res.status(200).json({ message: 'Address stored successfully' });
    } catch (err) {
        console.error('Error inserting address:', err);
        res.status(500).send('Failed to store address');
    }
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
    const { name, email, phone, address, plan } = req.body;
    if (!name || !email || !phone || !address || !plan) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const insertSignupQuery = 'INSERT INTO signups (name, email, phone, address, plan) VALUES (?, ?, ?, ?, ?)';
    try {
        await pool.execute(insertSignupQuery, [name, email, phone, address, plan]);

        const mailOptions = {
            from: process.env.EMAIL_SENDER,
            to: ['jmiller@nptel.com', 'ppenrose@nptel.com'],
            subject: 'New Fiber Sign-Up!',
            text: `A new user signed up:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nAddress: ${address}\nPlan: ${plan}`
        };
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        res.status(200).json({ success: true, message: 'Sign up successful!' });
    } catch (err) {
        console.error('Error during signup process:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
