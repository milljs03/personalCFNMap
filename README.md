#CFN Map Query Application 

##Version 1.0

##Step by Step deployment 

1. **Clone the repository**
   git clone https://github.com/seet-lab/CFN_Map_Query_Spring_2024.git

2. **Install depedencies**
    npm install express
    npm install mysql2
    npm install cors

In folder terminal type: node server.js
   The below message should appear:

   Server is running on port 3000

3. **In mySQL when database mydb is set up, use the below queries to set up appropiate tables**

CREATE TABLE IF NOT EXISTS polygons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    polygon_geometry GEOMETRY NOT NULL,
    color VARCHAR(255) NOT NULL,
    tag VARCHAR(50) NOT NULL
);

CREATE TABLE address_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    tag VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

4. **Update information**
Where the below code segment is found in classes server.js and polygonentry
   const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'Giant$win2024!',
    database: 'mydb'
});


 Download Live Server extension on visual studio or a similar extension on IDE of choice
