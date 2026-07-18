import express from 'express';
import { body } from 'express-validator';
import { createRoom, getRooms, joinRoom, deleteRoom, getMessages } from '../controllers/roomController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  import('express-validator').then(({ validationResult }) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  });
};

router.post(
  '/create',
  [
    authMiddleware,
    body('room_name', 'Room name is required').not().isEmpty(),
  ],
  handleValidationErrors,
  createRoom
);

router.get('/', authMiddleware, getRooms);

router.post('/join', authMiddleware, joinRoom);

router.delete('/:id', authMiddleware, deleteRoom);

router.get('/:roomId/messages', authMiddleware, getMessages);

export default router;
