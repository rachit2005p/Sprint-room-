// Global error handler — catches any unhandled errors and sends a clean response
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the full error for debugging
  const status = err.statusCode || 500;
  res.status(status).json({
    msg: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack // Hide stack trace in production for security
  });
};
