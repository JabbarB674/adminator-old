const { executeQuery } = require('../config/db');

exports.getAllApps = async (req, res) => {
    try {
        const query = 'SELECT AppId, AppKey, AppName, Description FROM Adminator_Apps WHERE IsActive = 1 ORDER BY AppName';
        const resultSets = await executeQuery(query, []);
        res.json(resultSets[0] || []);
    } catch (error) {
        console.error('Error fetching apps:', error);
        res.status(500).json({ error: 'Failed to fetch apps' });
    }
};
