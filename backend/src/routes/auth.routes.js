const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const protect = require('../middleware/auth.middleware');
const limiter = require('../middleware/rateLimiter.middleware');

router.post('/register', limiter, ctrl.register);
router.post('/login', limiter, ctrl.login);
router.get('/me',protect , ctrl.me);

module.exports = router;
