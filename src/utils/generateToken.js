import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: '7d'
  });
};
