const { registerUser, loginUser } = require('../services/authService');

exports.register = async (req, res, next) => {
 try {
 const user = await registerUser(req.body);
 res.json({
  id: user.id,
  username: user.username,
  displayName: user.displayName || user.username,
  email: user.email,
 });
 } catch (error) {
 next(error);
 }
};

exports.login = async (req, res, next) => {
 try {
 const result = await loginUser(req.body);
 res.json(result);
 } catch (error) {
 next(error);
 }
};
