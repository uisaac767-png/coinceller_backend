const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateAll } = require('./walletAddressService');

const registerUser = async (userData) => {
 const { username, email, password, displayName } = userData;

 // Check if user already exists
 const userExists = await User.findOne({ $or: [{ email }, { username }] });
 if (userExists) {
 throw new Error('User already exists');
 }

 // Hash the password
 const salt = await bcrypt.genSalt(10);
 const hashedPassword = await bcrypt.hash(password, salt);

 // Create new user
 const wallets = await generateAll();
 const newUser = new User({
 username,
 displayName: displayName || username,
 email,
 password: hashedPassword,
 wallets,
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
 const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

 return {
  token,
  user: {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email,
  },
 };
};

module.exports = { registerUser, loginUser };
