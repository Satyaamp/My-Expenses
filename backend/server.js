require('dotenv').config();
const path = require('path');
const app = require('./src/app');
const connectDB = require('./src/config/db');

// ✅ Render-safe port
const PORT = process.env.PORT || 5000;

// 404 Fallback for unknown routes
app.get(/.*/, (req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});

// ✅ Connect DB before starting server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });