import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  listPosts,
  getPost,
  createPost,
  addCommentController,
  likePostController,
} from '../controllers/forumController.js';

const router = express.Router();

router.get('/posts', protect, listPosts);
router.get('/posts/:id', protect, getPost);
router.post('/posts', protect, createPost);
router.post('/posts/:id/comments', protect, addCommentController);
router.post('/posts/:id/like', protect, likePostController);

export default router;