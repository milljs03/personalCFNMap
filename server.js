// server.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');  // Add this line
const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors());  // Add this line to enable CORS

app.get('/', (req, res) => {
    res.send('Hello, this is your Express server.');
});


// Initialize MySQL connection pool
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'Gas!Lighter2',
    database: 'mydb'
});
// Import necessary modules and setup your server

// Endpoint to save address, tag, latitude, and longitude to the database
app.post('/saveAddressTag', (req, res) => {
    const { address, tag, latitude, longitude } = req.body;

    const query = `
        INSERT INTO address_tags (address, tag, latitude, longitude)
        VALUES (?, ?, ?, ?)
    `;

    pool.query(query, [address, tag, latitude, longitude], (err, results) => {
        if (err) {
            console.error('Error saving address tag to database:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            console.log('Address tag saved to database');
            res.status(200).json({ success: true });
        }
    });
});


// Add a new endpoint to get the tag for a specific set of coordinates
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
            // Check if any polygon contains the point
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


app.get('/checkPointInPolygon', (req, res) => {
    const { latitude, longitude } = req.query;

    // Use your existing checkPointInPolygon function here
    checkPointInPolygon(parseFloat(latitude), parseFloat(longitude), res);
    function checkPointInPolygon(latitude, longitude) {
        const query = `
            SELECT tag
            FROM mydb.polygons
            WHERE ST_CONTAINS(polygon_geometry, POINT(?, ?))
        `;
    
        pool.query(query, [longitude, latitude], (err, results) => {
            if (err) {
                throw err;
            }
    
            // Check if any polygon contains the point
            if (results.length > 0) {
                const tag = results[0].tag;
                console.log(`Point is inside the polygon with tag: ${tag}`);
            } else {
                console.log('Point is not inside any polygon.');
            }
    
            // Close the connection to the MySQL database
            
        });
    }

});

// Continue with the rest of your server.js

// Endpoint to insert a polygon
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

    pool.query(query, [polygon_geometry, color, tag], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            const insertId = results.insertId;

            console.log('Insert result:', results); // Log the entire results object

            if (insertId !== undefined) {
                console.log(`Polygon inserted successfully with id: ${insertId}`);
                res.status(200).json({ insertId: insertId });
            } else {
                // If insertId is undefined, fetch the last inserted ID separately
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

app.delete('/deletePolygon/:id', (req, res) => {
    const polygonId = req.params.id;

    const query = `
        DELETE FROM polygons
        WHERE id = ?
    `;

    pool.query(query, [polygonId], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            console.log(`Polygon deleted successfully`);
            res.status(200).json({ success: true });
        }
    });
});

app.put('/updatePolygon/:id', (req, res) => {
    const polygonId = req.params.id;
    const { polygon_geometry, color, tag } = req.body;

    const query = `
        UPDATE polygons
        SET polygon_geometry = ST_GEOMFROMTEXT(?), color = ?, tag = ?
        WHERE id = ?
    `;

    pool.query(query, [polygon_geometry, color, tag, polygonId], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            console.log(`Polygon updated successfully: ${polygonId}`);
            res.status(200).json({ message: 'Polygon updated successfully' });
        }
    });
});

app.get('/getPolygons', (req, res) => {
    const query = `
        SELECT id, ST_AsText(polygon_geometry) AS polygon_geometry, color, tag
        FROM polygons
    `;

    pool.query(query, (err, results) => {
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
            console.log("sending over data..")
            res.json({ polygons });
        }
    });
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});