const { pool } = require('../config/pg');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const secretsService = require('../services/secretsService');

exports.getAllApps = async (req, res) => {
    console.log(`[APPS] Fetching all apps for user: ${req.user ? req.user.email : 'Unknown'}`);
    try {
        const query = `
            SELECT app_id, app_key, app_name, description, app_icon, route_path 
            FROM adminator_apps 
            WHERE is_active = true 
            ORDER BY app_name
        `;
        const result = await pool.query(query);
        console.log(`[APPS] Found ${result.rows.length} apps`);
        
        const apps = result.rows.map(row => ({
            appId: row.app_id,
            appKey: row.app_key,
            appName: row.app_name,
            description: row.description,
            appIcon: row.app_icon,
            routePath: row.route_path
        }));

        res.json(apps);
    } catch (error) {
        console.error('[APPS] Error fetching apps:', error);
        res.status(500).json({ error: 'Failed to fetch apps' });
    }
};

// S3 Configuration (Duplicated from uploadController - ideally should be in a config file)
const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY
    },
    forcePathStyle: true
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'adminator-storage';

exports.saveAppConfig = async (req, res) => {
    try {
        const config = req.body;
        let appKey = req.params.appKey || config.meta?.appKey || 'unknown-app';
        
        console.log(`[APPS] Saving config for app: ${appKey} by user: ${req.user ? req.user.email : 'Unknown'}`);

        // Ensure appKey is URL safe for folder names
        appKey = appKey.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();

        // --- SECURE SECRET HANDLING ---
        const secretsToStore = {};

        // 1. Database Password
        if (config.dataSource?.config?.password) {
            const pass = config.dataSource.config.password;
            // Only process if it's not already a placeholder
            if (pass && !pass.startsWith('{{VAULT:')) {
                // Check if user accidentally appended to the placeholder (e.g. "{{VAULT:..}}newpass")
                if (pass.includes('{{VAULT:')) {
                     // This is the bug case: user edited the field but the placeholder was still there?
                     // Or the frontend sent back the placeholder + edits.
                     // We should strip the placeholder part if it exists, or treat as new password.
                     // If the user typed "abc", the frontend sends "abc".
                     // If the user typed nothing, the frontend sends "{{VAULT:...}}".
                     // If the user typed "abc" BUT the frontend logic was flawed, it might send "{{VAULT:...}}abc".
                     
                     // Fix: If it contains {{VAULT:}}, assume it's a corrupted edit and try to extract the new part, 
                     // or just fail safe.
                     // But with the new frontend logic, the user never sees the placeholder in the value, 
                     // so they can't append to it unless they manually crafted the request.
                     
                     // However, to be safe against the "symbols appended" issue:
                     const cleanPass = pass.replace(/{{VAULT:[^}]+}}/g, '');
                     if (cleanPass.length > 0) {
                         secretsToStore['db_password'] = cleanPass;
                         config.dataSource.config.password = '{{VAULT:db_password}}';
                     } else {
                         // It was just the placeholder, do nothing (keep placeholder)
                     }
                } else {
                    secretsToStore['db_password'] = pass;
                    config.dataSource.config.password = '{{VAULT:db_password}}';
                }
            }
        }

        // 2. Bucket Source Credentials
        if (config.bucketSource && config.bucketSource.config) {
            // Access Key
            let ak = config.bucketSource.config.accessKeyId;
            if (ak && !ak.startsWith('{{VAULT:')) {
                if (ak.includes('{{VAULT:')) {
                    ak = ak.replace(/{{VAULT:[^}]+}}/g, '');
                }
                if (ak.length > 0) {
                    secretsToStore['bucket_access_key'] = ak;
                    config.bucketSource.config.accessKeyId = '{{VAULT:bucket_access_key}}';
                }
            }

            // Secret Key
            let sk = config.bucketSource.config.secretAccessKey;
            if (sk && !sk.startsWith('{{VAULT:')) {
                if (sk.includes('{{VAULT:')) {
                    sk = sk.replace(/{{VAULT:[^}]+}}/g, '');
                }
                if (sk.length > 0) {
                    secretsToStore['bucket_secret_key'] = sk;
                    config.bucketSource.config.secretAccessKey = '{{VAULT:bucket_secret_key}}';
                }
            }
        }

        // 3. Integrations (AWS)
        let awsIntegrationSecrets = {};
        if (config.integrations && config.integrations.aws) {
            // Access Key
            let ak = config.integrations.aws.accessKeyId;
            if (ak && !ak.startsWith('{{VAULT:')) {
                if (ak.includes('{{VAULT:')) {
                    ak = ak.replace(/{{VAULT:[^}]+}}/g, '');
                }
                if (ak.length > 0) {
                    secretsToStore['aws_access_key'] = ak;
                    awsIntegrationSecrets['access_key_id'] = ak;
                    config.integrations.aws.accessKeyId = '{{VAULT:aws_access_key}}';
                }
            }

            // Secret Key
            let sk = config.integrations.aws.secretAccessKey;
            if (sk && !sk.startsWith('{{VAULT:')) {
                if (sk.includes('{{VAULT:')) {
                    sk = sk.replace(/{{VAULT:[^}]+}}/g, '');
                }
                if (sk.length > 0) {
                    secretsToStore['aws_secret_key'] = sk;
                    awsIntegrationSecrets['secret_access_key'] = sk;
                    config.integrations.aws.secretAccessKey = '{{VAULT:aws_secret_key}}';
                }
            }

            // Region (Store in Vault too for easier access by signer)
            if (config.integrations.aws.region) {
                secretsToStore['aws_region'] = config.integrations.aws.region;
                awsIntegrationSecrets['region'] = config.integrations.aws.region;
            }

            // Write to Integration Path if we have new secrets
            if (Object.keys(awsIntegrationSecrets).length > 0) {
                 console.log(`[APPS] Syncing AWS secrets to Integration path for ${appKey}`);
                 await secretsService.writeIntegrationSecrets(appKey, 'aws', awsIntegrationSecrets);
            }
        }

        // 4. Write Secrets to Vault if any
        if (Object.keys(secretsToStore).length > 0) {
            console.log(`[APPS] Moving ${Object.keys(secretsToStore).length} secrets to Vault for ${appKey}`);
            await secretsService.writeAppSecrets(appKey, secretsToStore);
        }
        // ------------------------------

        const filename = `apps/${appKey}/config.json`;
        
        // 1. Save to S3
        console.log(`[APPS] Uploading config to S3: ${filename}`);
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: JSON.stringify(config, null, 2),
            ContentType: 'application/json'
        });

        await s3Client.send(command);
        console.log(`[APPS] S3 upload successful`);

        // 2. Clean up legacy file if exists
        try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: `apps/${appKey}.json` }));
        } catch (e) { /* Ignore if not found */ }

        // 3. Update Database
        const appName = config.meta?.displayName || appKey;
        const description = config.meta?.description || '';
        const routePath = `/apps/${appKey}`;

        const upsertQuery = `
            INSERT INTO adminator_apps (app_key, app_name, description, route_path, is_active)
            VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (app_key) 
            DO UPDATE SET 
                app_name = EXCLUDED.app_name,
                description = EXCLUDED.description,
                route_path = EXCLUDED.route_path,
                is_active = true
            RETURNING app_id
        `;

        const upsertResult = await pool.query(upsertQuery, [appKey, appName, description, routePath]);
        const appId = upsertResult.rows[0].app_id;

        // 4. Ensure Administrator Access
        // Find Administrator profile
        const adminProfileQuery = `SELECT profile_id FROM adminator_access_profiles WHERE profile_name = 'Administrator'`;
        const adminProfileResult = await pool.query(adminProfileQuery);
        
        if (adminProfileResult.rows.length > 0) {
            const profileId = adminProfileResult.rows[0].profile_id;
            
            const accessQuery = `
                INSERT INTO adminator_profile_apps (profile_id, app_id)
                VALUES ($1, $2)
                ON CONFLICT (profile_id, app_id) DO NOTHING
            `;
            await pool.query(accessQuery, [profileId, appId]);
        }
        
        res.json({ message: 'Configuration saved and app registered successfully', path: `${BUCKET_NAME}/${filename}` });
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).json({ error: 'Failed to save configuration to S3' });
    }
};

// Helper to stream to string
const streamToString = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

exports.listAppConfigs = async (req, res) => {
    try {
        // List all objects in apps/
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'apps/'
        });
        const response = await s3Client.send(command);
        
        const appsMap = new Map();

        (response.Contents || []).forEach(item => {
            const key = item.Key;
            // Check for new structure: apps/{appKey}/config.json
            const folderMatch = key.match(/^apps\/([^/]+)\/config\.json$/);
            // Check for old structure: apps/{appKey}.json
            const fileMatch = key.match(/^apps\/([^/]+)\.json$/);

            if (folderMatch) {
                appsMap.set(folderMatch[1], { appKey: folderMatch[1], key });
            } else if (fileMatch) {
                // Only add if not already present (prefer folder structure)
                if (!appsMap.has(fileMatch[1])) {
                    appsMap.set(fileMatch[1], { appKey: fileMatch[1], key });
                }
            }
        });

        res.json(Array.from(appsMap.values()));
    } catch (error) {
        console.error('Error listing app configs:', error);
        res.status(500).json({ error: 'Failed to list app configurations' });
    }
};

exports.getAppConfig = async (req, res) => {
    const { appKey } = req.params;
    try {
        // Try new path first
        let key = `apps/${appKey}/config.json`;
        try {
            const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
            const response = await s3Client.send(command);
            const bodyContents = await streamToString(response.Body);
            return res.json(JSON.parse(bodyContents));
        } catch (e) {
            // Fallback to old path
            key = `apps/${appKey}.json`;
            const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
            const response = await s3Client.send(command);
            const bodyContents = await streamToString(response.Body);
            return res.json(JSON.parse(bodyContents));
        }
    } catch (error) {
        console.error('Error getting app config:', error);
        res.status(404).json({ error: 'App configuration not found' });
    }
};

exports.deleteAppConfig = async (req, res) => {
    const { appKey } = req.params;
    try {
        // 1. Delete from S3 (Folder and Legacy File)
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: `apps/${appKey}`
        });
        const listResponse = await s3Client.send(listCommand);
        
        const objectsToDelete = (listResponse.Contents || []).map(item => ({ Key: item.Key }));
        // Add legacy file if it exists (we can just try to delete it)
        objectsToDelete.push({ Key: `apps/${appKey}.json` });

        if (objectsToDelete.length > 0) {
            const deleteCommand = new DeleteObjectsCommand({
                Bucket: BUCKET_NAME,
                Delete: { Objects: objectsToDelete }
            });
            await s3Client.send(deleteCommand);
        }

        // 2. Delete from Database
        // Get App ID first
        const appIdQuery = `SELECT app_id FROM adminator_apps WHERE app_key = $1`;
        const appIdResult = await pool.query(appIdQuery, [appKey]);
        
        if (appIdResult.rows.length > 0) {
            const appId = appIdResult.rows[0].app_id;
            
            // Delete access
            await pool.query(`DELETE FROM adminator_profile_apps WHERE app_id = $1`, [appId]);
            
            // Delete app
            await pool.query(`DELETE FROM adminator_apps WHERE app_id = $1`, [appId]);
        }

        res.json({ message: 'App deleted successfully from S3 and Database' });
    } catch (error) {
        console.error('Error deleting app:', error);
        res.status(500).json({ error: 'Failed to delete app' });
    }
};

exports.uploadAppIcon = async (req, res) => {
    try {
        const { appKey } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileExt = path.extname(req.file.originalname);
        const s3Key = `apps/${appKey}/icon${fileExt}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });

        await s3Client.send(command);

        const updateIconQuery = `UPDATE adminator_apps SET app_icon = $1 WHERE app_key = $2`;
        await pool.query(updateIconQuery, [s3Key, appKey]);

        res.json({ message: 'Icon uploaded successfully', path: s3Key });
    } catch (error) {
        console.error('Error uploading icon:', error);
        res.status(500).json({ error: 'Failed to upload icon' });
    }
};
