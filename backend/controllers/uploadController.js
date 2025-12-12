const { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');

// S3 Configuration
const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin'
    },
    forcePathStyle: true // Needed for MinIO
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'adminator-storage';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

exports.uploadMiddleware = upload.single('file');

// Helper to normalize path for S3
const normalizeS3Key = (p) => {
    if (!p) return '';
    // Prevent path traversal
    let key = p.replace(/\.\./g, ''); 
    key = key.replace(/\\/g, '/');
    if (key.startsWith('/')) key = key.substring(1);
    return key;
};

exports.uploadFile = async (req, res) => {
    if (!req.file) {
        console.warn('[UPLOAD] Upload failed: No file provided');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        let targetDir = '';
        if (req.body.path) {
            targetDir = normalizeS3Key(req.body.path);
            if (targetDir && !targetDir.endsWith('/')) targetDir += '/';
        }

        const key = targetDir + req.file.originalname;
        console.log(`[UPLOAD] Starting upload: ${key} (${req.file.size} bytes) by ${req.user ? req.user.email : 'Unknown'}`);

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });

        await s3Client.send(command);

        console.log(`[UPLOAD] Upload successful: ${key}`);
        const fileUrl = `/api/upload/view?key=${encodeURIComponent(key)}`;

        res.json({
            message: 'File uploaded successfully',
            fileUrl: fileUrl,
            filename: req.file.originalname
        });
    } catch (err) {
        console.error('[UPLOAD] Upload error:', err);
        res.status(500).json({ 
            error: err.message || 'An error occurred uploading file',
            code: err.Code || err.code,
            details: err.toString()
        });
    }
};

exports.listFiles = async (req, res) => {
    try {
        const reqPath = req.query.path || '';
        let prefix = normalizeS3Key(reqPath);
        if (prefix && !prefix.endsWith('/')) prefix += '/';

        console.log(`[UPLOAD] Listing files in: ${prefix || 'root'}`);

        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            Delimiter: '/'
        });

        const response = await s3Client.send(command);

        const folders = (response.CommonPrefixes || []).map(p => {
            const name = p.Prefix.slice(prefix.length, -1);
            return {
                name: name,
                isDirectory: true,
                path: p.Prefix.slice(0, -1),
                size: 0,
                modified: null
            };
        });

        const files = (response.Contents || []).map(item => {
            const name = item.Key.slice(prefix.length);
            if (!name) return null;
            return {
                name: name,
                isDirectory: false,
                path: `upload/view?key=${encodeURIComponent(item.Key)}`,
                size: item.Size,
                modified: item.LastModified
            };
        }).filter(Boolean);

        const items = [...folders, ...files];
        res.json({ path: reqPath, items: items });
    } catch (err) {
        console.error('List files error:', err);
        res.status(500).json({ 
            error: err.message || 'An error occurred listing files',
            code: err.Code || err.code || 'UNKNOWN',
            details: err.toString()
        });
    }
};

exports.createFolder = async (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) return res.status(400).json({ error: 'Folder path required' });

    try {
        let key = normalizeS3Key(folderPath);
        if (!key.endsWith('/')) key += '/';

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: ''
        });

        await s3Client.send(command);
        res.json({ message: 'Folder created', path: folderPath });
    } catch (err) {
        console.error('Create folder error:', err);
        res.status(500).json({ 
            error: err.message || 'An error occurred creating folder',
            code: err.Code || err.code,
            details: err.toString()
        });
    }
};

exports.deleteItem = async (req, res) => {
    const { itemPath } = req.body;
    if (!itemPath) return res.status(400).json({ error: 'Path required' });

    try {
        const key = normalizeS3Key(itemPath);
        
        // Prepare list of objects to delete
        const objectsToDelete = [];

        // 1. Check for objects with this prefix (recursive delete for folders)
        // Append '/' to treat as folder, unless it already has it
        const folderPrefix = key.endsWith('/') ? key : key + '/';
        
        // We need to loop in case there are more than 1000 objects (pagination), 
        // but for this simple tool, one batch is likely enough. 
        // If needed, we can add a loop later.
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: folderPrefix
        });
        
        const listResponse = await s3Client.send(listCommand);
        
        if (listResponse.Contents && listResponse.Contents.length > 0) {
            objectsToDelete.push(...listResponse.Contents.map(item => ({ Key: item.Key })));
        }
        
        // 2. Add the item itself (if it's a file)
        objectsToDelete.push({ Key: key });
        
        // 3. Add the item as a folder marker (if it exists)
        if (!key.endsWith('/')) {
            objectsToDelete.push({ Key: key + '/' });
        }

        // Filter duplicates
        const uniqueObjects = [...new Map(objectsToDelete.map(item => [item.Key, item])).values()];

        if (uniqueObjects.length > 0) {
            const deleteCommand = new DeleteObjectsCommand({
                Bucket: BUCKET_NAME,
                Delete: {
                    Objects: uniqueObjects,
                    Quiet: true
                }
            });
            await s3Client.send(deleteCommand);
        }

        res.json({ message: 'Item deleted' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ 
            error: err.message || 'An error occurred deleting item',
            code: err.Code || err.code,
            details: err.toString()
        });
    }
};

exports.viewFile = async (req, res) => {
    const key = req.query.key;
    if (!key) return res.status(400).send('Key required');

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });

        const response = await s3Client.send(command);

        if (response.ContentType) res.setHeader('Content-Type', response.ContentType);
        if (response.ContentLength) res.setHeader('Content-Length', response.ContentLength);

        response.Body.pipe(res);
    } catch (err) {
        console.error('View file error:', err);
        res.status(404).send('File not found');
    }
};
