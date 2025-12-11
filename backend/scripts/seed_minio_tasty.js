const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configuration (matching uploadController.js)
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

const APP_KEY = 'tasty-customers';

const configData = {
    title: "Tasty Customers",
    description: "Manage catering orders, customer profiles, and menus.",
    sections: [
        {
            title: "Quick Actions",
            widgets: [
                {
                    type: "link-list",
                    links: [
                        { label: "New Order", url: "/orders/new", external: false },
                        { label: "Customer Directory", url: "/customers", external: false },
                        { label: "Menu Management", url: "/menu", external: false }
                    ]
                }
            ]
        },
        {
            title: "Overview",
            widgets: [
                {
                    type: "markdown",
                    content: "Welcome to the **Tasty Customers** management portal. Use the links above to manage your catering business.\n\n*   **Orders**: View and process incoming catering requests.\n*   **Customers**: Manage client details and history.\n*   **Menu**: Update items and pricing."
                }
            ]
        }
    ]
};

async function uploadFile(key, body, contentType) {
    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: contentType
        });
        await s3Client.send(command);
        console.log(`Successfully uploaded: ${key}`);
    } catch (err) {
        console.error(`Error uploading ${key}:`, err);
    }
}

async function main() {
    console.log(`Seeding MinIO for app: ${APP_KEY}...`);

    // 1. Upload config.json
    const configKey = `apps/${APP_KEY}/config.json`;
    await uploadFile(configKey, JSON.stringify(configData, null, 2), 'application/json');

    // 2. Upload icon.png (using frontend/public/logo192.png as placeholder)
    const iconPath = path.join(__dirname, '../../frontend/public/logo192.png');
    const iconKey = `apps/${APP_KEY}/icon.png`;
    
    if (fs.existsSync(iconPath)) {
        const iconBuffer = fs.readFileSync(iconPath);
        await uploadFile(iconKey, iconBuffer, 'image/png');
    } else {
        console.warn(`Warning: Placeholder icon not found at ${iconPath}. Skipping icon upload.`);
    }

    console.log('Seeding complete!');
}

main();
