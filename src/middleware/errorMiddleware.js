export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ message: err.message || 'Server error' });
};
