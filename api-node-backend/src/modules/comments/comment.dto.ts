import { z } from 'zod';

export const createCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required').max(1000, 'Comment is too long'),
  userName: z.string().min(1, 'User name is required'),
  userAvatar: z.string().url().optional(),
  userEmail: z.string().email().optional(),
});

export const commentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type CommentQueryDto = z.infer<typeof commentQuerySchema>;

