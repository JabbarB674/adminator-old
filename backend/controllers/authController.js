const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { TYPES } = require('tedious');
const { executeQuery } = require('../config/db');

exports.login = async (req, res) => {
    const { email, password } = req.body;

    console.log(`[AUTH] Login attempt for: ${email}`);

    if (!email || !password) {
        console.warn(`[AUTH] Login failed: Missing credentials for ${email}`);
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // console.log('Login request body:', req.body); // Redundant with above log

        const query = 'EXEC sp_Adminator_Login @Email = @Email;';
        const params = [{ name: 'Email', type: TYPES.NVarChar, value: email }];

        const resultSets = await executeQuery(query, params);

        // console.log('Query result sets:', resultSets.length);

        // Result Set 1: User Info
        const userRows = resultSets[0] || [];
        if (userRows.length === 0) {
            console.warn(`[AUTH] Login failed: User not found or invalid credentials for ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userRow = userRows[0];
        
        // Verify password
        const isMatch = await bcrypt.compare(password, userRow.PasswordHash);
        if (!isMatch) {
            console.warn(`[AUTH] Login failed: Invalid password for ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log(`[AUTH] Login success: ${email} (ID: ${userRow.UserId})`);

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
        let appRows = resultSets[1] || [];

        // FORCE SUPERADMIN ACCESS: If Global Admin, fetch ALL apps regardless of SP result
        if (user.isGlobalAdmin) {
            const allAppsQuery = 'SELECT AppId, AppKey, AppName, Description, AppIcon, RoutePath, ConfigPath FROM Adminator_Apps WHERE IsActive = 1 ORDER BY AppName';
            const allAppsResult = await executeQuery(allAppsQuery);
            appRows = allAppsResult[0] || [];
        }

        const allowedApps = appRows.map(row => ({
            appId: row.AppId,
            appKey: row.AppKey,
            appName: row.AppName,
            description: row.Description,
            appIcon: row.AppIcon,
            routePath: row.RoutePath,
            configPath: row.ConfigPath
        }));

        // Password validation moved up

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
        let appRows = resultSets[1] || [];

        // FORCE SUPERADMIN ACCESS: If Global Admin, fetch ALL apps regardless of SP result
        if (user.isGlobalAdmin) {
            const allAppsQuery = 'SELECT AppId, AppKey, AppName, Description, AppIcon, RoutePath, ConfigPath FROM Adminator_Apps WHERE IsActive = 1 ORDER BY AppName';
            const allAppsResult = await executeQuery(allAppsQuery);
            appRows = allAppsResult[0] || [];
        }

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
