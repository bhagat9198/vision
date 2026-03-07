import { prisma } from '../../config/database.js';
import { NotFoundError, ForbiddenError } from '../../common/exceptions/AppError.js';
import { getPagination } from '../../common/utils/pagination.js';
import type { CreateCommentDto, CommentQueryDto } from './comment.dto.js';

export class CommentService {
  async create(photoId: string, data: CreateCommentDto) {
    // Verify photo exists and event allows comments
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { event: { select: { allowComments: true } } },
    });

    if (!photo) {
      throw new NotFoundError('Photo');
    }

    if (!photo.event.allowComments) {
      throw new ForbiddenError('Comments are disabled for this event');
    }

    const comment = await prisma.comment.create({
      data: {
        ...data,
        photoId,
      },
    });

    return comment;
  }

  async findByPhotoId(photoId: string, query: CommentQueryDto) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { photoId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.comment.count({ where: { photoId } }),
    ]);

    return { comments, total, page, limit };
  }

  async delete(id: string, photographerId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        photo: {
          include: {
            event: { select: { photographerId: true } },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundError('Comment');
    }

    // Only the event's photographer can delete comments
    if (comment.photo.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have permission to delete this comment');
    }

    await prisma.comment.delete({ where: { id } });
  }
}

export const commentService = new CommentService();

