const db = require('./db');

const initDatabase = async () => {
    try {
        console.log("  Starting database initialization...");

        // 1. Create Users Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log(" Table 'users' is ready.");

        // 2. Create Deployments Table
        // This links each deployment to a specific user via user_id
        await db.query(`
            CREATE TABLE IF NOT EXISTS deployments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                repo_url TEXT NOT NULL,
                port INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'deployments' is ready.");

        console.log(" Database initialization complete!");
        process.exit(0);
    } catch (err) {
        console.error(" Initialization failed:", err);
        process.exit(1);
    }
};

initDatabase();