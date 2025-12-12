const { Connection, Request, TYPES } = require('tedious');
const { Client } = require('pg');
const mysql = require('mysql2/promise');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// S3 Config (Duplicated for now, should be shared)
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

// Helper to get App Config
const getAppConfig = async (appKey) => {
    try {
        const key = `apps/${appKey}/config.json`;
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
        const response = await s3Client.send(command);
        const str = await response.Body.transformToString();
        return JSON.parse(str);
    } catch (e) {
        console.error('Error loading app config:', e);
        throw new Error('App configuration not found');
    }
};

exports.testConnection = async (req, res) => {
    const { type, config } = req.body;

    console.log(`[RemoteDB] Testing ${type} connection to ${config.server} (User: ${config.user})`);

    try {
        if (type === 'mssql') {
            return testMssql(config, res);
        } else if (type === 'postgres') {
            return testPostgres(config, res);
        } else if (type === 'mysql') {
            return testMysql(config, res);
        } else {
            return res.status(400).json({ error: 'Unsupported database type.' });
        }
    } catch (err) {
        console.error('Controller Error:', err);
        return res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
};

exports.getData = async (req, res) => {
    const { appKey, tableName } = req.params;
    try {
        const appConfig = await getAppConfig(appKey);
        const dataSource = appConfig.dataSource;
        
        // Validate table access
        const tableConfig = dataSource.tables?.find(t => t.name === tableName);
        if (!tableConfig) {
            return res.status(403).json({ error: `Table '${tableName}' is not exposed in this app.` });
        }

        if (dataSource.type === 'mssql') {
            return getMssqlData(dataSource.config, tableName, res);
        } else {
            return res.status(501).json({ error: 'Only MSSQL supported for data operations currently.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateData = async (req, res) => {
    const { appKey, tableName } = req.params;
    const { updates, primaryKey } = req.body;

    try {
        const appConfig = await getAppConfig(appKey);
        const dataSource = appConfig.dataSource;
        
        const tableConfig = dataSource.tables?.find(t => t.name === tableName);
        if (!tableConfig) {
            return res.status(403).json({ error: `Table '${tableName}' is not exposed.` });
        }
        if (!tableConfig.allowEdit) {
             return res.status(403).json({ error: `Table '${tableName}' is read-only.` });
        }

        if (dataSource.type === 'mssql') {
            return updateMssqlData(dataSource.config, tableName, updates, primaryKey || 'id', res);
        } else if (dataSource.type === 'postgres') {
            return updatePostgresData(dataSource.config, tableName, updates, primaryKey || 'id', res);
        } else if (dataSource.type === 'mysql') {
            return updateMysqlData(dataSource.config, tableName, updates, primaryKey || 'id', res);
        } else {
            return res.status(501).json({ error: 'Only MSSQL, Postgres, and MySQL supported for updates.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- MSSQL Helpers ---

const getMssqlData = (config, tableName, res) => {
    const dbConfig = {
        server: config.server,
        authentication: { type: 'default', options: { userName: config.user, password: config.password } },
        options: { database: config.database, port: parseInt(config.port) || 1433, encrypt: true, trustServerCertificate: true, rowCollectionOnRequestCompletion: true }
    };

    const connection = new Connection(dbConfig);
    connection.on('connect', (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Simple SELECT TOP 100 *
        // WARNING: Vulnerable to SQL Injection if tableName is not validated. 
        // We validated tableName against the config list above, which is safe-ish if config is trusted.
        // Ideally use bracket escaping.
        const safeTable = tableName.replace(/[^a-zA-Z0-9_.]/g, ''); 
        const query = `SELECT TOP 100 * FROM ${safeTable}`;

        const request = new Request(query, (err, rowCount, rows) => {
            connection.close();
            if (err) return res.status(500).json({ error: err.message });

            const result = [];
            rows.forEach(row => {
                const obj = {};
                row.forEach(col => {
                    obj[col.metadata.colName] = col.value;
                });
                result.push(obj);
            });
            res.json(result);
        });
        connection.execSql(request);
    });
    connection.connect();
};

const updateMssqlData = (config, tableName, updates, pkCol, res) => {
    const dbConfig = {
        server: config.server,
        authentication: { type: 'default', options: { userName: config.user, password: config.password } },
        options: { database: config.database, port: parseInt(config.port) || 1433, encrypt: true, trustServerCertificate: true }
    };

    const connection = new Connection(dbConfig);
    connection.on('connect', (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const safeTable = tableName.replace(/[^a-zA-Z0-9_.]/g, '');
        const safePk = pkCol.replace(/[^a-zA-Z0-9_]/g, '');

        let sql = '';
        let errorMsg = null;

        updates.forEach(update => {
            const { key, changes } = update;
            if (key === undefined || key === null) {
                errorMsg = `Missing primary key value for update. Ensure '${pkCol}' is present in the row data.`;
                return;
            }

            const setClause = Object.entries(changes).map(([col, val]) => {
                const safeCol = col.replace(/[^a-zA-Z0-9_]/g, '');
                const safeVal = val === null ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`;
                return `${safeCol} = ${safeVal}`;
            }).join(', ');
            
            const safeKeyVal = typeof key === 'string' ? `'${key.replace(/'/g, "''")}'` : key;
            
            sql += `UPDATE ${safeTable} SET ${setClause} WHERE ${safePk} = ${safeKeyVal}; `;
        });

        if (errorMsg) {
            connection.close();
            return res.status(400).json({ error: errorMsg });
        }

        const request = new Request(sql, (err) => {
            connection.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: `Updated ${updates.length} rows.` });
        });

        connection.execSql(request);
    });
    
    connection.connect();
};

const updatePostgresData = async (config, tableName, updates, pkCol, res) => {
    const client = new Client({
        host: config.server,
        port: parseInt(config.port) || 5432,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        const safeTable = tableName.replace(/[^a-zA-Z0-9_.]/g, '');
        const safePk = pkCol.replace(/[^a-zA-Z0-9_]/g, '');

        // Postgres doesn't support multiple statements in one query easily without transaction blocks or multiple calls.
        // We'll use a transaction.
        await client.query('BEGIN');

        for (const update of updates) {
            const { key, changes } = update;
            if (key === undefined || key === null) {
                throw new Error(`Missing primary key value for update. Ensure '${pkCol}' is present in the row data.`);
            }

            const cols = Object.keys(changes).map(c => c.replace(/[^a-zA-Z0-9_]/g, ''));
            const values = Object.values(changes);
            
            // Construct SET clause: col1 = $1, col2 = $2 ...
            const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
            
            // Add key to values for WHERE clause
            values.push(key);
            
            const query = `UPDATE ${safeTable} SET ${setClause} WHERE ${safePk} = $${values.length}`;
            await client.query(query, values);
        }

        await client.query('COMMIT');
        await client.end();
        
        res.json({ success: true, message: `Updated ${updates.length} rows.` });

    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (e) {} // Rollback if possible
        try { await client.end(); } catch (e) {} // Ensure close
        res.status(500).json({ error: 'Postgres Update Failed: ' + err.message });
    }
};

const updateMysqlData = async (config, tableName, updates, pkCol, res) => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: config.server,
            port: parseInt(config.port) || 3306,
            user: config.user,
            password: config.password,
            database: config.database,
            ssl: { rejectUnauthorized: false }
        });

        await connection.beginTransaction();

        const safeTable = tableName.replace(/[^a-zA-Z0-9_.]/g, '');
        const safePk = pkCol.replace(/[^a-zA-Z0-9_]/g, '');

        for (const update of updates) {
            const { key, changes } = update;
            if (key === undefined || key === null) {
                throw new Error(`Missing primary key value for update. Ensure '${pkCol}' is present in the row data.`);
            }

            const cols = Object.keys(changes).map(c => c.replace(/[^a-zA-Z0-9_]/g, ''));
            const values = Object.values(changes);
            
            const setClause = cols.map(c => `${c} = ?`).join(', ');
            values.push(key);

            const query = `UPDATE ${safeTable} SET ${setClause} WHERE ${safePk} = ?`;
            await connection.execute(query, values);
        }

        await connection.commit();
        await connection.end();

        res.json({ success: true, message: `Updated ${updates.length} rows.` });

    } catch (err) {
        if (connection) {
            try { await connection.rollback(); } catch (e) {}
            try { await connection.end(); } catch (e) {}
        }
        res.status(500).json({ error: 'MySQL Update Failed: ' + err.message });
    }
};

const testMssql = (config, res) => {
    const dbConfig = {
        server: config.server,
        authentication: {
            type: 'default',
            options: {
                userName: config.user,
                password: config.password
            }
        },
        options: {
            database: config.database,
            port: parseInt(config.port) || 1433,
            encrypt: true,
            trustServerCertificate: true,
            rowCollectionOnRequestCompletion: true,
            // Helpful for some AWS RDS / Azure instances
            connectTimeout: 15000, 
            requestTimeout: 15000
        }
    };

    const connection = new Connection(dbConfig);

    connection.on('connect', (err) => {
        if (err) {
            console.error('Remote DB Connection Error:', err);
            return res.status(500).json({ error: 'Connection failed: ' + err.message });
        }

        const request = new Request(
            `SELECT t.TABLE_SCHEMA, t.TABLE_NAME, c.COLUMN_NAME 
             FROM INFORMATION_SCHEMA.TABLES t 
             JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME 
             WHERE t.TABLE_TYPE = 'BASE TABLE' 
             ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION`,
            (err, rowCount, rows) => {
                connection.close();
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch tables: ' + err.message });
                }

                const tablesMap = {};
                rows.forEach(row => {
                    const schema = row[0].value;
                    const name = row[1].value;
                    const col = row[2].value;
                    const key = `${schema}.${name}`;
                    if (!tablesMap[key]) tablesMap[key] = { name, schema, columns: [] };
                    tablesMap[key].columns.push(col);
                });

                res.json({ message: 'Connection successful', tables: Object.values(tablesMap) });
            }
        );

        connection.execSql(request);
    });

    connection.connect();
};

const testPostgres = async (config, res) => {
    const client = new Client({
        host: config.server,
        port: parseInt(config.port) || 5432,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const result = await client.query(`
            SELECT t.table_schema, t.table_name, c.column_name 
            FROM information_schema.tables t 
            JOIN information_schema.columns c ON t.table_schema = c.table_schema AND t.table_name = c.table_name 
            WHERE t.table_type = 'BASE TABLE' 
            AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY t.table_name, c.ordinal_position
        `);
        await client.end();

        const tablesMap = {};
        result.rows.forEach(row => {
            const schema = row.table_schema;
            const name = row.table_name;
            const col = row.column_name;
            const key = `${schema}.${name}`;
            if (!tablesMap[key]) tablesMap[key] = { name, schema, columns: [] };
            tablesMap[key].columns.push(col);
        });

        res.json({ message: 'Connection successful', tables: Object.values(tablesMap) });
    } catch (err) {
        res.status(500).json({ error: 'Postgres Connection failed: ' + err.message });
    }
};

const testMysql = async (config, res) => {
    try {
        const connection = await mysql.createConnection({
            host: config.server,
            port: parseInt(config.port) || 3306,
            user: config.user,
            password: config.password,
            database: config.database,
            ssl: { rejectUnauthorized: false }
        });

        const [rows] = await connection.execute(`
            SELECT t.TABLE_NAME as table_name, c.COLUMN_NAME as column_name
            FROM information_schema.tables t 
            JOIN information_schema.columns c ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME 
            WHERE t.TABLE_SCHEMA = ? 
            AND t.TABLE_TYPE = 'BASE TABLE'
            ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
        `, [config.database]);

        await connection.end();

        const tablesMap = {};
        rows.forEach(row => {
            const schema = config.database;
            const name = row.table_name;
            const col = row.column_name;
            const key = `${schema}.${name}`;
            if (!tablesMap[key]) tablesMap[key] = { name, schema, columns: [] };
            tablesMap[key].columns.push(col);
        });

        res.json({ message: 'Connection successful', tables: Object.values(tablesMap) });
    } catch (err) {
        res.status(500).json({ error: 'MySQL Connection failed: ' + err.message });
    }
};
