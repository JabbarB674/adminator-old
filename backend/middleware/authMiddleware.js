const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }

    // Bearer <token>
    const tokenString = token.split(' ')[1];

    if (!tokenString) {
        return res.status(403).json({ error: 'Malformed token' });
    }

    jwt.verify(tokenString, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    });
};

module.exports = verifyToken;
