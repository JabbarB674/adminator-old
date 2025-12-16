const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://127.0.0.1:8200';
// We need the ROOT token to update policies, not the K8s SA token
const VAULT_TOKEN = process.env.VAULT_DEV_TOKEN;

if (!VAULT_TOKEN) {
    console.error('Error: VAULT_DEV_TOKEN (Root Token) is required in .env to update policies.');
    process.exit(1);
}

const client = axios.create({
    baseURL: VAULT_ADDR,
    headers: { 'X-Vault-Token': VAULT_TOKEN }
});

const policyName = 'adminator';

const policyRules = `
# Allow App Secrets (Existing)
path "kv/data/apps/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "kv/metadata/apps/*" {
  capabilities = ["list", "read"]
}

# Allow System Config (NEW)
path "kv/data/adminator/*" {
  capabilities = ["read", "list"]
}
path "kv/metadata/adminator/*" {
  capabilities = ["list", "read"]
}
`;

async function updatePolicy() {
    console.log(`Updating Vault Policy '${policyName}' at ${VAULT_ADDR}...`);
    
    try {
        await client.put(`/v1/sys/policy/${policyName}`, {
            policy: policyRules
        });
        console.log(`✅ Successfully updated policy '${policyName}'.`);
        console.log('The Adminator backend should now be able to read adminator/config.');
    } catch (err) {
        console.error(`❌ Failed to update policy:`, err.response?.data || err.message);
    }
}

updatePolicy();
