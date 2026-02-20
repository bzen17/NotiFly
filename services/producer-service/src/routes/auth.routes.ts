import { Router } from 'express';
import {
  signupController,
  loginController,
  refreshController,
  logoutController,
  createUserController,
} from '../controllers/auth.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/signup', signupController);
router.post('/login', loginController);
router.post('/refresh', refreshController);
router.post('/logout', authMiddleware, logoutController);

router.post('/create', authMiddleware, requireRole('admin'), createUserController);

export default router;
