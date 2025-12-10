require('dotenv').config();

const { Connection, Request } = require('tedious');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const jwt = require('jsonwebtoken');

const region = 'ap-southeast-2';
const secretsClient = new SecretsManagerClient({ region });

const secretIds = {
  db: 'rds/sqlserver/datamesh',
};

async function getSecretValue(secretId) {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await secretsClient.send(command);
  return JSON.parse(response.SecretString);
}

async function getConfig() {
  const db = await getSecretValue(secretIds.db);
  return {
    db,
  };
}

const JWT_SECRET = process.env.JWT_SECRET;

function authenticate(event) {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    throw new Error('Unauthorized: Missing Authorization header');
  }

  const token = authHeader.split(' ')[1]; // Expecting format: Bearer <token>
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.roles || !decoded.roles.includes('admin')) {
      throw new Error('Unauthorized: Insufficient permissions');
    }
    return decoded;
  } catch (err) {
    throw new Error(`Unauthorized: ${err.message}`);
  }
}

exports.handler = async (event) => {
  try {
    // Authenticate the user
    const user = authenticate(event);
    console.log('Authenticated user:', user);
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: err.message }),
    };
  }

  const { db } = await getConfig();

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
        return reject({ statusCode: 500, body: JSON.stringify({ error: 'Database connection failed', details: err.message }) });
      }

      const request = new Request('SELECT * FROM dbo.AuthUsers', (err, rowCount, rows) => {
        connection.close();
        if (err) {
          return reject({ statusCode: 500, body: JSON.stringify({ error: 'Query failed', details: err.message }) });
        }

        console.log('Raw rows:', rows);

        const users = rows.map(row => {
          const user = {};
          row.forEach(column => {
            user[column.metadata.colName] = column.value;
          });
          return user;
        });

        console.log('Parsed users:', users);

        resolve({ statusCode: 200, body: JSON.stringify(users) });
      });

      connection.execSql(request);
    });

    connection.on('error', (err) => {
      reject({ statusCode: 500, body: JSON.stringify({ error: 'Connection error', details: err.message }) });
    });

    connection.connect();
  });
};