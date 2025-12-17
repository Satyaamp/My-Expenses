const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../../frontend")));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'DhanRekha API' });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/income', require('./routes/income.routes'));
app.use('/api', require('./routes/password.routes'));

app.use(require('./middleware/error.middleware'));

module.exports = app;
