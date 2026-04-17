import { Prisma } from '../../lib/prisma.js';
import { prisma } from '../../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../common/exceptions/AppError.js';
import { getPagination } from '../../common/utils/pagination.js';
import type { CreatePhotoDto, UpdatePhotoDto, BulkCreatePhotosDto, PhotoQueryDto, LikePhotoDto } from './photo.dto.js';

// Helper to parse ID - returns { id, displayId } based on input
function parseId(idOrDisplayId: string): { id?: string; displayId?: number } {
  const numId = parseInt(idOrDisplayId, 10);
  if (!isNaN(numId) && numId.toString() === idOrDisplayId) {
    return { displayId: numId };
  }
  return { id: idOrDisplayId };
}

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

  async findByEventId(eventIdOrDisplayId: string, query: PhotoQueryDto) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const { id: eventId, displayId: eventDisplayId } = parseId(eventIdOrDisplayId);

    // First get the event to find its actual ID
    const event = await prisma.event.findFirst({
      where: eventId ? { id: eventId } : { displayId: eventDisplayId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    const where: Prisma.PhotoWhereInput = {
      eventId: event.id,
      ...(query.albumId && { albumId: query.albumId }),
      ...(query.rootOnly === 'true' && { albumId: null }), // Get only photos without album
    };

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          album: { select: { id: true, displayId: true, name: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.photo.count({ where }),
    ]);

    return { photos, total, page, limit };
  }

  async findById(idOrDisplayId: string, eventIdOrDisplayId?: string) {
    const { id, displayId } = parseId(idOrDisplayId);

    // If looking up by displayId, we optionally need eventId to be safe
    // But since displayId is autoincremented globally (for now), collision is unlikely but possible if sequence reused.
    // However, scoping by eventId is safer and requested.

    let eventId: string | undefined;
    if (eventIdOrDisplayId) {
      // Resolve event ID first
      const event = await prisma.event.findFirst({
        where: parseId(eventIdOrDisplayId).id ? { id: eventIdOrDisplayId } : { displayId: parseInt(eventIdOrDisplayId) },
        select: { id: true }
      });
      if (event) eventId = event.id;
    }

    const photo = await prisma.photo.findFirst({
      where: {
        AND: [
          id ? { id } : { displayId },
          eventId ? { eventId } : {}
        ]
      },
      include: {
        album: { select: { id: true, displayId: true, name: true } },
        event: { select: { id: true, displayId: true, name: true, photographerId: true } },
        comments: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!photo) {
      throw new NotFoundError('Photo');
    }

    return photo;
  }

  async update(idOrDisplayId: string, photographerId: string, data: UpdatePhotoDto) {
    const photo = await this.findById(idOrDisplayId);

    if (photo.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this photo');
    }

    const updated = await prisma.photo.update({
      where: { id: photo.id },
      data,
      include: { _count: { select: { likes: true, comments: true } } },
    });

    return updated;
  }

  async delete(idOrDisplayId: string, photographerId: string) {
    const photo = await this.findById(idOrDisplayId);

    if (photo.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this photo');
    }

    await prisma.photo.delete({ where: { id: photo.id } });
  }

  async toggleLike(idOrDisplayId: string, data: LikePhotoDto) {
    if (!data.sessionId && !data.userEmail) {
      throw new BadRequestError('Either sessionId or userEmail is required');
    }

    const photo = await this.findById(idOrDisplayId);

    const existing = await prisma.photoLike.findFirst({
      where: {
        photoId: photo.id,
        ...(data.sessionId ? { sessionId: data.sessionId } : { userEmail: data.userEmail }),
      },
    });

    if (existing) {
      await prisma.photoLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await prisma.photoLike.create({
      data: { photoId: photo.id, ...data },
    });

    return { liked: true };
  }

  async toggleFavorite(idOrDisplayId: string, data: LikePhotoDto) {
    if (!data.sessionId && !data.userEmail) {
      throw new BadRequestError('Either sessionId or userEmail is required');
    }

    const photo = await this.findById(idOrDisplayId);

    const existing = await prisma.favoritePhoto.findFirst({
      where: {
        photoId: photo.id,
        ...(data.sessionId ? { sessionId: data.sessionId } : { userEmail: data.userEmail }),
      },
    });

    if (existing) {
      await prisma.favoritePhoto.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    // Need eventId for FavoriteFolder logic, default to event from photo
    // But FavoritePhoto model requires folderId? No, folderId is optional.
    await prisma.favoritePhoto.create({
      data: {
        photoId: photo.id,
        ...data
      },
    });

    return { favorited: true };
  }

  async getLikesByUser(email: string) {
    const likes = await prisma.photoLike.findMany({
      where: { userEmail: email },
      include: {
        photo: {
          select: {
            id: true,
            displayId: true,
            url: true,
            thumbnail: true,
            eventId: true,
            event: { select: { id: true, displayId: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match frontend expectation
    return likes.map(like => ({
      photoId: like.photoId, // Keep UUID for interaction hooks if needed? Or switch to displayId? 
      // Frontend expects photoId to be distinct.
      displayId: like.photo.displayId,
      eventId: like.photo.event.displayId.toString(), // event.displayId is Int
      likedAt: like.createdAt.toISOString(),
      thumbnail: like.photo.thumbnail,
      url: like.photo.url
    }));
  }

  async getFavoritesByUser(email: string) {
    const favorites = await prisma.favoritePhoto.findMany({
      where: { userEmail: email },
      include: {
        photo: {
          select: {
            id: true,
            displayId: true,
            url: true,
            thumbnail: true,
            eventId: true,
            event: { select: { id: true, displayId: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return favorites.map(fav => ({
      photoId: fav.photoId,
      displayId: fav.photo.displayId,
      eventId: fav.photo.event.displayId.toString(),
      favoritedAt: fav.createdAt.toISOString(),
      thumbnail: fav.photo.thumbnail,
      url: fav.photo.url
    }));
  }
}

export const photoService = new PhotoService();

