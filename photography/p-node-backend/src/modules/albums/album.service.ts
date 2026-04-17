import { prisma } from '../../config/database.js';
import { NotFoundError, ForbiddenError } from '../../common/exceptions/AppError.js';
import type { CreateAlbumDto, UpdateAlbumDto, ReorderAlbumsDto } from './album.dto.js';

// Helper to parse ID - returns { id, displayId } based on input
function parseId(idOrDisplayId: string): { id?: string; displayId?: number } {
  const numId = parseInt(idOrDisplayId, 10);
  if (!isNaN(numId) && numId.toString() === idOrDisplayId) {
    return { displayId: numId };
  }
  return { id: idOrDisplayId };
}

export class AlbumService {
  private async verifyEventOwnership(eventIdOrDisplayId: string, photographerId: string) {
    const { id, displayId } = parseId(eventIdOrDisplayId);

    const event = await prisma.event.findFirst({
      where: id ? { id } : { displayId },
      select: { id: true, photographerId: true },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    if (event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this event');
    }

    return event;
  }

  async create(eventIdOrDisplayId: string, photographerId: string, data: CreateAlbumDto) {
    const event = await this.verifyEventOwnership(eventIdOrDisplayId, photographerId);

    // Get max sort order within the same parent
    const maxOrder = await prisma.album.aggregate({
      where: {
        eventId: event.id,
        parentId: data.parentId || null,
      },
      _max: { sortOrder: true },
    });

    const album = await prisma.album.create({
      data: {
        name: data.name,
        coverPhoto: data.coverPhoto,
        eventId: event.id,
        parentId: data.parentId || null,
        sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        _count: { select: { photos: true, children: true } },
      },
    });

    return album;
  }

  async findByEventId(eventIdOrDisplayId: string, parentId?: string | null) {
    const { id, displayId } = parseId(eventIdOrDisplayId);

    const event = await prisma.event.findFirst({
      where: id ? { id } : { displayId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    const albums = await prisma.album.findMany({
      where: {
        eventId: event.id,
        // If parentId is explicitly passed as null, get root albums
        // If parentId is passed as a string, get children of that album
        // If parentId is undefined, get all albums
        ...(parentId === null ? { parentId: null } : parentId ? { parentId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { photos: true, children: true } },
      },
    });

    return albums;
  }

  async findById(idOrDisplayId: string) {
    const { id, displayId } = parseId(idOrDisplayId);

    const album = await prisma.album.findFirst({
      where: id ? { id } : { displayId },
      include: {
        event: { select: { id: true, displayId: true, name: true, photographerId: true } },
        parent: { select: { id: true, displayId: true, name: true } },
        children: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { photos: true, children: true } },
          },
        },
        photos: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { likes: true, comments: true } },
          },
        },
        _count: { select: { photos: true, children: true } },
      },
    });

    if (!album) {
      throw new NotFoundError('Album');
    }

    return album;
  }

  async update(idOrDisplayId: string, photographerId: string, data: UpdateAlbumDto) {
    const album = await this.findById(idOrDisplayId);

    if (album.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this album');
    }

    const updated = await prisma.album.update({
      where: { id: album.id },
      data,
      include: {
        _count: { select: { photos: true } },
      },
    });

    return updated;
  }

  async delete(idOrDisplayId: string, photographerId: string) {
    const album = await this.findById(idOrDisplayId);

    if (album.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this album');
    }

    await prisma.album.delete({ where: { id: album.id } });
  }

  async reorder(eventIdOrDisplayId: string, photographerId: string, data: ReorderAlbumsDto) {
    const event = await this.verifyEventOwnership(eventIdOrDisplayId, photographerId);

    await prisma.$transaction(
      data.albums.map(({ id, sortOrder }) =>
        prisma.album.update({
          where: { id },
          data: { sortOrder },
        })
      )
    );

    return this.findByEventId(event.id);
  }
}

export const albumService = new AlbumService();

