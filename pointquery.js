const mysql = require('mysql2');

const pool = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'jxf9dvlt',
    database: 'mydb'
});

pool.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

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
        pool.end();
    });
}

// Example: Call the function with specific point coordinates
checkPointInPolygon(41.5816015, -85.8367576);
