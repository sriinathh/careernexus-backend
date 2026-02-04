import { ForumPost, ForumComment } from '../models/DomainModels.js';

// GET /api/forum/posts
export const listPosts = async (req, res, next) => {
  try {
    const posts = await ForumPost.find({})
      .populate('author', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);
    const withCounts = await Promise.all(
      posts.map(async (p) => {
        const commentsCount = await ForumComment.countDocuments({ post: p._id });
        return { ...p.toObject(), commentsCount };
      }),
    );
    res.json(withCounts);
  } catch (err) {
    next(err);
  }
};

// GET /api/forum/posts/:id
export const getPost = async (req, res, next) => {
  try {
    const post = await ForumPost.findById(req.params.id).populate('author', 'name role');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const comments = await ForumComment.find({ post: post._id })
      .populate('author', 'name role')
      .sort({ createdAt: 1 });
    res.json({ ...post.toObject(), comments });
  } catch (err) {
    next(err);
  }
};

// POST /api/forum/posts
export const createPost = async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;
    const post = await ForumPost.create({
      author: req.user._id,
      title,
      content,
      tags: tags || [],
    });
    
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      const populatedPost = await ForumPost.findById(post._id)
        .populate('author', 'name role');
      io.to('forum').emit('post-created', populatedPost);
    }
    
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
};

// POST /api/forum/posts/:id/comments
export const addCommentController = async (req, res, next) => {
  try {
    const { content } = req.body;
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await ForumComment.create({
      post: post._id,
      author: req.user._id,
      content,
    });

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      const populatedComment = await ForumComment.findById(comment._id)
        .populate('author', 'name role');
      io.to('forum').emit('comment-added', {
        comment: populatedComment,
        postId: post._id,
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
};

// POST /api/forum/posts/:id/like
export const likePostController = async (req, res, next) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const hasLiked = post.likes.some((id) => id.toString() === req.user._id.toString());
    if (hasLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();
    
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to('forum').emit('post-like-updated', {
        postId: post._id,
        likes: post.likes.length,
      });
    }
    
    res.json({ likes: post.likes.length });
  } catch (err) {
    next(err);
  }
};