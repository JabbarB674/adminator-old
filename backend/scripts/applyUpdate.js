require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const secretsService = require('../services/secretsService');

async function applyUpdate() {
    console.log('[Update] Starting schema update...');

    // Ensure secrets are loaded
    await secretsService.loadSystemConfig();

    const client = new Client({
        host: process.env.DB_SERVER,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: 5432,
    });

    try {
        await client.connect();
        console.log('[Update] Connected to Postgres.');

        const sqlPath = path.join(__dirname, '../../database/postgres/02_add_route_path.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('[Update] Applying 02_add_route_path.sql...');
        await client.query(sql);
        
        console.log('[Update] ✅ Update successful.');
    } catch (err) {
        console.error('[Update] ❌ Update failed:', err.message);
    } finally {
        await client.end();
    }
}

applyUpdate();
