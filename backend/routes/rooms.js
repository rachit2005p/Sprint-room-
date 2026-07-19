import express from 'express';
import { body } from 'express-validator';
import { createRoom, getRooms, joinRoom, deleteRoom, getMessages } from '../controllers/roomController.js';
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

// POST /rooms/create — Create a new room with a given name (auth required)
router.post(
  '/create',
  [
    authMiddleware,
    body('room_name', 'Room name is required').not().isEmpty(),
  ],
  handleValidationErrors,
  createRoom
);

// GET /rooms/ — List all active rooms (auth required)
router.get('/', authMiddleware, getRooms);

// POST /rooms/join — Join an existing room by room ID (auth required)
router.post('/join', authMiddleware, joinRoom);

// DELETE /rooms/:id — Delete a room by its ID (auth required, owner only)
router.delete('/:id', authMiddleware, deleteRoom);

// GET /rooms/:roomId/messages — Fetch all messages for a specific room (auth required)
router.get('/:roomId/messages', authMiddleware, getMessages);

export default router;
