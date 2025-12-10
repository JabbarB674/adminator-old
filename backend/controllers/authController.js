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

        const query = 'SELECT * FROM Adminator_Users;';
        const params = [{ name: 'Email', type: TYPES.NVarChar, value: email }];

        const rows = await executeQuery(query);

        console.log('Query result:', rows);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = {
            userId: rows[0][0].value,
            email: rows[0][1].value,
            passwordHash: rows[0][2].value,
            role: rows[0][3].value,
            firstName: rows[0][4].value,
            lastName: rows[0][5].value
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
