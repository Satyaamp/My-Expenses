const path = require('path');
const express = require('express');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { PORT } = require('./src/config/env');
const passwordRoutes = require('./src/routes/password.routes');

connectDB();

// Serve static frontend files from the 'frontend' directory
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api', passwordRoutes);
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
