require('dotenv').config();

const { Connection, Request } = require('tedious');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const jwt = require('jsonwebtoken');

const region = 'ap-southeast-2';
const secretsClient = new SecretsManagerClient({ region });

const secretIds = {
  db: 'rds/sqlserver/datamesh',
  jwtCurrent: 'jwt/secret/current',
};

async function getSecretValue(secretId) {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await secretsClient.send(command);
  return JSON.parse(response.SecretString);
}

async function getConfig() {
  // 1. Check for local override first
  if (process.env.IS_OFFLINE && process.env.JWT_SECRET) {
    console.log('⚠️ Using local JWT_SECRET from environment');
    // We still need DB config. Assuming we can fetch it from AWS even locally,
    // or you could mock this too if you have a local DB.
    const db = await getSecretValue(secretIds.db);
    return {
      db,
      jwtSecret: process.env.JWT_SECRET
    };
  }

  // 2. Production path: Fetch everything from AWS
  const [db, jwtSecretData] = await Promise.all([
    getSecretValue(secretIds.db),
    getSecretValue(secretIds.jwtCurrent)
  ]);
  
  return {
    db,
    jwtSecret: jwtSecretData.JWT_SECRET
  };
}

function authenticate(event, jwtSecret) {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    throw new Error('Unauthorized: Missing Authorization header');
  }

  const token = authHeader.split(' ')[1]; // Expecting format: Bearer <token>
  
  if (!jwtSecret) {
     throw new Error('Server Error: JWT Secret not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    
    // Check for Global Admin OR specific App Access
    const isGlobalAdmin = decoded.isGlobalAdmin === true || decoded.isGlobalAdmin === 1;
    const allowedApps = decoded.allowedApps || [];
    
    // This Lambda belongs to the 'tasty-customers' app
    const hasAccess = isGlobalAdmin || allowedApps.includes('tasty-customers');

    if (!hasAccess) {
      throw new Error('Unauthorized: Insufficient permissions for Tasty Customers app');
    }
    return decoded;
  } catch (err) {
    throw new Error(`Unauthorized: ${err.message}`);
  }
}

exports.handler = async (event) => {
  let config;
  try {
    // Fetch config first to get the secret
    config = await getConfig();
    
    // Authenticate the user using the fetched secret
    const user = authenticate(event, config.jwtSecret);
    console.log('Authenticated user:', user);
  } catch (err) {
    console.error('Authentication error:', err);
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message }),
    };
  }

  const { db } = config;

  return new Promise((resolve, reject) => {
    const config = {
      server: db.host,
      authentication: {
        type: 'default',
        options: {
          userName: db.username,
          password: db.password,
        },
      },
      options: {
        database: 'tasty',
        encrypt: true,
        trustServerCertificate: true,
        rowCollectionOnRequestCompletion: true,
      },
    };

    const connection = new Connection(config);

    connection.on('connect', (err) => {
      if (err) {
        console.error('Database connection failed:', err);
        return resolve({ 
          statusCode: 500, 
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Database connection failed', details: err.message }) 
        });
      }

      const request = new Request('SELECT * FROM dbo.AuthUsers', (err, rowCount, rows) => {
        connection.close();
        if (err) {
          console.error('Query failed:', err);
          return resolve({ 
            statusCode: 500, 
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Query failed', details: err.message }) 
          });
        }

        console.log(`Fetched ${rowCount} rows`);

        const users = rows.map(row => {
          const user = {};
          row.forEach(column => {
            user[column.metadata.colName] = column.value;
          });
          return user;
        });

        resolve({ 
          statusCode: 200, 
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(users) 
        });
      });

      connection.execSql(request);
    });

    connection.on('error', (err) => {
      console.error('Connection error:', err);
      resolve({ 
        statusCode: 500, 
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Connection error', details: err.message }) 
      });
    });

    connection.connect();
  });
};