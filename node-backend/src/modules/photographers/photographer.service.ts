import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../common/exceptions/AppError.js';
import type { UpdatePhotographerDto } from './photographer.dto.js';

export class PhotographerService {
  async getById(id: string) {
    const photographer = await prisma.photographer.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        website: true,
        instagram: true,
        phone: true,
        subscription: true,
        storageUsed: true,
        storageLimit: true,
        watermarkUrl: true,
        defaultTemplate: true,
        notificationSettings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (!photographer) {
      throw new NotFoundError('Photographer');
    }

    return photographer;
  }

  async update(id: string, data: UpdatePhotographerDto) {
    const photographer = await prisma.photographer.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        website: true,
        instagram: true,
        phone: true,
        subscription: true,
        storageUsed: true,
        storageLimit: true,
        watermarkUrl: true,
        defaultTemplate: true,
        notificationSettings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return photographer;
  }

  async getStats(id: string) {
    const [photographer, eventStats, photoStats] = await Promise.all([
      prisma.photographer.findUnique({
        where: { id },
        select: { storageUsed: true, storageLimit: true },
      }),
      prisma.event.aggregate({
        where: { photographerId: id },
        _count: true,
      }),
      prisma.photo.aggregate({
        where: { event: { photographerId: id } },
        _count: true,
        _sum: { fileSize: true },
      }),
    ]);

    if (!photographer) {
      throw new NotFoundError('Photographer');
    }

    // Get engagement stats
    const [likes, comments, downloads] = await Promise.all([
      prisma.photoLike.count({
        where: { photo: { event: { photographerId: id } } },
      }),
      prisma.comment.count({
        where: { photo: { event: { photographerId: id } } },
      }),
      prisma.downloadPackage.count({
        where: { event: { photographerId: id }, status: 'READY' },
      }),
    ]);

    return {
      totalEvents: eventStats._count,
      totalPhotos: photoStats._count,
      storageUsed: photographer.storageUsed.toString(),
      storageLimit: photographer.storageLimit.toString(),
      totalLikes: likes,
      totalComments: comments,
      totalDownloads: downloads,
    };
  }
}

export const photographerService = new PhotographerService();

