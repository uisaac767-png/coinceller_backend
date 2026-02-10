const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./db');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(bodyParser.json());

module.exports = app;
