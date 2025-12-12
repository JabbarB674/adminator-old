const { executeQuery } = require('../config/db');
const { TYPES } = require('tedious');

exports.getAllApps = async (req, res) => {
    console.log(`[APPS] Fetching all apps for user: ${req.user ? req.user.email : 'Unknown'}`);
    try {
        const query = 'SELECT AppId, AppKey, AppName, Description, AppIcon, RoutePath FROM Adminator_Apps WHERE IsActive = 1 ORDER BY AppName';
        const resultSets = await executeQuery(query, []);
        console.log(`[APPS] Found ${resultSets[0] ? resultSets[0].length : 0} apps`);
        res.json(resultSets[0] || []);
    } catch (error) {
        console.error('[APPS] Error fetching apps:', error);
        res.status(500).json({ error: 'Failed to fetch apps' });
    }
};

const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// S3 Configuration (Duplicated from uploadController - ideally should be in a config file)
const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin'
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
            MERGE Adminator_Apps AS target
            USING (SELECT @AppKey AS AppKey) AS source
            ON (target.AppKey = source.AppKey)
            WHEN MATCHED THEN
                UPDATE SET AppName = @AppName, Description = @Description, RoutePath = @RoutePath, IsActive = 1
            WHEN NOT MATCHED THEN
                INSERT (AppKey, AppName, Description, RoutePath, IsActive)
                VALUES (@AppKey, @AppName, @Description, @RoutePath, 1);
        `;

        await executeQuery(upsertQuery, [
            { name: 'AppKey', type: TYPES.NVarChar, value: appKey },
            { name: 'AppName', type: TYPES.NVarChar, value: appName },
            { name: 'Description', type: TYPES.NVarChar, value: description },
            { name: 'RoutePath', type: TYPES.NVarChar, value: routePath }
        ]);

        // 4. Ensure Administrator Access
        const accessQuery = `
            DECLARE @AppId INT = (SELECT AppId FROM Adminator_Apps WHERE AppKey = @AppKey);
            DECLARE @ProfileId INT = (SELECT ProfileId FROM Adminator_AccessProfiles WHERE ProfileName = 'Administrator');
            
            IF @AppId IS NOT NULL AND @ProfileId IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM Adminator_ProfileAppAccess WHERE ProfileId = @ProfileId AND AppId = @AppId)
                BEGIN
                    INSERT INTO Adminator_ProfileAppAccess (ProfileId, AppId) VALUES (@ProfileId, @AppId);
                END
            END
        `;
        await executeQuery(accessQuery, [
            { name: 'AppKey', type: TYPES.NVarChar, value: appKey }
        ]);
        
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
        const deleteQuery = `
            DECLARE @AppId INT = (SELECT AppId FROM Adminator_Apps WHERE AppKey = @AppKey);
            
            IF @AppId IS NOT NULL
            BEGIN
                DELETE FROM Adminator_ProfileAppAccess WHERE AppId = @AppId;
                DELETE FROM Adminator_Apps WHERE AppId = @AppId;
            END
        `;
        
        await executeQuery(deleteQuery, [
            { name: 'AppKey', type: TYPES.NVarChar, value: appKey }
        ]);

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

        const updateIconQuery = `UPDATE Adminator_Apps SET AppIcon = @AppIcon WHERE AppKey = @AppKey`;
        await executeQuery(updateIconQuery, [
            { name: 'AppIcon', type: TYPES.NVarChar, value: s3Key },
            { name: 'AppKey', type: TYPES.NVarChar, value: appKey }
        ]);

        res.json({ message: 'Icon uploaded successfully', path: s3Key });
    } catch (error) {
        console.error('Error uploading icon:', error);
        res.status(500).json({ error: 'Failed to upload icon' });
    }
};
