const mysql = require('mysql2');


// Create a connection pool 
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'Gas!Lighter2',
    database: 'mydb',
    connectionLimit: 50, // Adjust as needed based on your server capacity
});

// Wrap the insertPolygon function in a promise for better async handling
function insertPolygon(polygonGeometry, color, tag) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO polygons (polygon_geometry, color, tag)
            VALUES (
                ST_GEOMFROMTEXT(?),
                ?,
                ?
            )
        `;

        // Acquire a connection from the pool
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err);
                return;
            }

            // Perform the query
            connection.query(query, [polygonGeometry, color, tag], (err, results) => {
                // Release the connection back to the pool
                connection.release();

                if (err) {
                    reject(err);
                } else {
                    console.log(`Polygon inserted successfully with id: ${results.insertId}`);
                    resolve(results);
                }
            });
        });
    });
}

// Example: Insert a polygon into the table
insertPolygon(
    'POLYGON((-85.976 41.847, -85.621 41.847, -85.621 41.554, -85.976 41.554, -85.976 41.847))',
    '#BDB76B', // Developing color
    'Developing'
)
    .then(() => {
        // Do something after the polygon is inserted, if needed
        console.log('Polygon insertion completed.');
    })
    .catch((err) => {
        console.error('Error inserting polygon:', err);
    });