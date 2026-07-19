import express from 'express';
import { body } from 'express-validator';
import { register, login, getProfile } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check express-validator results and return 400 if any validation fails

const handleValidationErrors = (req, res, next) => {
  import('express-validator').then(({ validationResult }) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  });
};

// POST /signup — Register a new user with username, email, and password (public)
router.post(
  '/signup',
  [
    body('username', 'Username is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  handleValidationErrors,
  register
);

// POST /login — Authenticate user with email and password, returns JWT token (public)
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists()
  ],
  handleValidationErrors,
  login
);

// GET /profile — Get the current authenticated user's profile (auth required)
router.get('/profile', authMiddleware, getProfile);

export default router;
