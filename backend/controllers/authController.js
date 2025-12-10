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

        const query = 'SELECT UserId, Email, PasswordHash, Role, FirstName, LastName FROM Adminator_Users WHERE Email = @Email;';
        const params = [{ name: 'Email', type: TYPES.NVarChar, value: email }];

        const rows = await executeQuery(query, params);

        console.log('Query result:', rows);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Helper to safely get value by column name
        const getValue = (row, colName) => {
            const col = row.find(c => c.metadata.colName === colName);
            return col ? col.value : null;
        };

        const row = rows[0];
        const user = {
            userId: getValue(row, 'UserId'),
            email: getValue(row, 'Email'),
            passwordHash: getValue(row, 'PasswordHash'),
            role: getValue(row, 'Role'),
            firstName: getValue(row, 'FirstName'),
            lastName: getValue(row, 'LastName')
        };

        const isValid = await bcrypt.compare(password, user.passwordHash);

        console.log('Password validation result:', isValid);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.userId, email: user.email, role: user.role },
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
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
