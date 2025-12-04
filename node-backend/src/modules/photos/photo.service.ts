import { Prisma } from '../../lib/prisma.js';
import { prisma } from '../../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../common/exceptions/AppError.js';
import { getPagination } from '../../common/utils/pagination.js';
import type { CreatePhotoDto, UpdatePhotoDto, BulkCreatePhotosDto, PhotoQueryDto, LikePhotoDto } from './photo.dto.js';

export class PhotoService {
  private async verifyAlbumOwnership(albumId: string, photographerId: string) {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: { event: { select: { photographerId: true } } },
    });

    if (!album) {
      throw new NotFoundError('Album');
    }

    if (album.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this album');
    }

    return album;
  }

  async create(albumId: string, photographerId: string, data: CreatePhotoDto) {
    const album = await this.verifyAlbumOwnership(albumId, photographerId);

    const maxOrder = await prisma.photo.aggregate({
      where: { albumId },
      _max: { sortOrder: true },
    });

    const photo = await prisma.photo.create({
      data: {
        ...data,
        albumId,
        eventId: album.eventId,
        sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        _count: { select: { likes: true, comments: true } },
      },
    });

    return photo;
  }

  async bulkCreate(albumId: string, photographerId: string, data: BulkCreatePhotosDto) {
    const album = await this.verifyAlbumOwnership(albumId, photographerId);

    const maxOrder = await prisma.photo.aggregate({
      where: { albumId },
      _max: { sortOrder: true },
    });

    let currentOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const photos = await prisma.photo.createMany({
      data: data.photos.map((photo) => ({
        ...photo,
        albumId,
        eventId: album.eventId,
        sortOrder: photo.sortOrder ?? currentOrder++,
      })),
    });

    return { count: photos.count };
  }

  async findByEventId(eventId: string, query: PhotoQueryDto) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where: Prisma.PhotoWhereInput = {
      eventId,
      ...(query.albumId && { albumId: query.albumId }),
    };

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          album: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.photo.count({ where }),
    ]);

    return { photos, total, page, limit };
  }

  async findById(id: string) {
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        album: { select: { id: true, name: true } },
        event: { select: { id: true, name: true, photographerId: true } },
        comments: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!photo) {
      throw new NotFoundError('Photo');
    }

    return photo;
  }

  async update(id: string, photographerId: string, data: UpdatePhotoDto) {
    const photo = await this.findById(id);

    if (photo.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this photo');
    }

    const updated = await prisma.photo.update({
      where: { id },
      data,
      include: { _count: { select: { likes: true, comments: true } } },
    });

    return updated;
  }

  async delete(id: string, photographerId: string) {
    const photo = await this.findById(id);

    if (photo.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this photo');
    }

    await prisma.photo.delete({ where: { id } });
  }

  async toggleLike(id: string, data: LikePhotoDto) {
    if (!data.sessionId && !data.userEmail) {
      throw new BadRequestError('Either sessionId or userEmail is required');
    }

    const existing = await prisma.photoLike.findFirst({
      where: {
        photoId: id,
        ...(data.sessionId ? { sessionId: data.sessionId } : { userEmail: data.userEmail }),
      },
    });

    if (existing) {
      await prisma.photoLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await prisma.photoLike.create({
      data: { photoId: id, ...data },
    });

    return { liked: true };
  }
}

export const photoService = new PhotoService();

