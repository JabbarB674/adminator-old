const { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { validateAppAccess } = require('../utils/accessControl');
const multer = require('multer');

// System S3 Client for fetching config
const systemS3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin'
    },
    forcePathStyle: true
});
const SYSTEM_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'adminator-storage';

// Helper to get App Config
const getAppConfig = async (appKey) => {
    try {
        const key = `apps/${appKey}/config.json`;
        const command = new GetObjectCommand({ Bucket: SYSTEM_BUCKET_NAME, Key: key });
        const response = await systemS3Client.send(command);
        const str = await response.Body.transformToString();
        return JSON.parse(str);
    } catch (e) {
        console.error('Error loading app config:', e);
        throw new Error('App configuration not found');
    }
};

// Helper to create S3 Client from App Config
const createBucketClient = (bucketConfig) => {
    return new S3Client({
        region: bucketConfig.region || 'us-east-1',
        endpoint: bucketConfig.endpoint,
        credentials: {
            accessKeyId: bucketConfig.accessKeyId,
            secretAccessKey: bucketConfig.secretAccessKey
        },
        forcePathStyle: true // Assume true for compatibility, or make configurable
    });
};

// Middleware for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
exports.uploadMiddleware = upload.single('file');

exports.testConnection = async (req, res) => {
    const { config } = req.body;
    console.log(`[RemoteBucket] Testing connection to ${config.endpoint || 'AWS S3'} bucket: ${config.bucketName} by ${req.user ? req.user.email : 'Unknown'}`);

    try {
        const client = createBucketClient(config);
        const command = new ListObjectsV2Command({
            Bucket: config.bucketName,
            MaxKeys: 10, // Limit results for test
            Delimiter: '/'
        });

        const response = await client.send(command);

        // Format response
        const folders = (response.CommonPrefixes || []).map(p => ({
            name: p.Prefix,
            type: 'folder'
        }));

        const files = (response.Contents || []).map(o => ({
            name: o.Key,
            size: o.Size,
            lastModified: o.LastModified,
            type: 'file'
        }));

        res.json({ 
            success: true, 
            message: 'Connection successful',
            items: [...folders, ...files] 
        });

    } catch (err) {
        console.error('[RemoteBucket] Connection test failed:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.listFiles = async (req, res) => {
    const { appKey } = req.params;
    const prefix = req.query.prefix || '';

    console.log(`[RemoteBucket] Listing files for app '${appKey}' prefix '${prefix}'`);

    if (!validateAppAccess(req, appKey)) {
        return res.status(403).json({ error: 'You do not have permission to access this app.' });
    }

    try {
        const appConfig = await getAppConfig(appKey);
        const bucketSource = appConfig.bucketSource;

        if (!bucketSource || !bucketSource.config) {
            return res.status(404).json({ error: 'No bucket configured for this app.' });
        }

        const client = createBucketClient(bucketSource.config);
        const command = new ListObjectsV2Command({
            Bucket: bucketSource.config.bucketName,
            Prefix: prefix,
            Delimiter: '/'
        });

        const response = await client.send(command);

        // Format response
        const folders = (response.CommonPrefixes || []).map(p => ({
            name: p.Prefix,
            type: 'folder'
        }));

        const files = (response.Contents || []).map(o => ({
            name: o.Key,
            size: o.Size,
            lastModified: o.LastModified,
            type: 'file'
        }));

        res.json({ items: [...folders, ...files] });

    } catch (err) {
        console.error('[RemoteBucket] Error listing files:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.uploadFile = async (req, res) => {
    const { appKey } = req.params;
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[RemoteBucket] Uploading file to app '${appKey}'`);

    if (!validateAppAccess(req, appKey)) {
        return res.status(403).json({ error: 'You do not have permission to access this app.' });
    }

    try {
        const appConfig = await getAppConfig(appKey);
        const bucketSource = appConfig.bucketSource;

        if (!bucketSource || !bucketSource.config) {
            return res.status(404).json({ error: 'No bucket configured for this app.' });
        }

        if (bucketSource.permissions && bucketSource.permissions.write === false) {
            return res.status(403).json({ error: 'Write permission denied for this bucket.' });
        }

        const client = createBucketClient(bucketSource.config);
        
        // Path handling
        let targetPath = req.body.path || '';
        if (targetPath && !targetPath.endsWith('/')) targetPath += '/';
        const key = targetPath + req.file.originalname;

        const command = new PutObjectCommand({
            Bucket: bucketSource.config.bucketName,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });

        await client.send(command);

        res.json({ message: 'File uploaded successfully', key: key });

    } catch (err) {
        console.error('[RemoteBucket] Error uploading file:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteFile = async (req, res) => {
    const { appKey } = req.params;
    const { key } = req.body;

    console.log(`[RemoteBucket] Deleting file '${key}' from app '${appKey}'`);

    if (!validateAppAccess(req, appKey)) {
        return res.status(403).json({ error: 'You do not have permission to access this app.' });
    }

    try {
        const appConfig = await getAppConfig(appKey);
        const bucketSource = appConfig.bucketSource;

        if (!bucketSource || !bucketSource.config) {
            return res.status(404).json({ error: 'No bucket configured for this app.' });
        }

        if (bucketSource.permissions && bucketSource.permissions.delete === false) {
            return res.status(403).json({ error: 'Delete permission denied for this bucket.' });
        }

        const client = createBucketClient(bucketSource.config);
        const command = new DeleteObjectCommand({
            Bucket: bucketSource.config.bucketName,
            Key: key
        });

        await client.send(command);

        res.json({ message: 'File deleted successfully' });

    } catch (err) {
        console.error('[RemoteBucket] Error deleting file:', err);
        res.status(500).json({ error: err.message });
    }
};
