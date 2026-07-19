// JWT verification middleware — protects routes by checking auth token
import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  // Read the Authorization header from the request
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Remove the "Bearer " prefix and verify the token with our secret key
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = decoded.user; // Attach user data to the request for downstream handlers
    next(); // Proceed to the actual route handler
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
