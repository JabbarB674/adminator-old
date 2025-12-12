 const { executeQuery } = require('../config/db');

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
        // executeQuery returns an array of result sets (arrays of rows)
        const resultSets = await executeQuery(query);
        
        // Flatten if single result set, or return first one as primary recordset
        const recordset = resultSets.length > 0 ? resultSets[0] : [];

        console.log(`[DB_DIRECT] Query executed successfully. Rows: ${recordset.length}`);

        res.json({
            rowsAffected: [recordset.length], // Approximation since our db wrapper doesn't return affected count
            recordset: recordset
        });
    } catch (err) {
        console.error('[DB_DIRECT] Query execution failed:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getApps = async (req, res) => {
    try {
        const result = await executeQuery('SELECT * FROM Adminator_Apps');
        const apps = result.length > 0 ? result[0] : [];
        res.json(apps);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
