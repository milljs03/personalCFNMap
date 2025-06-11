// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
const port = 3000;

// Load environment variables from a .env file
dotenv.config();

const googleApiKey = process.env.GOOGLE_API_KEY;
// Middleware to parse JSON requests
app.use(express.json());

// CORS configuration to allow requests from communityfiber.net
app.use(cors({
    origin: 'https://communityfiber.net',
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type,Authorization'
}));

// MySQL database connection pool setup
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mydb'
});

// Handle GET request to the root
app.get('/', (req, res) => {
    res.send('Hello, this is your Express server.');
});

// Save address, tag, latitude, and longitude to the database
app.post('/saveAddressTag', (req, res) => {
    const { address, tag, latitude, longitude } = req.body;

    const query = `
        INSERT INTO address_tags (address, tag, latitude, longitude)
        VALUES (?, ?, ?, ?)
    `;

    pool.execute(query, [address, tag, latitude, longitude], (err, results) => {
        if (err) {
            console.error('Error saving address tag to database:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            console.log('Address tag saved to database');
            res.status(200).json({ success: true });
        }
    });
});

// Get the tag for a specific set of coordinates
app.get('/getTagForCoordinates', (req, res) => {
    const { latitude, longitude } = req.query;

    const query = `
        SELECT tag
        FROM mydb.polygons
        WHERE ST_CONTAINS(polygon_geometry, POINT(?, ?))
    `;

    pool.execute(query, [longitude, latitude], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            if (results.length > 0) {
                const tag = results[0].tag;
                console.log(`Tag for coordinates: ${latitude}, ${longitude} is ${tag}`);
                res.json({ tag: tag });
            } else {
                console.log('Point is not inside any polygon.');
                res.json({ tag: null });
            }
        }
    });
});

// Insert a polygon
app.post('/insertPolygon', (req, res) => {
    const { polygon_geometry, color, tag } = req.body;

    const query = `
        INSERT INTO polygons (polygon_geometry, color, tag)
        VALUES (
            ST_GEOMFROMTEXT(?),
            ?,
            ?
        )
    `;

    pool.execute(query, [polygon_geometry, color, tag], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            const insertId = results.insertId;

            if (insertId !== undefined) {
                console.log(`Polygon inserted successfully with id: ${insertId}`);
                res.status(200).json({ insertId: insertId });
            } else {
                pool.query('SELECT LAST_INSERT_ID() as lastInsertId', (err, result) => {
                    if (err) {
                        console.error(err);
                        res.status(500).json({ error: 'Internal Server Error' });
                    } else {
                        const lastInsertId = result[0].lastInsertId;
                        console.log(`Polygon inserted successfully with id: ${lastInsertId}`);
                        res.status(200).json({ insertId: lastInsertId });
                    }
                });
            }
        }
    });
});

// Delete a polygon by ID
app.delete('/deletePolygon/:id', (req, res) => {
    const polygonId = req.params.id;

    const query = `
        DELETE FROM polygons
        WHERE id = ?
    `;

    pool.execute(query, [polygonId], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            console.log(`Polygon deleted successfully`);
            res.status(200).json({ success: true });
        }
    });
});

// Update a polygon by ID
app.put('/updatePolygon/:id', (req, res) => {
    const polygonId = req.params.id;
    const { polygon_geometry, color, tag } = req.body;

    const query = `
        UPDATE polygons
        SET polygon_geometry = ST_GEOMFROMTEXT(?), color = ?, tag = ?
        WHERE id = ?
    `;

    pool.execute(query, [polygon_geometry, color, tag, polygonId], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            console.log(`Polygon updated successfully: ${polygonId}`);
            res.status(200).json({ message: 'Polygon updated successfully' });
        }
    });
});

// Get all polygons
app.get('/getPolygons', (req, res) => {
    const query = `
        SELECT id, ST_AsText(polygon_geometry) AS polygon_geometry, color, tag
        FROM polygons
    `;

    pool.execute(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            const polygons = results.map(row => ({
                id: row.id,
                polygon_geometry: row.polygon_geometry,
                color: row.color,
                tag: row.tag,
            }));
            res.json({ polygons });
        }
    });
});

// Handle form submission
app.post('/submitForm', (req, res) => {
    const { name, email, address } = req.body;

    if (!name || !email || !address) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const query = 'INSERT INTO addresses (address) VALUES (?)';
    pool.execute(query, [address], (err, result) => {
        if (err) {
            console.error('Error inserting address:', err);
            return res.status(500).send('Failed to store address');
        }
        res.status(200).json({ message: 'Address stored successfully' });
    });
});

// Handle signup form submission
app.post('/signup', (req, res) => {
    const { name, email, phone, address, plan } = req.body;
    
    if (!name || !email || !phone || !address || !plan) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const insertSignupQuery = 'INSERT INTO signups (name, email, phone, address, plan) VALUES (?, ?, ?, ?, ?)';
    pool.execute(insertSignupQuery, [name, email, phone, address, plan], (err, results) => {
        if (err) {
            console.error('Error saving signup data:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        console.log('Signup saved successfully');
        res.status(200).json({ success: true, message: 'Sign up successful!' });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
