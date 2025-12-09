import { Prisma } from '../../lib/prisma.js';
import { prisma } from '../../config/database.js';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '../../common/exceptions/AppError.js';
import { getPagination } from '../../common/utils/pagination.js';
import { configService } from '../config/config.service.js';
import { eventCleanupQueue } from '../../queues/event-cleanup.queue.js';
import type { CreateEventDto, UpdateEventDto, EventQueryDto } from './event.dto.js';

// Helper to parse ID - returns { id, displayId } based on input
function parseEventId(idOrDisplayId: string): { id?: string; displayId?: number } {
  const numId = parseInt(idOrDisplayId, 10);
  if (!isNaN(numId) && numId.toString() === idOrDisplayId) {
    return { displayId: numId };
  }
  return { id: idOrDisplayId };
}

// Generate URL-safe slug from text
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export class EventService {
  async create(photographerId: string, data: CreateEventDto) {
    // Get photographer username to create slug
    const photographer = await prisma.photographer.findUnique({
      where: { id: photographerId },
      select: { username: true },
    });
    if (!photographer) throw new NotFoundError('Photographer not found');

    // Generate unique slug: username/event-name
    let baseSlug = `${photographer.username}/${generateSlug(data.name)}`;
    let slug = baseSlug;
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.event.findUnique({ where: { slug } });
      if (!existing) break;
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      attempts++;
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        slug,
        photographerId,
      },
      include: {
        photographer: {
          select: { id: true, username: true, name: true, avatar: true },
        },
        _count: { select: { photos: true, albums: true } },
      },
    });

    return event;
  }

  async findAll(photographerId: string, query: EventQueryDto) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where: Prisma.EventWhereInput = {
      photographerId,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          _count: { select: { photos: true, albums: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total, page, limit };
  }

  async findById(idOrDisplayId: string, photographerId?: string) {
    const { id, displayId } = parseEventId(idOrDisplayId);

    const event = await prisma.event.findFirst({
      where: id ? { id } : { displayId },
      include: {
        photographer: {
          select: { id: true, displayId: true, name: true, avatar: true, bio: true, website: true, instagram: true },
        },
        albums: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { photos: true, albums: true } },
      },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    // Check ownership if photographerId is provided
    if (photographerId && event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this event');
    }

    return event;
  }

  async findPublicById(idOrDisplayId: string) {
    const { id, displayId } = parseEventId(idOrDisplayId);

    const event = await prisma.event.findFirst({
      where: id ? { id } : { displayId },
      include: {
        photographer: {
          select: { id: true, name: true, avatar: true, bio: true, website: true, instagram: true },
        },
        albums: {
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { photos: true } } },
        },
        _count: { select: { photos: true, albums: true } },
      },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    // Remove password from response
    const { password: _, ...publicEvent } = event;
    return { ...publicEvent, requiresPassword: event.isPasswordProtected };
  }

  async findPublicBySlug(slug: string) {
    const event = await prisma.event.findFirst({
      where: { slug },
      include: {
        photographer: {
          select: { id: true, name: true, avatar: true, bio: true, website: true, instagram: true },
        },
        _count: { select: { photos: true, albums: true } },
      },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    // Remove password from response
    const { password: _, ...publicEvent } = event;
    return { ...publicEvent, requiresPassword: event.isPasswordProtected };
  }

  async update(idOrDisplayId: string, photographerId: string, data: UpdateEventDto) {
    // Verify ownership and get the actual event
    const existingEvent = await this.findById(idOrDisplayId, photographerId);

    // Remove any undefined values and settings key (shouldn't be there after transform but just in case)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([key, value]) => value !== undefined && key !== 'settings')
    );

    const event = await prisma.event.update({
      where: { id: existingEvent.id },
      data: cleanData,
      include: {
        photographer: { select: { id: true, displayId: true, name: true, avatar: true } },
        _count: { select: { photos: true, albums: true } },
      },
    });

    return event;
  }

  async delete(idOrDisplayId: string, photographerId: string) {
    const event = await this.findById(idOrDisplayId, photographerId);

    // Get configuration for deletion
    const { mode, trashPath } = await configService.getEventDeletionConfig();
    const orgId = await configService.getOrganizationId();

    // Dispatch cleanup job
    // We use numeric displayIds for the path if that's how they are stored (verified in image-processor.service.ts)
    // image-processor uses: ${orgId}/${photographerDisplayId}/${eventDisplayId}/...
    const photographerDisplayId = event.photographer.displayId.toString();
    const eventDisplayId = event.displayId.toString();

    await eventCleanupQueue.add('cleanup-event', {
      orgId,
      photographerId: photographerDisplayId, // Path uses displayId
      eventId: eventDisplayId,             // Path uses displayId
      eventUuid: event.id,                 // ID for Qdrant/Face Analysis
      deletionMode: mode,
      trashPath,
    });

    await prisma.event.delete({ where: { id: event.id } });
  }

  async verifyPassword(idOrDisplayId: string, password: string) {
    const { id, displayId } = parseEventId(idOrDisplayId);

    const event = await prisma.event.findFirst({
      where: id ? { id } : { displayId },
      select: { id: true, isPasswordProtected: true, password: true },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    if (!event.isPasswordProtected) {
      return { valid: true };
    }

    if (event.password !== password) {
      throw new UnauthorizedError('Invalid password');
    }

    return { valid: true };
  }
}

export const eventService = new EventService();

