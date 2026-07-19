// ── Dependencies ──────────────────────────────────────────────────────────────
// bcrypt: hashes passwords so we never store plaintext credentials.
// jsonwebtoken: generates signed tokens so authenticated clients can prove
//   their identity on subsequent requests without re-sending their password.
// User: the Mongoose model (or in-memory equivalent) representing users.
// isMemoryDb / memoryStore: abstraction layer so the app can run with either
//   MongoDB or a throwaway in-memory store (useful for demos / testing).
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isMemoryDb } from '../config/db.js';
import { memoryStore } from '../services/memoryStore.js';

// ── Internal helpers ──────────────────────────────────────────────────────────
// These three functions hide the difference between a real MongoDB and the
// in-memory fallback, so the rest of the controller doesn't care which
// persistence layer is active.

// Look up a user by email address – used during registration (to detect
// duplicates) and login (to fetch credentials).
const findUserByEmail = (email) => {
  if (isMemoryDb()) {
    return memoryStore.findUserByEmail(email);
  } else {
    return User.findOne({ email });
  }
};

// Persist a new user document (hashed password and all).
const createUser = (user) => {
  if (isMemoryDb()) {
    return memoryStore.createUser(user);
  } else {
    return User.create(user);
  }
};

// Retrieve a user by their MongoDB _id, intentionally omitting the password
// field so it never leaks into an API response.
const findUserById = (id) => {
  if (isMemoryDb()) {
    return memoryStore.findUserById(id);
  } else {
    return User.findById(id).select('-password');
  }
};

// ── Register ──────────────────────────────────────────────────────────────────
// Accepts username, email, and password from the request body.
// 1. Rejects the request if the email is already taken.
// 2. Hashes the password with bcrypt so we never store the raw value.
// 3. Creates the user document in whichever store is active.
// 4. Immediately issues a JWT so the user is logged in right after signing up.
export const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    // Step 1: Check for duplicate email
    const userExists = await findUserByEmail(email);

    if (userExists) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Step 2: Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Step 3: Create the user
    const newUser = await createUser({
      username,
      email,
      password: hashedPassword
    });

    // Step 4: Generate and return a JWT
    const payload = { user: { id: newUser._id } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;

      res.json({
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email
        }
      });
    });
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
// Accepts email and password.
// 1. Looks up the user by email – if not found, respond "Invalid Credentials"
//    (intentionally vague to avoid leaking which field is wrong).
// 2. Compares the supplied password against the stored bcrypt hash.
// 3. On success, returns a JWT (valid 7 days) and the user's basic profile.
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Step 1: Look up the user by email
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Step 2: Verify the password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Step 3: Generate and return a JWT
    const payload = { user: { id: user._id } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;

      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      });
    });
  } catch (err) {
    next(err);
  }
};

// ── Get Profile ───────────────────────────────────────────────────────────────
// Returns the authenticated user's own profile data.
// The `req.user` object is populated by the auth middleware (which decoded the
// JWT and attached the user ID). Password is excluded by findUserById.
export const getProfile = async (req, res, next) => {
  try {
    // Step 1: Fetch the authenticated user's profile
    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Step 2: Return the profile data
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      created_at: user.createdAt
    });
  } catch (err) {
    next(err);
  }
};
