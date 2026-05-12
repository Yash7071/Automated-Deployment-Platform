const { Pool } = require('pg');
require('dotenv').config();

// The Pool manages multiple connections to PostgreSQL efficiently
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Simple log to confirm connection when the server starts
pool.on('connect', () => {
    console.log(' PostgreSQL connected successfully');
});

pool.on('error', (err) => {
    console.error(' Unexpected database error', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};