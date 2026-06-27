const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '88.200.63.148',
  user: process.env.DB_USER || 'studenti',
  password: process.env.DB_PASSWORD || 'S039C8R7',
  database: process.env.DB_NAME || 'SISIII2026_ 76250114',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
