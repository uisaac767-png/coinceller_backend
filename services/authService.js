const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerUser = async (userData) => {
 const { username, email, password } = userData;

 // Check if user already exists
 const userExists = await User.findOne({ $or: [{ email }, { username }] });
 if (userExists) {
 throw new Error('User already exists');
 }

 // Hash the password
 const salt = await bcrypt.genSalt(10);
 const hashedPassword = await bcrypt.hash(password, salt);

 // Create new user
 const newUser = new User({
 username,
 email,
 password: hashedPassword,
 });

 await newUser.save();
 return newUser;
};

const loginUser = async (userData) => {
 const { email, password } = userData;

 // Find user by email
 const user = await User.findOne({ email });
 if (!user) {
 throw new Error('Invalid credentials');
 }

 // Check password
 const isMatch = await bcrypt.compare(password, user.password);
 if (!isMatch) {
 throw new Error('Invalid credentials');
 }

 // Create and sign token
 const payload = {
 user: {
 id: user.id,
 },
 };
 const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

 return token;
};

module.exports = { registerUser, loginUser };
