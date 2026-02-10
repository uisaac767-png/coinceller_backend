const { registerUser, loginUser } = require('../services/authService');

exports.register = async (req, res, next) => {
 try {
 const user = await registerUser(req.body);
 res.json(user);
 } catch (error) {
 next(error);
 }
};

exports.login = async (req, res, next) => {
 try {
 const token = await loginUser(req.body);
 res.json({ token });
 } catch (error) {
 next(error);
 }
};
