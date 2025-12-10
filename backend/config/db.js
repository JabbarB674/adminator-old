const { Connection, Request } = require('tedious');
require('dotenv').config();

const dbConfig = {
    server: process.env.DB_SERVER,
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        }
    },
    options: {
        database: process.env.DB_NAME,
        encrypt: true,
        trustServerCertificate: true
    }
};

function executeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        const connection = new Connection(dbConfig);

        connection.on('connect', err => {
            if (err) return reject(err);
            console.log('Database connection established');

            const request = new Request(query, (err, rowCount, rows) => {
                connection.close();
                if (err) return reject(err);
                resolve(rows);
            });

            console.log('Executing query:', query);
            console.log('Query parameters:', params);

            params.forEach(p => {
                request.addParameter(p.name, p.type, p.value);
            });

            connection.execSql(request);
        });

        connection.on('error', err => {
            reject(err);
        });

        connection.connect();
    });
}

module.exports = { executeQuery };
