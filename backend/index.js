require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('Adminator Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
