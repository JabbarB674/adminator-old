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

async function writeSecret(path, data) {
    try {
        // KV v2 write path: /v1/kv/data/<path>
        // We assume mount point is 'kv'
        await client.post(`/v1/kv/data/${path}`, { data });
        console.log(`✅ Successfully wrote to ${path}`);
    } catch (err) {
        console.error(`❌ Failed to write to ${path}:`, err.response?.data || err.message);
    }
}

async function seedVault() {
    console.log(`Seeding Vault at ${VAULT_ADDR}...`);

    // 1. System Config (Sensitive Only)
    // Best Practice: Keep Vault clean. Only store actual secrets here.
    // Non-sensitive config (endpoints, bucket names) should stay in .env or K8s ConfigMaps.
    const systemConfig = {
        // CRITICAL SECRETS
        DB_PASSWORD: process.env.DB_PASSWORD,
        JWT_SECRET: process.env.JWT_SECRET,
        S3_ACCESS_KEY: process.env.S3_ACCESS_KEY, // Access Keys are credentials, so we keep them here
        S3_SECRET_KEY: process.env.S3_SECRET_KEY,

        // OPTIONAL: Uncomment if you want these in Vault too (Single Source of Truth)
        // DB_SERVER: process.env.DB_SERVER,
        // DB_USER: process.env.DB_USER,
        // DB_NAME: process.env.DB_NAME,
        // S3_ENDPOINT: process.env.S3_ENDPOINT,
        // S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
        // S3_REGION: process.env.S3_REGION
    };
    
    // Filter out undefined values to avoid sending empty data
    Object.keys(systemConfig).forEach(key => systemConfig[key] === undefined && delete systemConfig[key]);

    await writeSecret('adminator/config', systemConfig);

    // 2. App Integrations (AWS Base Identity)
    // This is for the 'tasty-customers' app (App ID: tasty-customers)
    const tastyAppAws = {
        access_key_id: process.env.AWS_ACCESS_KEY_ID,
        secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
    };

    if (tastyAppAws.access_key_id && tastyAppAws.secret_access_key) {
        await writeSecret('apps/tasty-customers/integrations/aws/base', tastyAppAws);
    } else {
        console.warn('⚠️ Skipping AWS seeding: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY missing in .env');
    }

    console.log('Vault seeding complete.');
}

seedVault();
