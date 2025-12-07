import { prisma } from '../../config/database.js';

export class SuperAdminDashboardService {
  async getStats() {
    const [
      totalPhotographers,
      activePhotographers,
      totalEvents,
      publishedEvents,
      totalPhotos,
      totalAlbums,
      recentPhotographers,
      recentEvents,
    ] = await Promise.all([
      prisma.photographer.count(),
      prisma.photographer.count({ where: { isActive: true } }),
      prisma.event.count(),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.photo.count(),
      prisma.album.count(),
      prisma.photographer.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          subscription: true,
          isActive: true,
          createdAt: true,
          _count: { select: { events: true } },
        },
      }),
      prisma.event.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          date: true,
          createdAt: true,
          photographer: { select: { name: true } },
          _count: { select: { photos: true, albums: true } },
        },
      }),
    ]);

    return {
      stats: {
        photographers: { total: totalPhotographers, active: activePhotographers },
        events: { total: totalEvents, published: publishedEvents },
        photos: totalPhotos,
        albums: totalAlbums,
      },
      recentPhotographers: recentPhotographers.map((p) => ({
        ...p,
        eventsCount: p._count.events,
        _count: undefined,
      })),
      recentEvents: recentEvents.map((e) => ({
        ...e,
        photographerName: e.photographer.name,
        photosCount: e._count.photos,
        albumsCount: e._count.albums,
        photographer: undefined,
        _count: undefined,
      })),
    };
  }

  async getPhotographers(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
      : {};

    const [photographers, total] = await Promise.all([
      prisma.photographer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          subscription: true,
          isActive: true,
          storageUsed: true,
          storageLimit: true,
          createdAt: true,
          _count: { select: { events: true } },
        },
      }),
      prisma.photographer.count({ where }),
    ]);

    return {
      photographers: photographers.map((p) => ({
        ...p,
        storageUsed: Number(p.storageUsed),
        storageLimit: Number(p.storageLimit),
        eventsCount: p._count.events,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async togglePhotographerStatus(photographerId: string) {
    const photographer = await prisma.photographer.findUnique({
      where: { id: photographerId },
    });

    if (!photographer) {
      throw new Error('Photographer not found');
    }

    const updated = await prisma.photographer.update({
      where: { id: photographerId },
      data: { isActive: !photographer.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    return updated;
  }

  async getEvents(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { photographer: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
      : {};

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          date: true,
          createdAt: true,
          photographer: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: { select: { photos: true, albums: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events: events.map((e) => ({
        ...e,
        photographerName: e.photographer.name,
        photosCount: e._count.photos,
        albumsCount: e._count.albums,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPhotographerById(id: string) {
    const photographer = await prisma.photographer.findUnique({
      where: { id },
      include: {
        _count: { select: { events: true } },
      },
    });

    if (!photographer) {
      throw new Error('Photographer not found');
    }

    return {
      ...photographer,
      storageUsed: Number(photographer.storageUsed),
      storageLimit: Number(photographer.storageLimit),
      eventsCount: photographer._count.events,
      _count: undefined,
    };
  }

  async getEventById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        photographer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
          },
        },
        _count: { select: { photos: true, albums: true, downloads: true } },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    return {
      ...event,
      photographerName: event.photographer.name,
      photosCount: event._count.photos,
      albumsCount: event._count.albums,
      downloadsCount: event._count.downloads,
      _count: undefined,
    };
  }
}

export const superAdminDashboardService = new SuperAdminDashboardService();

