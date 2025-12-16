const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/pg');

exports.login = async (req, res) => {
    const { email, password } = req.body;

    console.log(`[AUTH] Login attempt for: ${email}`);

    if (!email || !password) {
        console.warn(`[AUTH] Login failed: Missing credentials for ${email}`);
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // 1. Get User & Profile Info
        const userQuery = `
            SELECT 
                u.user_id, u.email, u.password_hash, u.first_name, u.last_name, u.is_active,
                p.profile_id, p.profile_name, p.is_global_admin
            FROM adminator_users u
            LEFT JOIN adminator_access_profiles p ON u.profile_id = p.profile_id
            WHERE u.email = $1 AND u.is_active = true
        `;
        
        const userResult = await pool.query(userQuery, [email]);

        if (userResult.rows.length === 0) {
            console.warn(`[AUTH] Login failed: User not found or invalid credentials for ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userRow = userResult.rows[0];
        
        // Verify password
        const isMatch = await bcrypt.compare(password, userRow.password_hash);
        if (!isMatch) {
            console.warn(`[AUTH] Login failed: Invalid password for ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log(`[AUTH] Login success: ${email} (ID: ${userRow.user_id})`);

        // 2. Get Accessible Apps
        let allowedApps = [];
        if (userRow.is_global_admin) {
            // Global Admin gets everything
            const allAppsQuery = `
                SELECT app_id, app_key, app_name, description, app_icon, config_path 
                FROM adminator_apps 
                WHERE is_active = true 
                ORDER BY app_name
            `;
            const allAppsResult = await pool.query(allAppsQuery);
            allowedApps = allAppsResult.rows;
        } else {
            // Regular users get assigned apps
            const appsQuery = `
                SELECT 
                    a.app_id, a.app_key, a.app_name, a.description, a.app_icon, a.config_path,
                    pa.permission_level
                FROM adminator_apps a
                JOIN adminator_profile_apps pa ON a.app_id = pa.app_id
                WHERE pa.profile_id = $1 AND a.is_active = true
            `;
            const appsResult = await pool.query(appsQuery, [userRow.profile_id]);
            allowedApps = appsResult.rows;
        }

        const user = {
            userId: userRow.user_id,
            email: userRow.email,
            firstName: userRow.first_name,
            lastName: userRow.last_name,
            profileId: userRow.profile_id,
            profileName: userRow.profile_name,
            isGlobalAdmin: userRow.is_global_admin,
            allowedApps: allowedApps
        };

        const token = jwt.sign(
            { 
                userId: user.userId, 
                email: user.email, 
                profileId: user.profileId,
                isGlobalAdmin: user.isGlobalAdmin,
                allowedApps: allowedApps.map(a => a.app_key) // Store keys in token
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                ...user,
                allowedApps: allowedApps.map(a => ({
                    appId: a.app_id,
                    appKey: a.app_key,
                    appName: a.app_name,
                    description: a.description,
                    appIcon: a.app_icon,
                    configPath: a.config_path
                }))
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
        
        const userQuery = `
            SELECT 
                u.user_id, u.email, u.first_name, u.last_name, u.is_active,
                p.profile_id, p.profile_name, p.is_global_admin
            FROM adminator_users u
            LEFT JOIN adminator_access_profiles p ON u.profile_id = p.profile_id
            WHERE u.email = $1 AND u.is_active = true
        `;
        
        const userResult = await pool.query(userQuery, [email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userRow = userResult.rows[0];

        // Get Accessible Apps
        let allowedApps = [];
        if (userRow.is_global_admin) {
            const allAppsQuery = `
                SELECT app_id, app_key, app_name, description, app_icon, config_path 
                FROM adminator_apps 
                WHERE is_active = true 
                ORDER BY app_name
            `;
            const allAppsResult = await pool.query(allAppsQuery);
            allowedApps = allAppsResult.rows;
        } else {
            const appsQuery = `
                SELECT 
                    a.app_id, a.app_key, a.app_name, a.description, a.app_icon, a.config_path,
                    pa.permission_level
                FROM adminator_apps a
                JOIN adminator_profile_apps pa ON a.app_id = pa.app_id
                WHERE pa.profile_id = $1 AND a.is_active = true
            `;
            const appsResult = await pool.query(appsQuery, [userRow.profile_id]);
            allowedApps = appsResult.rows;
        }

        const user = {
            userId: userRow.user_id,
            email: userRow.email,
            firstName: userRow.first_name,
            lastName: userRow.last_name,
            profileId: userRow.profile_id,
            profileName: userRow.profile_name,
            isGlobalAdmin: userRow.is_global_admin,
            allowedApps: allowedApps
        };

        // Issue a new token
        const token = jwt.sign(
            { 
                userId: user.userId, 
                email: user.email, 
                profileId: user.profileId,
                isGlobalAdmin: user.isGlobalAdmin,
                allowedApps: allowedApps.map(a => a.app_key)
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                ...user,
                allowedApps: allowedApps.map(a => ({
                    appId: a.app_id,
                    appKey: a.app_key,
                    appName: a.app_name,
                    description: a.description,
                    appIcon: a.app_icon,
                    configPath: a.config_path
                }))
            }
        });

    } catch (error) {
        console.error('Refresh profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
