import { z } from 'zod';

export const createCommentSchema = z.object({
  text: z.string().max(1000, 'Comment is too long').optional(),
  content: z.string().max(1000, 'Comment is too long').optional(), // Legacy alias
  userName: z.string().optional(),
  userAvatar: z.string().url().optional(),
  userEmail: z.string().email().optional(),
}).refine(data => data.text || data.content, {
  message: "Comment text is required",
  path: ["text"]
});

export const commentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type CommentQueryDto = z.infer<typeof commentQuerySchema>;

