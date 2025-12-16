const { pool } = require('../config/pg');
const bcrypt = require('bcryptjs');

// Get all users with their profile info
exports.getUsers = async (req, res) => {
    console.log(`[USERS] Fetching user list requested by: ${req.user ? req.user.email : 'Unknown'}`);
    try {
        const query = `
            SELECT 
                u.user_id AS "UserId", 
                u.email AS "Email", 
                u.first_name AS "FirstName", 
                u.last_name AS "LastName", 
                u.is_active AS "IsActive", 
                u.last_login AS "LastLogin",
                p.profile_id AS "ProfileId", 
                p.profile_name AS "ProfileName", 
                p.is_global_admin AS "IsGlobalAdmin"
            FROM adminator_users u
            LEFT JOIN adminator_access_profiles p ON u.profile_id = p.profile_id
            ORDER BY u.user_id DESC
        `;
        
        const result = await pool.query(query);
        const users = result.rows;
        
        console.log(`[USERS] Retrieved ${users.length} users`);
        res.json(users);
    } catch (error) {
        console.error('[USERS] Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Get all available profiles for the dropdown
exports.getProfiles = async (req, res) => {
    try {
        const query = `
            SELECT 
                profile_id AS "ProfileId", 
                profile_name AS "ProfileName", 
                description AS "Description" 
            FROM adminator_access_profiles 
            ORDER BY profile_name
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
};

// Create a new user
exports.createUser = async (req, res) => {
    const { email, password, firstName, lastName, profileId, isActive } = req.body;

    console.log(`[USERS] Creating new user: ${email}`);

    if (!email || !password || !profileId) {
        console.warn('[USERS] Creation failed: Missing required fields');
        return res.status(400).json({ error: 'Email, password, and profile are required' });
    }

    try {
        // Check if email exists
        const checkQuery = 'SELECT COUNT(*) as count FROM adminator_users WHERE email = $1';
        const checkResult = await pool.query(checkQuery, [email]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            console.warn(`[USERS] Creation failed: Email ${email} already exists`);
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertQuery = `
            INSERT INTO adminator_users (email, password_hash, first_name, last_name, profile_id, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;

        await pool.query(insertQuery, [
            email, 
            passwordHash, 
            firstName || null, 
            lastName || null, 
            profileId, 
            isActive === undefined ? true : isActive
        ]);

        console.log(`[USERS] User created successfully: ${email}`);
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('[USERS] Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Get user's app access (via Profile)
exports.getUserApps = async (req, res) => {
    const { userId } = req.params;
    try {
        // Get User's Profile Info
        const userQuery = `
            SELECT u.user_id, u.profile_id, p.profile_name, p.is_global_admin 
            FROM adminator_users u
            LEFT JOIN adminator_access_profiles p ON u.profile_id = p.profile_id
            WHERE u.user_id = $1
        `;
        
        const userRes = await pool.query(userQuery, [userId]);
        
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = userRes.rows[0];

        // Check if this is a custom profile
        const isCustomProfile = user.profile_name && user.profile_name.startsWith(`Custom_User_${userId}`);

        // Get assigned apps for this profile
        let assignedAppIds = [];
        if (user.profile_id) {
            const appsQuery = 'SELECT app_id FROM adminator_profile_apps WHERE profile_id = $1';
            const appsRes = await pool.query(appsQuery, [user.profile_id]);
            assignedAppIds = appsRes.rows.map(row => row.app_id);
        }

        res.json({
            useCustomAccess: isCustomProfile,
            assignedAppIds,
            profileName: user.profile_name,
            isGlobalAdmin: user.is_global_admin
        });
    } catch (error) {
        console.error('Error fetching user apps:', error);
        res.status(500).json({ error: 'Failed to fetch user apps' });
    }
};

// Update user's app access (by creating/managing a Custom Profile)
exports.updateUserApps = async (req, res) => {
    const { userId } = req.params;
    const { useCustomAccess, appIds } = req.body; // appIds is array of ints

    try {
        // 1. Get current user info
        const userQuery = 'SELECT u.profile_id, p.profile_name FROM adminator_users u LEFT JOIN adminator_access_profiles p ON u.profile_id = p.profile_id WHERE user_id = $1';
        const userRes = await pool.query(userQuery, [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const currentUser = userRes.rows[0];
        const customProfileName = `Custom_User_${userId}`;

        if (useCustomAccess) {
            let profileId;

            // Check if custom profile already exists
            const profileQuery = 'SELECT profile_id FROM adminator_access_profiles WHERE profile_name = $1';
            const profileRes = await pool.query(profileQuery, [customProfileName]);

            if (profileRes.rows.length > 0) {
                profileId = profileRes.rows[0].profile_id;
            } else {
                // Create new custom profile
                const createProfileQuery = `
                    INSERT INTO adminator_access_profiles (profile_name, is_global_admin, description) 
                    VALUES ($1, false, $2)
                    RETURNING profile_id
                `;
                const createRes = await pool.query(createProfileQuery, [
                    customProfileName, 
                    `Custom permissions for user ${userId}`
                ]);
                profileId = createRes.rows[0].profile_id;
            }

            // Assign user to this profile
            const updateUserQuery = 'UPDATE adminator_users SET profile_id = $1 WHERE user_id = $2';
            await pool.query(updateUserQuery, [profileId, userId]);

            // Update App Permissions for this profile
            // First clear existing
            const deleteAppsQuery = 'DELETE FROM adminator_profile_apps WHERE profile_id = $1';
            await pool.query(deleteAppsQuery, [profileId]);

            // Insert new apps
            if (appIds && appIds.length > 0) {
                for (const appId of appIds) {
                    const insertAppQuery = 'INSERT INTO adminator_profile_apps (profile_id, app_id) VALUES ($1, $2)';
                    await pool.query(insertAppQuery, [profileId, appId]);
                }
            }

        } else {
            // Revert to default profile (e.g., 'Administrator' or just remove custom profile assignment)
            
            if (currentUser.profile_name === customProfileName) {
                // Find 'Administrator' profile (or Global Admin if Administrator doesn't exist)
                // In our schema we called it 'Global Admin'
                const adminProfileQuery = "SELECT profile_id FROM adminator_access_profiles WHERE profile_name = 'Global Admin'";
                const adminRes = await pool.query(adminProfileQuery);
                const defaultProfileId = adminRes.rows.length > 0 ? adminRes.rows[0].profile_id : null;

                if (defaultProfileId) {
                    const revertQuery = 'UPDATE adminator_users SET profile_id = $1 WHERE user_id = $2';
                    await pool.query(revertQuery, [defaultProfileId, userId]);
                }
            }
        }

        res.json({ message: 'User permissions updated' });
    } catch (error) {
        console.error('Error updating user apps:', error);
        res.status(500).json({ error: 'Failed to update user apps' });
    }
};

// Update a user
exports.updateUser = async (req, res) => {
    const { userId } = req.params;
    const { email, password, firstName, lastName, profileId, isActive } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        let updateQuery = `
            UPDATE adminator_users 
            SET email = $1, 
                first_name = $2, 
                last_name = $3, 
                profile_id = $4, 
                is_active = $5
        `;

        const params = [
            email, 
            firstName || null, 
            lastName || null, 
            profileId, 
            isActive ? true : false
        ];

        // Only update password if provided
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            updateQuery += `, password_hash = $${params.length + 1}`;
            params.push(passwordHash);
        }

        updateQuery += ` WHERE user_id = $${params.length + 1}`;
        params.push(userId);

        await pool.query(updateQuery, params);

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};
