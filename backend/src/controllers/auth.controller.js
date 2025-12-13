const authService = require('../services/auth.service');
const { success } = require('../utils/response.util');

exports.register = async (req, res) =>
  success(res, await authService.register(req.body));

exports.login = async (req, res) =>
  success(res, await authService.login(req.body.email, req.body.password));

exports.me = async (req, res) => {
  const user = await authService.getMe(req.user.id);
  success(res, user, 'User profile fetched');
};
