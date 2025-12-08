const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Connection, Request, TYPES } = require('tedious');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const region = 'ap-southeast-2';
const secretsClient = new SecretsManagerClient({ region });

const secretIds = {
  db: 'rds/sqlserver/datamesh',
  jwtCurrent: 'jwt/secret/current',
  jwtPrevious: 'jwt/secret/previous',
};

async function getSecretValue(secretId) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await secretsClient.send(command);
    return JSON.parse(response.SecretString);
  } catch (err) {
    console.error(`Error retrieving secret ${secretId}:`, err);
    throw err;
  }
}

async function getConfig() {
  // For local development without AWS access, you might want to mock these
  // or ensure your local AWS credentials have access to these secrets.
  const [db, jwtCurrent, jwtPrevious] = await Promise.all([
    getSecretValue(secretIds.db),
    getSecretValue(secretIds.jwtCurrent),
    getSecretValue(secretIds.jwtPrevious)
  ]);

  return {
    db,
    jwtSecrets: {
      current: jwtCurrent.JWT_SECRET,
      previous: jwtPrevious.JWT_SECRET
    }
  };
}

function getUserRecord(email, creds) {
  return new Promise((resolve, reject) => {
    const config = {
      server: creds.host,
      authentication: {
        type: 'default',
        options: {
          userName: creds.username,
          password: creds.password
        }
      },
      options: {
        database: 'tasty',
        encrypt: true,
        trustServerCertificate: true,
        rowCollectionOnRequestCompletion: true
      }
    };

    const connection = new Connection(config);
    let user = null;

    connection.on('connect', err => {
      if (err) {
        return reject(err);
      }

      const request = new Request(
        `SELECT userId, email, passwordHash, accountId, isEmailVerified FROM AuthUsers WHERE email = @Email`,
        (err, rowCount, rows) => {
          connection.close();
          if (err) return reject(new Error('DB query failed: ' + err.message));
          if (rowCount === 0) return resolve(null);

          user = {
            userId: rows[0][0].value,
            email: rows[0][1].value,
            passwordHash: rows[0][2].value,
            accountId: rows[0][3].value,
            isEmailVerified: rows[0][4].value
          };
          resolve(user);
        }
      );

      request.addParameter('Email', TYPES.NVarChar, email);
      connection.execSql(request);
    });

    connection.on('error', err => {
      reject(err);
    });

    connection.connect();
  });
}

module.exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
      };
    }

    const config = await getConfig();
    const user = await getUserRecord(email, config.db);

    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
      };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
      };
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        accountId: user.accountId
      },
      config.jwtSecrets.current,
      { expiresIn: '24h' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        token,
        user: {
          email: user.email,
          userId: user.userId,
          accountId: user.accountId
        }
      }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
  }
};
