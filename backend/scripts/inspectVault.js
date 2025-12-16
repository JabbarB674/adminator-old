const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://127.0.0.1:8200';
const VAULT_TOKEN = process.env.VAULT_DEV_TOKEN || process.env.VAULT_TOKEN;

if (!VAULT_TOKEN) {
    console.error('Error: VAULT_DEV_TOKEN or VAULT_TOKEN env var is required.');
    process.exit(1);
}

const client = axios.create({
    baseURL: VAULT_ADDR,
    headers: { 'X-Vault-Token': VAULT_TOKEN }
});

async function listSecrets(path) {
    try {
        // KV v2 list path: /v1/kv/metadata/<path>?list=true
        // Actually standard list is /v1/kv/metadata/<path> with method LIST or GET?
        // The standard API for listing in KV v2 is LIST /v1/kv/metadata/<path>
        // But axios doesn't have 'list' method easily, usually it's a GET with ?list=true query param in some versions, 
        // or just LIST method.
        // Let's try the standard LIST method.
        
        const mountPoint = process.env.VAULT_KV_MOUNT || 'kv';
        const url = `/v1/${mountPoint}/metadata/${path}`;
        
        console.log(`Listing ${url}...`);
        const res = await client({
            method: 'LIST',
            url: url
        });
        
        console.log(`Keys under '${path}':`, res.data.data.keys);
        return res.data.data.keys;
    } catch (err) {
        if (err.response?.status === 404) {
            console.log(`No keys found at ${path}`);
            return [];
        }
        console.error(`Error listing ${path}:`, err.response?.data || err.message);
        return [];
    }
}

async function inspect() {
    console.log(`Inspecting Vault at ${VAULT_ADDR}...`);
    
    const apps = await listSecrets('apps');
    
    if (apps && apps.length > 0) {
        for (const app of apps) {
            // Vault returns keys with trailing slash for "folders"
            const appName = app.replace('/', ''); 
            console.log(`\nChecking app: ${appName}`);
            await listSecrets(`apps/${appName}`);
            
            // Check deeper if needed, e.g. integrations
            await listSecrets(`apps/${appName}/integrations`);
            await listSecrets(`apps/${appName}/integrations/aws`);
        }
    }
}

inspect();
