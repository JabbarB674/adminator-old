const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = decoded; // Attach full decoded token to request
            console.log(`[AUTH] User authenticated: ${decoded.email} (ID: ${decoded.userId})`);
            next();
        } catch (error) {
            console.error(`[AUTH] Token verification failed: ${error.message}`);
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    } else {
        console.warn(`[AUTH] No token provided for protected route: ${req.originalUrl}`);
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.isGlobalAdmin) {
        console.log(`[AUTH] Admin access granted: ${req.user.email}`);
        next();
    } else {
        console.warn(`[AUTH] Admin access denied: ${req.user ? req.user.email : 'Unknown User'}`);
        res.status(401).json({ error: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
