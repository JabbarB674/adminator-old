const { TYPES } = require('tedious');
const { executeQuery } = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all users with their profile info
exports.getUsers = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.UserId, u.Email, u.FirstName, u.LastName, u.IsActive, u.LastLogin,
                p.ProfileId, p.ProfileName, p.IsGlobalAdmin
            FROM Adminator_Users u
            LEFT JOIN Adminator_AccessProfiles p ON u.ProfileId = p.ProfileId
            ORDER BY u.UserId DESC
        `;
        
        const resultSets = await executeQuery(query, []);
        const users = resultSets[0] || [];
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Get all available profiles for the dropdown
exports.getProfiles = async (req, res) => {
    try {
        const query = `SELECT ProfileId, ProfileName, Description FROM Adminator_AccessProfiles ORDER BY ProfileName`;
        const resultSets = await executeQuery(query, []);
        res.json(resultSets[0] || []);
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
};

// Create a new user
exports.createUser = async (req, res) => {
    const { email, password, firstName, lastName, profileId, isActive } = req.body;

    if (!email || !password || !profileId) {
        return res.status(400).json({ error: 'Email, password, and profile are required' });
    }

    try {
        // Check if email exists
        const checkQuery = 'SELECT COUNT(*) as count FROM Adminator_Users WHERE Email = @Email';
        const checkParams = [{ name: 'Email', type: TYPES.NVarChar, value: email }];
        const checkResult = await executeQuery(checkQuery, checkParams);
        
        if (checkResult[0][0].count > 0) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertQuery = `
            INSERT INTO Adminator_Users (Email, PasswordHash, FirstName, LastName, ProfileId, IsActive)
            VALUES (@Email, @PasswordHash, @FirstName, @LastName, @ProfileId, @IsActive);
        `;

        const params = [
            { name: 'Email', type: TYPES.NVarChar, value: email },
            { name: 'PasswordHash', type: TYPES.NVarChar, value: passwordHash },
            { name: 'FirstName', type: TYPES.NVarChar, value: firstName || null },
            { name: 'LastName', type: TYPES.NVarChar, value: lastName || null },
            { name: 'ProfileId', type: TYPES.Int, value: profileId },
            { name: 'IsActive', type: TYPES.Bit, value: isActive === undefined ? 1 : (isActive ? 1 : 0) }
        ];

        await executeQuery(insertQuery, params);

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Get user's app access (via Profile)
exports.getUserApps = async (req, res) => {
    const { userId } = req.params;
    try {
        // Get User's Profile Info
        const userQuery = `
            SELECT u.UserId, u.ProfileId, p.ProfileName, p.IsGlobalAdmin 
            FROM Adminator_Users u
            LEFT JOIN Adminator_AccessProfiles p ON u.ProfileId = p.ProfileId
            WHERE u.UserId = @UserId
        `;
        const userRes = await executeQuery(userQuery, [{ name: 'UserId', type: TYPES.Int, value: userId }]);
        
        if (userRes[0].length === 0) return res.status(404).json({ error: 'User not found' });
        const user = userRes[0][0];

        // Check if this is a custom profile
        const isCustomProfile = user.ProfileName && user.ProfileName.startsWith(`Custom_User_${userId}`);

        // Get assigned apps for this profile
        let assignedAppIds = [];
        if (user.ProfileId) {
            const appsQuery = 'SELECT AppId FROM Adminator_ProfileAppAccess WHERE ProfileId = @ProfileId';
            const appsRes = await executeQuery(appsQuery, [{ name: 'ProfileId', type: TYPES.Int, value: user.ProfileId }]);
            assignedAppIds = appsRes[0].map(row => row.AppId);
        }

        res.json({
            useCustomAccess: isCustomProfile,
            assignedAppIds,
            profileName: user.ProfileName,
            isGlobalAdmin: user.IsGlobalAdmin
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
        const userQuery = 'SELECT u.ProfileId, p.ProfileName FROM Adminator_Users u LEFT JOIN Adminator_AccessProfiles p ON u.ProfileId = p.ProfileId WHERE UserId = @UserId';
        const userRes = await executeQuery(userQuery, [{ name: 'UserId', type: TYPES.Int, value: userId }]);
        if (userRes[0].length === 0) return res.status(404).json({ error: 'User not found' });
        
        const currentUser = userRes[0][0];
        const customProfileName = `Custom_User_${userId}`;

        if (useCustomAccess) {
            let profileId;

            // Check if custom profile already exists
            const profileQuery = 'SELECT ProfileId FROM Adminator_AccessProfiles WHERE ProfileName = @ProfileName';
            const profileRes = await executeQuery(profileQuery, [{ name: 'ProfileName', type: TYPES.NVarChar, value: customProfileName }]);

            if (profileRes[0].length > 0) {
                profileId = profileRes[0][0].ProfileId;
            } else {
                // Create new custom profile
                const createProfileQuery = `
                    INSERT INTO Adminator_AccessProfiles (ProfileName, IsGlobalAdmin, Description) 
                    OUTPUT INSERTED.ProfileId
                    VALUES (@ProfileName, 0, 'Custom permissions for user ' + CAST(@UserId AS NVARCHAR))
                `;
                const createRes = await executeQuery(createProfileQuery, [
                    { name: 'ProfileName', type: TYPES.NVarChar, value: customProfileName },
                    { name: 'UserId', type: TYPES.Int, value: userId }
                ]);
                profileId = createRes[0][0].ProfileId;
            }

            // Assign user to this profile
            const updateUserQuery = 'UPDATE Adminator_Users SET ProfileId = @ProfileId WHERE UserId = @UserId';
            await executeQuery(updateUserQuery, [
                { name: 'ProfileId', type: TYPES.Int, value: profileId },
                { name: 'UserId', type: TYPES.Int, value: userId }
            ]);

            // Update App Permissions for this profile
            // First clear existing
            const deleteAppsQuery = 'DELETE FROM Adminator_ProfileAppAccess WHERE ProfileId = @ProfileId';
            await executeQuery(deleteAppsQuery, [{ name: 'ProfileId', type: TYPES.Int, value: profileId }]);

            // Insert new apps
            if (appIds && appIds.length > 0) {
                for (const appId of appIds) {
                    const insertAppQuery = 'INSERT INTO Adminator_ProfileAppAccess (ProfileId, AppId) VALUES (@ProfileId, @AppId)';
                    await executeQuery(insertAppQuery, [
                        { name: 'ProfileId', type: TYPES.Int, value: profileId },
                        { name: 'AppId', type: TYPES.Int, value: appId }
                    ]);
                }
            }

        } else {
            // Revert to default profile (e.g., 'Administrator' or just remove custom profile assignment)
            // For safety, we'll set them to 'Administrator' (ProfileId 2 usually) or NULL if not sure.
            // Better approach: If they were on a custom profile, move them to a safe default.
            
            if (currentUser.ProfileName === customProfileName) {
                // Find 'Administrator' profile
                const adminProfileQuery = "SELECT ProfileId FROM Adminator_AccessProfiles WHERE ProfileName = 'Administrator'";
                const adminRes = await executeQuery(adminProfileQuery, []);
                const defaultProfileId = adminRes[0].length > 0 ? adminRes[0][0].ProfileId : null;

                if (defaultProfileId) {
                    const revertQuery = 'UPDATE Adminator_Users SET ProfileId = @ProfileId WHERE UserId = @UserId';
                    await executeQuery(revertQuery, [
                        { name: 'ProfileId', type: TYPES.Int, value: defaultProfileId },
                        { name: 'UserId', type: TYPES.Int, value: userId }
                    ]);
                }
                
                // Optional: Delete the custom profile to clean up
                // const deleteProfileQuery = 'DELETE FROM Adminator_AccessProfiles WHERE ProfileName = @ProfileName';
                // await executeQuery(deleteProfileQuery, [{ name: 'ProfileName', type: TYPES.NVarChar, value: customProfileName }]);
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
            UPDATE Adminator_Users 
            SET Email = @Email, 
                FirstName = @FirstName, 
                LastName = @LastName, 
                ProfileId = @ProfileId, 
                IsActive = @IsActive
        `;

        const params = [
            { name: 'UserId', type: TYPES.Int, value: userId },
            { name: 'Email', type: TYPES.NVarChar, value: email },
            { name: 'FirstName', type: TYPES.NVarChar, value: firstName || null },
            { name: 'LastName', type: TYPES.NVarChar, value: lastName || null },
            { name: 'ProfileId', type: TYPES.Int, value: profileId },
            { name: 'IsActive', type: TYPES.Bit, value: isActive ? 1 : 0 }
        ];

        // Only update password if provided
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            updateQuery += `, PasswordHash = @PasswordHash`;
            params.push({ name: 'PasswordHash', type: TYPES.NVarChar, value: passwordHash });
        }

        updateQuery += ` WHERE UserId = @UserId`;

        await executeQuery(updateQuery, params);

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};
