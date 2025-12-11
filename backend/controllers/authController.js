const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { TYPES } = require('tedious');
const { executeQuery } = require('../config/db');

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        console.log('Login request body:', req.body);

        const query = 'EXEC sp_Adminator_Login @Email = @Email;';
        const params = [{ name: 'Email', type: TYPES.NVarChar, value: email }];

        const resultSets = await executeQuery(query, params);

        console.log('Query result sets:', resultSets.length);

        // Result Set 1: User Info
        const userRows = resultSets[0] || [];
        if (userRows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userRow = userRows[0];
        const user = {
            userId: userRow.UserId,
            email: userRow.Email,
            passwordHash: userRow.PasswordHash,
            firstName: userRow.FirstName,
            lastName: userRow.LastName,
            profileId: userRow.ProfileId,
            profileName: userRow.ProfileName,
            isGlobalAdmin: userRow.IsGlobalAdmin
        };

        // Result Set 2: Allowed Apps
        const appRows = resultSets[1] || [];
        const allowedApps = appRows.map(row => ({
            appId: row.AppId,
            appKey: row.AppKey,
            appName: row.AppName,
            description: row.Description,
            appIcon: row.AppIcon,
            routePath: row.RoutePath,
            configPath: row.ConfigPath
        }));

        const isValid = await bcrypt.compare(password, user.passwordHash);

        console.log('Password validation result:', isValid);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { 
                userId: user.userId, 
                email: user.email, 
                profileId: user.profileId,
                isGlobalAdmin: user.isGlobalAdmin,
                allowedApps: allowedApps.map(a => a.appKey) // Store keys in token for easy checking
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Generated JWT token:', token);

        res.json({
            token,
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileName: user.profileName,
                isGlobalAdmin: user.isGlobalAdmin,
                allowedApps: allowedApps
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.refreshProfile = async (req, res) => {
    try {
        const email = req.user.email; // From JWT middleware
        
        const query = 'EXEC sp_Adminator_Login @Email = @Email;';
        const params = [{ name: 'Email', type: TYPES.NVarChar, value: email }];

        const resultSets = await executeQuery(query, params);

        // Result Set 1: User Info
        const userRows = resultSets[0] || [];
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userRow = userRows[0];
        const user = {
            userId: userRow.UserId,
            email: userRow.Email,
            firstName: userRow.FirstName,
            lastName: userRow.LastName,
            profileId: userRow.ProfileId,
            profileName: userRow.ProfileName,
            isGlobalAdmin: userRow.IsGlobalAdmin
        };

        // Result Set 2: Allowed Apps
        const appRows = resultSets[1] || [];
        const allowedApps = appRows.map(row => ({
            appId: row.AppId,
            appKey: row.AppKey,
            appName: row.AppName,
            description: row.Description,
            appIcon: row.AppIcon,
            routePath: row.RoutePath,
            configPath: row.ConfigPath
        }));

        // Issue a new token with updated claims (optional, but good practice if claims changed)
        const token = jwt.sign(
            { 
                userId: user.userId, 
                email: user.email, 
                profileId: user.profileId,
                isGlobalAdmin: user.isGlobalAdmin,
                allowedApps: allowedApps.map(a => a.appKey)
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileName: user.profileName,
                isGlobalAdmin: user.isGlobalAdmin,
                allowedApps: allowedApps
            }
        });

    } catch (error) {
        console.error('Refresh profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
