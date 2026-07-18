import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isMemoryDb } from '../config/db.js';
import { memoryStore } from '../services/memoryStore.js';

const findUserByEmail = (email) => (
  isMemoryDb() ? memoryStore.findUserByEmail(email) : User.findOne({ email })
);

const createUser = (user) => (
  isMemoryDb() ? memoryStore.createUser(user) : User.create(user)
);

const findUserById = (id) => (
  isMemoryDb() ? memoryStore.findUserById(id) : User.findById(id).select('-password')
);

export const register = async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    const userExists = await findUserByEmail(email);
    if (userExists) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await createUser({
      username,
      email,
      password: hashedPassword
    });

    const payload = { user: { id: newUser._id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: newUser._id, username: newUser.username, email: newUser.email } });
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user._id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
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
