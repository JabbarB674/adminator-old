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

const MOUNT_POINT = process.env.VAULT_KV_MOUNT || 'kv';

async function listKeys(path) {
    try {
        // Ensure path ends with / for listing if it's not empty
        const listPath = path && !path.endsWith('/') ? `${path}/` : path;
        const url = `/v1/${MOUNT_POINT}/metadata/${listPath}`;
        
        const res = await client({ method: 'LIST', url });
        return res.data.data.keys || [];
    } catch (err) {
        if (err.response?.status === 404) return [];
        console.error(`Error listing ${path}:`, err.message);
        return [];
    }
}

async function deleteSecret(path) {
    try {
        console.log(`🔥 Deleting: ${path}`);
        await client.delete(`/v1/${MOUNT_POINT}/metadata/${path}`);
    } catch (err) {
        console.error(`❌ Failed to delete ${path}:`, err.message);
    }
}

async function recursiveDelete(currentPath) {
    const keys = await listKeys(currentPath);
    
    if (keys.length === 0) {
        // It might be a leaf node (secret) or empty.
        // If we were called, we should try to delete it just in case it's a leaf.
        // But listKeys on a leaf usually returns 404 or error in some versions, 
        // or we rely on the caller to know it's a leaf.
        // Strategy: Try to delete it as a metadata path.
        await deleteSecret(currentPath);
        return;
    }

    for (const key of keys) {
        const fullPath = currentPath ? `${currentPath}/${key}` : key;
        if (key.endsWith('/')) {
            // It's a folder, recurse (remove trailing slash for recursion)
            await recursiveDelete(fullPath.slice(0, -1));
        } else {
            // It's a secret, delete it
            await deleteSecret(fullPath);
        }
    }
}

async function cleanup() {
    console.log(`Scanning Vault at ${VAULT_ADDR} for 'apps/tasty-customers'...`);
    
    // Target specifically the tasty-customers folder
    await recursiveDelete('apps/tasty-customers');
    
    console.log('✨ Recursive cleanup complete.');
}

cleanup();
