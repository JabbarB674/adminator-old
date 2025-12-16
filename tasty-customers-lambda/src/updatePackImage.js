const { Connection, Request, TYPES } = require('tedious');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const region = 'ap-southeast-2';
const secretsClient = new SecretsManagerClient({ region });
const s3Client = new S3Client({ region });

const secretIds = {
  db: 'rds/sqlserver/datamesh'
};

const BUCKET_NAME = 'tasty-customers';

async function getSecretValue(secretId) {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await secretsClient.send(command);
  return JSON.parse(response.SecretString);
}

async function executeUpdate(dbConfig, packId, imageKey) {
    return new Promise((resolve, reject) => {
        const config = {
            server: dbConfig.host, // Secrets Manager usually returns 'host'
            authentication: {
                type: 'default',
                options: {
                    userName: dbConfig.username,
                    password: dbConfig.password
                }
            },
            options: {
                database: 'tasty', // Explicitly targeting 'tasty' database as per requirement
                encrypt: true,
                trustServerCertificate: true,
                port: parseInt(dbConfig.port) || 1433
            }
        };

        const connection = new Connection(config);

        connection.on('connect', (err) => {
            if (err) {
                return reject(err);
            }

            const sql = `UPDATE [dbo].[functionOrderPacks] SET imageKey = @imageKey WHERE PackID = @packId`;
            const request = new Request(sql, (err, rowCount) => {
                connection.close();
                if (err) {
                    return reject(err);
                }
                resolve(rowCount);
            });

            request.addParameter('imageKey', TYPES.NVarChar, imageKey);
            request.addParameter('packId', TYPES.Int, parseInt(packId));

            connection.execSql(request);
        });

        connection.connect();
    });
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle both API Gateway (event.body is string) and Console Test (event is object)
        let body;
        if (event.body) {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } else {
            body = event;
        }

        // Accept either fileBase (frontend) or fileBase64 (legacy/backend-proxy)
        const fileBase64 = body.fileBase64 || body.fileBase;
        const { packid, fileName } = body;

        if (!packid) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing packid' }) };
        }
        if (!fileBase64 || !fileName) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing file attachment (fileBase or fileBase64)' }) };
        }

        // 1. Upload to S3
        console.log(`Uploading ${fileName} to S3...`);
        const buffer = Buffer.from(fileBase64, 'base64');
        const key = `catering/${fileName}`;
        
        // Simple content type detection based on extension
        let contentType = 'application/octet-stream';
        if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) contentType = 'image/jpeg';
        if (fileName.endsWith('.png')) contentType = 'image/png';

        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType
        }));
        console.log('S3 Upload successful');

        // 2. Update Database
        console.log('Updating Database...');
        const dbConfig = await getSecretValue(secretIds.db);
        
        // Note: The secret might have 'dbname' or 'database' but user specified 'tasty' explicitly.
        // We'll use the credentials from the secret but force the database name in the connection options above.
        
        const rowCount = await executeUpdate(dbConfig, packid, key);
        console.log(`Database updated. Rows affected: ${rowCount}`);

        if (rowCount === 0) {
             return { 
                statusCode: 404, 
                body: JSON.stringify({ error: 'PackID not found', packid }) 
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: 'Image updated successfully', 
                packid, 
                imageKey: key 
            })
        };

    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message, stack: err.stack })
        };
    }
};
