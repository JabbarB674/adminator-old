const axios = require('axios');
const fs = require('fs');

class VaultService {
    constructor() {
        this.vaultAddr = process.env.VAULT_ADDR || 'http://127.0.0.1:8200';
        this.vaultToken = process.env.VAULT_TOKEN || null; // For local dev override
        this.role = process.env.VAULT_ROLE || 'adminator';
        this.jwtPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
        this.tokenExpiry = 0;
    }

    /**
     * Initializes the Vault client.
     * In K8s: Logs in using the Service Account Token.
     * In Dev: Uses VAULT_TOKEN env var or attempts K8s login if token file exists (e.g. projected volume).
     */
    async init() {
        if (this.vaultToken && !this.isTokenExpired()) {
            console.log('[Vault] Using existing/env token');
            return;
        }

        if (process.env.NODE_ENV === 'development' && process.env.VAULT_DEV_TOKEN) {
             console.log('[Vault] Using Dev Token from Env');
             this.vaultToken = process.env.VAULT_DEV_TOKEN;
             // Assume dev token is valid for a while or infinite
             this.tokenExpiry = Date.now() + 3600000; 
             return;
        }

        // Try Kubernetes Auth
        try {
            let jwt;
            if (process.env.K8S_SA_TOKEN) {
                // Allow manual injection of SA token for local testing against remote Vault
                jwt = process.env.K8S_SA_TOKEN;
                console.log('[Vault] Using injected K8S_SA_TOKEN');
            } else if (fs.existsSync(this.jwtPath)) {
                jwt = fs.readFileSync(this.jwtPath, 'utf8');
                console.log('[Vault] Found K8s Service Account Token');
            } else {
                throw new Error('No Vault Token and no K8s Service Account Token found.');
            }

            await this.loginKubernetes(jwt);

        } catch (err) {
            console.error('[Vault] Initialization failed:', err.message);
            throw err;
        }
    }

    async loginKubernetes(jwt) {
        console.log(`[Vault] Attempting Kubernetes Auth login (Role: ${this.role})...`);
        try {
            const res = await axios.post(`${this.vaultAddr}/v1/auth/kubernetes/login`, {
                role: this.role,
                jwt: jwt
            });

            const auth = res.data.auth;
            this.vaultToken = auth.client_token;
            // Set expiry to 90% of the lease duration to trigger refresh early
            this.tokenExpiry = Date.now() + (auth.lease_duration * 1000 * 0.9);
            
            console.log(`[Vault] Login successful. Token policies: ${auth.policies.join(', ')}`);
        } catch (err) {
            console.error('[Vault] Kubernetes login failed:', err.response?.data || err.message);
            throw new Error('Vault Kubernetes Auth failed');
        }
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiry;
    }

    async getClient() {
        if (!this.vaultToken || this.isTokenExpired()) {
            await this.init();
        }
        return axios.create({
            baseURL: this.vaultAddr,
            headers: { 'X-Vault-Token': this.vaultToken }
        });
    }

    /**
     * Reads a secret from KV v2 mount.
     * @param {string} path - Path after kv/data/, e.g., "apps/my-app/config"
     */
    async readSecret(path) {
        const client = await this.getClient();
        try {
            // KV v2 read path is /v1/kv/data/<path>
            // We assume the mount point is 'kv'
            const mountPoint = process.env.VAULT_KV_MOUNT || 'kv';
            const fullPath = `/v1/${mountPoint}/data/${path}`;
            
            const res = await client.get(fullPath);
            return res.data.data.data; // KV v2 structure: response.data.data
        } catch (err) {
            if (err.response?.status === 404) {
                console.warn(`[Vault] Secret not found: ${path}`);
                return null;
            }
            console.error(`[Vault] Error reading ${path}:`, err.message);
            throw err;
        }
    }
}

// Singleton instance
const vaultService = new VaultService();
module.exports = vaultService;
