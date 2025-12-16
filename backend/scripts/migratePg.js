require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const secretsService = require('../services/secretsService');

async function runMigrations() {
    console.log('[Migration] Starting Postgres migration...');

    // Ensure secrets are loaded
    await secretsService.loadSystemConfig();

    const client = new Client({
        host: process.env.DB_SERVER,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: 5432, // Default PG port
    });

    try {
        await client.connect();
        console.log('[Migration] Connected to Postgres.');

        const sqlPath = path.join(__dirname, '../../database/postgres/01_init_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('[Migration] Applying 01_init_schema.sql...');
        await client.query(sql);
        
        console.log('[Migration] ✅ Migration successful.');
    } catch (err) {
        console.error('[Migration] ❌ Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

runMigrations();
