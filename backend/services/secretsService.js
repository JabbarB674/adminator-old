const vaultService = require('./vaultService');

class SecretsService {
    
    /**
     * Retrieves the AWS Base Identity credentials for an app.
     * Falls back to environment variables if configured (Dev Mode).
     * 
     * @param {string} appId 
     * @returns {Promise<{accessKeyId: string, secretAccessKey: string, region: string}>}
     */
    async getAwsBaseCreds(appId) {
        // 1. Try Vault First
        try {
            const secretPath = `apps/${appId}/integrations/aws/base`;
            const secret = await vaultService.readSecret(secretPath);
            
            if (secret && secret.access_key_id && secret.secret_access_key) {
                return {
                    accessKeyId: secret.access_key_id,
                    secretAccessKey: secret.secret_access_key,
                    region: secret.region || process.env.AWS_REGION || 'us-east-1'
                };
            }
        } catch (err) {
            console.warn(`[Secrets] Failed to fetch AWS base creds from Vault for ${appId}: ${err.message}`);
        }

        // 2. Fallback to Env (Dev Mode Only)
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Secrets] Using ENV fallback for AWS Creds (App: ${appId})`);
            return {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION || 'us-east-1'
            };
        }

        throw new Error(`No AWS Credentials found for app ${appId}`);
    }

    /**
     * Retrieves generic app secrets.
     * @param {string} appId 
     * @param {string} key 
     */
    async getAppSecret(appId, key) {
        const secretPath = `apps/${appId}/secrets`;
        const secret = await vaultService.readSecret(secretPath);
        return secret ? secret[key] : null;
    }

    /**
     * Loads system-wide configuration from Vault and injects into process.env.
     * Falls back to existing process.env values if Vault fails or key is missing.
     */
    async loadSystemConfig() {
        console.log('[Secrets] Loading system configuration...');
        try {
            // Path: kv/data/adminator/config
            const secretPath = 'adminator/config'; 
            const secrets = await vaultService.readSecret(secretPath);

            if (secrets) {
                const keysToSync = [
                    'DB_SERVER', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
                    'JWT_SECRET',
                    'S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET_NAME', 'S3_REGION'
                ];

                let loadedCount = 0;
                keysToSync.forEach(key => {
                    if (secrets[key]) {
                        // Overwrite process.env with Vault value
                        process.env[key] = secrets[key];
                        loadedCount++;
                    } else {
                        if (process.env[key]) {
                            console.warn(`[Secrets] Key '${key}' missing in Vault, using local env fallback.`);
                        } else {
                            console.error(`[Secrets] CRITICAL: Key '${key}' missing in Vault AND local env!`);
                        }
                    }
                });
                console.log(`[Secrets] Successfully loaded ${loadedCount} secrets from Vault.`);
            } else {
                console.warn('[Secrets] No system config found in Vault (adminator/config). Using local env.');
            }
        } catch (err) {
            console.error(`[Secrets] Failed to load system config from Vault: ${err.message}. Using local env.`);
        }
    }
}

module.exports = new SecretsService();
