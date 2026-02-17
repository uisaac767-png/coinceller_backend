const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);
  const status = Number(err.statusCode) || 500;
  res.status(status).json({
    message: err.message || "Server error",
    status,
  });
};

module.exports = errorHandler;
