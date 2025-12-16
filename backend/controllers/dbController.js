const { pool } = require('../config/pg');

exports.executeQuery = async (req, res) => {
    const { query } = req.body;
    
    console.log(`[DB_DIRECT] Executing raw query by ${req.user ? req.user.email : 'Unknown'}`);
    console.log(`[SECURITY AUDIT] RAW SQL EXECUTION ATTEMPT: ${query.substring(0, 100)}... by ${req.user ? req.user.email : 'Unknown'}`);

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    // Safety Check: Block catastrophic commands
    const dangerousPatterns = /\b(DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i;
    if (dangerousPatterns.test(query)) {
        console.error(`[SECURITY AUDIT] BLOCKED DESTRUCTIVE QUERY: ${query} by ${req.user ? req.user.email : 'Unknown'}`);
        return res.status(403).json({ error: 'Destructive queries (DROP, TRUNCATE) are not allowed via this interface.' });
    }

    try {
        const result = await pool.query(query);
        
        console.log(`[DB_DIRECT] Query executed successfully. Rows: ${result.rowCount}`);

        res.json({
            rowsAffected: [result.rowCount],
            recordset: result.rows
        });
    } catch (err) {
        console.error('[DB_DIRECT] Query execution failed:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getApps = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                app_id AS "AppId", 
                app_name AS "AppName", 
                description AS "Description", 
                icon AS "Icon", 
                path AS "Path" 
            FROM adminator_apps
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
