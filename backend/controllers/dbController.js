 const { executeQuery } = require('../config/db');

exports.executeQuery = async (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        // executeQuery returns an array of result sets (arrays of rows)
        const resultSets = await executeQuery(query);
        
        // Flatten if single result set, or return first one as primary recordset
        const recordset = resultSets.length > 0 ? resultSets[0] : [];

        res.json({
            rowsAffected: [recordset.length], // Approximation since our db wrapper doesn't return affected count
            recordset: recordset
        });
    } catch (err) {
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
