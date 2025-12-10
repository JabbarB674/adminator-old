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
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await secretsClient.send(command);
  return JSON.parse(response.SecretString);
}

async function getConfig() {
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
            isEmailVerified: rows[0][4].value  // ← Changed from emailVerified
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

function getCustomerAccount(accountId, creds) {
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
    let account = null;

    connection.on('connect', err => {
      if (err) {
        return reject(err);
      }

      // Enhanced query to also get round and stop information from tblRoundCli
      // by matching the customer's address with the tasty database
      const request = new Request(
        `SELECT 
           ca.accountId, 
           ca.accountName, 
           ca.accountType, 
           ca.primaryContactFirstName, 
           ca.primaryContactLastName, 
           ca.accountStatus,
           ca.streetAddress,
           ca.suburb,
           ca.state,
           ca.postcode,
           rc.Round,
           rc.ID as customerId,
           rc.Company,
           rc.TradingName,
           rc.Phone,
           rc.Contactname,
           rc.Notes,
           rc.time
         FROM CustomerAccounts ca
         LEFT JOIN tblRoundCli rc ON (
           UPPER(LTRIM(RTRIM(ca.streetAddress))) = UPPER(LTRIM(RTRIM(rc.Address)))
           AND UPPER(LTRIM(RTRIM(ca.suburb))) = UPPER(LTRIM(RTRIM(rc.CliSuburb)))
           AND UPPER(LTRIM(RTRIM(ca.state))) = UPPER(LTRIM(RTRIM(rc.state)))
           AND ca.postcode = rc.CliPostcode
           AND rc.active = 1
         )
         WHERE ca.accountId = @AccountId
         ORDER BY rc.time ASC`,
        (err, rowCount, rows) => {
          connection.close();
          if (err) return reject(new Error('Customer account query failed: ' + err.message));
          if (rowCount === 0) return resolve(null);

          // Log if multiple matches found
          if (rowCount > 1) {
            console.log(`🔍 Found ${rowCount} customer matches for address, using first match (earliest time)`);
            for (let i = 0; i < Math.min(rowCount, 3); i++) {
              console.log(`  Match ${i + 1}: Round ${rows[i][10].value}, Customer ID ${rows[i][11].value}, Company: ${rows[i][12].value}, Time: ${rows[i][17].value}`);
            }
          }

          // Determine depot based on round number
          const roundNumber = rows[0][10].value;
          let depot = 'UNKNOWN';
          if (roundNumber !== null && roundNumber !== undefined) {
            if (roundNumber === 901 || roundNumber === 902) {
              depot = 'FTG';
            } else if (roundNumber < 100) {
              depot = 'FTG';
            } else if (roundNumber >= 100 && roundNumber <= 199) {
              depot = 'TULLA';
            } else if (roundNumber >= 201 && roundNumber <= 300) {
              depot = 'WP';
            } else if (roundNumber >= 301 && roundNumber <= 400) {
              depot = 'NC';
            } else if (roundNumber >= 401 && roundNumber <= 500) {
              depot = 'BW';
            } else if (roundNumber >= 501 && roundNumber <= 600) {
              depot = 'YAT';
            }
          }

          account = {
            accountId: rows[0][0].value,
            accountName: rows[0][1].value,
            accountType: rows[0][2].value,
            primaryContactFirstName: rows[0][3].value,
            primaryContactLastName: rows[0][4].value,
            accountStatus: rows[0][5].value,
            streetAddress: rows[0][6].value,
            suburb: rows[0][7].value,
            state: rows[0][8].value,
            postcode: rows[0][9].value,
            // Round and customer details from tblRoundCli (if matched)
            round: rows[0][10].value,
            customerId: rows[0][11].value,
            company: rows[0][12].value,
            tradingName: rows[0][13].value,
            phone: rows[0][14].value,
            contactName: rows[0][15].value,
            notes: rows[0][16].value,
            time: rows[0][17].value,
            depot: depot
          };
          
          console.log('🏢 Enhanced account details retrieved:');
          console.log('  - Account Name:', account.accountName);
          console.log('  - Round:', account.round);
          console.log('  - Depot:', account.depot, `(Round ${roundNumber})`);
          console.log('  - Customer ID:', account.customerId);
          console.log('  - Company:', account.company);
          console.log('  - Time:', account.time);
          console.log('  - Active customers only: YES');
          
          resolve(account);
        }
      );

      request.addParameter('AccountId', TYPES.Int, accountId);
      connection.execSql(request);
    });

    connection.on('error', err => {
      reject(err);
    });

    connection.connect();
  });
}

exports.handler = async (event) => {
  console.log('=== Login Lambda Start ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };

  // Handle OPTIONS method for CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    console.log('Parsed body:', JSON.stringify(body, null, 2));
    
    const { email, password } = body || {};

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing email or password' })
      };
    }

    console.log('📧 Login attempt for email:', email);
    console.log('🔑 Password length:', password ? password.length : 'undefined');

    const { db, jwtSecrets } = await getConfig();
    console.log('✅ Configuration loaded successfully');
    
    const user = await getUserRecord(email, db);
    console.log('👤 User lookup result:', user ? 'Found user' : 'User not found');

    if (!user) {
      console.log('❌ User not found in database');
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      console.log('❌ Email not verified, value:', user.isEmailVerified);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Email not verified. Please check your email and click the verification link.' 
        })
      };
    }

    console.log('🔍 User details:');
    console.log('  - UserId:', user.userId);
    console.log('  - Email:', user.email);
    console.log('  - AccountId:', user.accountId);
    console.log('  - Email Verified:', user.isEmailVerified);
    console.log('  - Password hash length:', user.passwordHash ? user.passwordHash.length : 'null');
    console.log('  - Hash algorithm detection:', user.passwordHash.startsWith('$2') ? 'bcrypt' : 'likely SHA-256');

    console.log('🔐 Comparing passwords...');
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    console.log('🔓 Password comparison result:', validPassword);

    if (!validPassword) {
      console.log('❌ Password validation failed');
      
      // Fallback to SHA-256 check (for backward compatibility)
      const crypto = require('crypto');
      const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
      console.log('🧪 Trying SHA-256 comparison...');
      console.log('  - Generated SHA-256 hash:', sha256Hash);
      console.log('  - Stored hash matches SHA-256:', sha256Hash === user.passwordHash);
      
      if (sha256Hash === user.passwordHash) {
        console.log('⚠️ WARNING: Password stored as SHA-256, not bcrypt!');
        // Continue with login process
      } else {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }
    }

    console.log('✅ Password validation successful');

    // Check if customer account exists
    let customerAccount = null;
    if (user.accountId) {
      console.log('🏢 Checking customer account for accountId:', user.accountId);
      customerAccount = await getCustomerAccount(user.accountId, db);
      console.log('🏢 Customer account result:', customerAccount ? 'Found account' : 'Account not found');
    } else {
      console.log('🏢 No accountId linked to user');
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, accountId: user.accountId },
      jwtSecrets.current,
      { expiresIn: '24h' }
    );

    console.log('🎫 JWT token generated successfully');

    // Build response with account status
    const response = {
      success: true,
      token,
      user: {
        userId: user.userId,
        email: user.email,
        emailVerified: user.isEmailVerified
      },
      account: {
        exists: !!customerAccount,
        status: customerAccount ? customerAccount.accountStatus : 'Setup Required'
      }
    };

    // Add account details if account exists
    if (customerAccount) {
      response.account.accountId = customerAccount.accountId;
      response.account.accountName = customerAccount.accountName;
      response.account.accountType = customerAccount.accountType;
      response.account.primaryContactFirstName = customerAccount.primaryContactFirstName;
      response.account.primaryContactLastName = customerAccount.primaryContactLastName;
      
      // Add round and customer details from tblRoundCli
      response.account.round = customerAccount.round;
      response.account.customerId = customerAccount.customerId;
      response.account.company = customerAccount.company;
      response.account.tradingName = customerAccount.tradingName;
      response.account.phone = customerAccount.phone;
      response.account.contactName = customerAccount.contactName;
      response.account.notes = customerAccount.notes;
      response.account.time = customerAccount.time;
      response.account.depot = customerAccount.depot;
      
      // Add address information
      response.account.streetAddress = customerAccount.streetAddress;
      response.account.suburb = customerAccount.suburb;
      response.account.state = customerAccount.state;
      response.account.postcode = customerAccount.postcode;
    }

    console.log('✅ Login completed successfully');
    console.log('🏢 Account status:', response.account.status);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (err) {
    console.error('💥 Login error:', err);
    console.error('Error stack:', err.stack);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
      },
      body: JSON.stringify({ error: 'Internal server error', details: err.message })
    };
  }
};