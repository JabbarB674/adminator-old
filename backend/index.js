require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const dbRoutes = require('./routes/dbRoutes');
const userRoutes = require('./routes/userRoutes');
const appRoutes = require('./routes/appRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;
    
    console.log(`[REQUEST] ${method} ${url} - IP: ${ip}`);

    // Log response status and time on finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[RESPONSE] ${method} ${url} ${res.statusCode} - ${duration}ms`);
    });

    next();
});

// Serve static files from uploads directory
// Use the same path as the controller
const UPLOAD_DIR = process.env.STORAGE_PATH || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// Routes
app.use('/api', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/users', userRoutes);
app.use('/api/apps', appRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('Adminator Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
