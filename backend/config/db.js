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
        trustServerCertificate: true,
        rowCollectionOnRequestCompletion: true
    }
};

function executeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        const connection = new Connection(dbConfig);
        const resultSets = [];
        let currentSet = [];

        connection.on('connect', err => {
            if (err) return reject(err);
            console.log('Database connection established');

            const request = new Request(query, (err) => {
                // This callback is called when request completes
                connection.close();
                if (err) return reject(err);
                // If there are any remaining rows in currentSet (e.g. from a simple SELECT without doneInProc)
                if (currentSet.length > 0) {
                    resultSets.push(currentSet);
                }
                resolve(resultSets);
            });

            console.log('Executing query:', query);
            console.log('Query parameters:', params);

            params.forEach(p => {
                request.addParameter(p.name, p.type, p.value);
            });

            // Event for each row
            request.on('row', columns => {
                const row = {};
                columns.forEach(col => {
                    row[col.metadata.colName] = col.value;
                });
                currentSet.push(row);
            });

            // Event when a result set is finished (e.g. inside a stored proc)
            request.on('doneInProc', (rowCount, more, rows) => {
                resultSets.push(currentSet);
                currentSet = [];
            });

            // Event when a SQL batch is finished
            request.on('done', (rowCount, more, rows) => {
                if (currentSet.length > 0) {
                    resultSets.push(currentSet);
                    currentSet = [];
                }
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
