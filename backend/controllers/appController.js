const { executeQuery } = require('../config/db');

exports.getAllApps = async (req, res) => {
    try {
        const query = 'SELECT AppId, AppKey, AppName, Description FROM Adminator_Apps WHERE IsActive = 1 ORDER BY AppName';
        const resultSets = await executeQuery(query, []);
        res.json(resultSets[0] || []);
    } catch (error) {
        console.error('Error fetching apps:', error);
        res.status(500).json({ error: 'Failed to fetch apps' });
    }
};

const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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
        
        // Determine filename:
        // 1. If passed in URL params (e.g. PUT /configs/tasty-customers/config), use that.
        // 2. Else use appKey from body (e.g. POST /save-config).
        let filename;
        if (req.params.appKey) {
            filename = `apps/${req.params.appKey}.json`;
        } else {
            const appKey = config.meta?.appKey || 'unknown-app';
            filename = `apps/${appKey}.json`;
        }
        
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: JSON.stringify(config, null, 2),
            ContentType: 'application/json'
        });

        await s3Client.send(command);
        
        res.json({ message: 'Configuration saved successfully to S3', path: `${BUCKET_NAME}/${filename}` });
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
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'apps/'
        });
        const response = await s3Client.send(command);
        
        const apps = (response.Contents || [])
            .filter(item => item.Key.endsWith('.json'))
            .map(item => {
                const key = item.Key;
                const appKey = key.replace('apps/', '').replace('.json', '');
                return { appKey, key };
            });

        res.json(apps);
    } catch (error) {
        console.error('Error listing app configs:', error);
        res.status(500).json({ error: 'Failed to list app configurations' });
    }
};

exports.getAppConfig = async (req, res) => {
    const { appKey } = req.params;
    try {
        const key = `apps/${appKey}.json`;
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        
        const response = await s3Client.send(command);
        const bodyContents = await streamToString(response.Body);
        const config = JSON.parse(bodyContents);
        
        res.json(config);
    } catch (error) {
        console.error('Error getting app config:', error);
        res.status(404).json({ error: 'App configuration not found' });
    }
};

exports.deleteAppConfig = async (req, res) => {
    const { appKey } = req.params;
    try {
        const key = `apps/${appKey}.json`;
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        
        await s3Client.send(command);
        res.json({ message: 'App configuration deleted successfully' });
    } catch (error) {
        console.error('Error deleting app config:', error);
        res.status(500).json({ error: 'Failed to delete app configuration' });
    }
};
