import { Event, Photographer, Album, Photo, Comment, PersonTag, SimilarPhoto, DetectedFace, ColorOption, OutfitType, SearchSuggestion, FavoriteFolder, FavoritePhoto, DownloadSize, DownloadPackage, DownloadSettings, PhotographerStats, ActivityItem, ClientVisit, PhotographerProfile } from './types';

export const mockEvents: Event[] = [
  {
    id: '1',
    displayId: 1,
    name: "Sarah & Michael's Wedding",
    photographerId: '1',
    coverPhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80',
    date: '2024-12-15',
    location: 'The Grand Ballroom, New York',
    isPasswordProtected: false,
    password: null,
    instructions: null,
    totalPhotos: 1247,
    status: 'published',
    template: 'modern',
  },
  {
    id: '2',
    displayId: 2,
    name: "Priya & Rahul's Engagement",
    photographerId: '1',
    coverPhoto: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1920&q=80',
    date: '2024-11-20',
    location: 'Taj Palace, Mumbai',
    isPasswordProtected: true,
    password: 'priya2024',
    instructions: 'Please enter the password shared by the couple to access the gallery.',
    totalPhotos: 856,
    status: 'published',
    template: 'elegant',
  },
  {
    id: '3',
    displayId: 3,
    name: "Emma's Birthday Party",
    photographerId: '1',
    coverPhoto: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1920&q=80',
    date: '2024-10-10',
    location: 'Central Park, New York',
    isPasswordProtected: false,
    password: null,
    instructions: null,
    totalPhotos: 234,
    status: 'published',
    template: 'minimal',
  },
  {
    id: '4',
    displayId: 4,
    name: "Johnson Family Reunion",
    photographerId: '1',
    coverPhoto: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=80',
    date: '2024-09-05',
    location: 'Lakeside Manor, Chicago',
    isPasswordProtected: false,
    password: null,
    instructions: null,
    totalPhotos: 567,
    status: 'published',
    template: 'classic',
  },
  {
    id: '5',
    displayId: 5,
    name: "Milano Fashion Week",
    photographerId: '1',
    coverPhoto: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    date: '2024-08-18',
    location: 'Milano, Italy',
    isPasswordProtected: false,
    password: null,
    instructions: null,
    totalPhotos: 892,
    status: 'published',
    template: 'fashion',
  },
  {
    id: '6',
    displayId: 6,
    name: "Studio Portrait Session",
    photographerId: '1',
    coverPhoto: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1920&q=80',
    date: '2024-07-22',
    location: 'Downtown Studio, Los Angeles',
    isPasswordProtected: false,
    password: null,
    instructions: null,
    totalPhotos: 156,
    status: 'published',
    template: 'sidebar',
  },
];

export const mockPhotographers: Photographer[] = [
  {
    id: '1',
    displayId: 1,
    name: 'Alex Thompson Photography',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    bio: 'Award-winning wedding & event photographer with 10+ years of experience',
    website: 'https://alexthompson.com',
    instagram: '@alexthompsonphoto',
  },
];

export const mockAlbums: Album[] = [
  {
    id: '1',
    displayId: 1,
    eventId: '1',
    name: 'Bride Getting Ready',
    coverPhoto: 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=800&q=80',
    photoCount: 142,
  },
  {
    id: '2',
    displayId: 2,
    eventId: '1',
    name: 'Ceremony',
    coverPhoto: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    photoCount: 318,
  },
  {
    id: '3',
    displayId: 3,
    eventId: '1',
    name: 'Reception',
    coverPhoto: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80',
    photoCount: 425,
  },
  {
    id: '4',
    displayId: 4,
    eventId: '1',
    name: 'Couple Portraits',
    coverPhoto: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80',
    photoCount: 89,
  },
];

export const mockPhotos: Photo[] = [
  // Wedding photos - various aspects
  { id: '1', albumId: '1', eventId: '1', url: 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400&q=80', likes: 24, comments: 3, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-15T10:30:00Z' },
  { id: '2', albumId: '1', eventId: '1', url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&q=80', likes: 18, comments: 2, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T10:35:00Z' },
  { id: '3', albumId: '2', eventId: '1', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80', likes: 42, comments: 8, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T14:00:00Z' },
  { id: '4', albumId: '2', eventId: '1', url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80', likes: 56, comments: 12, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T14:15:00Z' },
  { id: '5', albumId: '2', eventId: '1', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80', likes: 89, comments: 15, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T14:30:00Z' },
  { id: '6', albumId: '3', eventId: '1', url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80', likes: 34, comments: 5, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T18:00:00Z' },
  { id: '7', albumId: '3', eventId: '1', url: 'https://images.unsplash.com/photo-1470290378698-263fa7ca60ab?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1470290378698-263fa7ca60ab?w=400&q=80', likes: 27, comments: 4, aspectRatio: 'portrait', downloadable: false, timestamp: '2024-12-15T18:30:00Z' },
  { id: '8', albumId: '4', eventId: '1', url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&q=80', likes: 67, comments: 9, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-15T16:00:00Z' },
  { id: '9', albumId: '4', eventId: '1', url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=400&q=80', likes: 45, comments: 7, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T16:15:00Z' },
  { id: '10', albumId: '2', eventId: '1', url: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=400&q=80', likes: 38, comments: 6, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-15T14:45:00Z' },
  { id: '11', albumId: '3', eventId: '1', url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=400&q=80', likes: 51, comments: 8, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T19:00:00Z' },
  { id: '12', albumId: '1', eventId: '1', url: 'https://images.unsplash.com/photo-1549417229-7686ac5595fd?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1549417229-7686ac5595fd?w=400&q=80', likes: 29, comments: 3, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-15T11:00:00Z' },
  { id: '13', albumId: '2', eventId: '1', url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&q=80', likes: 63, comments: 11, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T15:00:00Z' },
  { id: '14', albumId: '3', eventId: '1', url: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=400&q=80', likes: 44, comments: 6, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T19:30:00Z' },
  { id: '15', albumId: '4', eventId: '1', url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&q=80', likes: 72, comments: 14, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-15T16:30:00Z' },
  { id: '16', albumId: '1', eventId: '1', url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400&q=80', likes: 33, comments: 4, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-15T11:30:00Z' },
  // Event 2 - Engagement photos (Elegant template)
  { id: '17', albumId: null, eventId: '2', url: 'https://images.unsplash.com/photo-1529634597503-139d3726fed5?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1529634597503-139d3726fed5?w=400&q=80', likes: 45, comments: 8, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-10T14:00:00Z' },
  { id: '18', albumId: null, eventId: '2', url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400&q=80', likes: 52, comments: 6, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-10T14:30:00Z' },
  { id: '19', albumId: null, eventId: '2', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&q=80', likes: 38, comments: 4, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-10T15:00:00Z' },
  { id: '20', albumId: null, eventId: '2', url: 'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=400&q=80', likes: 67, comments: 12, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-10T15:30:00Z' },
  { id: '21', albumId: null, eventId: '2', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80', likes: 41, comments: 5, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-10T16:00:00Z' },
  { id: '22', albumId: null, eventId: '2', url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&q=80', likes: 55, comments: 9, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-10T16:30:00Z' },
  { id: '23', albumId: null, eventId: '2', url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=400&q=80', likes: 48, comments: 7, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-10T17:00:00Z' },
  { id: '24', albumId: null, eventId: '2', url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&q=80', likes: 63, comments: 11, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-10T17:30:00Z' },
  // Event 3 - Corporate event (Minimal template)
  { id: '25', albumId: null, eventId: '3', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80', likes: 12, comments: 2, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-08T09:00:00Z' },
  { id: '26', albumId: null, eventId: '3', url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&q=80', likes: 18, comments: 3, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-08T10:00:00Z' },
  { id: '27', albumId: null, eventId: '3', url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&q=80', likes: 24, comments: 4, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-08T11:00:00Z' },
  { id: '28', albumId: null, eventId: '3', url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&q=80', likes: 15, comments: 2, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-08T12:00:00Z' },
  { id: '29', albumId: null, eventId: '3', url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&q=80', likes: 21, comments: 3, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-08T14:00:00Z' },
  { id: '30', albumId: null, eventId: '3', url: 'https://images.unsplash.com/photo-1559223607-a43c990c692c?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1559223607-a43c990c692c?w=400&q=80', likes: 19, comments: 2, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-08T15:00:00Z' },
  { id: '31', albumId: null, eventId: '3', url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80', likes: 27, comments: 5, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-08T16:00:00Z' },
  { id: '32', albumId: null, eventId: '3', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&q=80', likes: 14, comments: 1, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-08T17:00:00Z' },
  // Event 4 - Birthday party (Classic template)
  { id: '33', albumId: null, eventId: '4', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80', likes: 34, comments: 6, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-05T15:00:00Z' },
  { id: '34', albumId: null, eventId: '4', url: 'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=400&q=80', likes: 42, comments: 8, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-05T15:30:00Z' },
  { id: '35', albumId: null, eventId: '4', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&q=80', likes: 28, comments: 4, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-05T16:00:00Z' },
  { id: '36', albumId: null, eventId: '4', url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400&q=80', likes: 51, comments: 10, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-05T16:30:00Z' },
  { id: '37', albumId: null, eventId: '4', url: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=400&q=80', likes: 39, comments: 7, aspectRatio: 'portrait', downloadable: true, timestamp: '2024-12-05T17:00:00Z' },
  { id: '38', albumId: null, eventId: '4', url: 'https://images.unsplash.com/photo-1496843916299-590492c751f4?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1496843916299-590492c751f4?w=400&q=80', likes: 45, comments: 9, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-05T17:30:00Z' },
  { id: '39', albumId: null, eventId: '4', url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80', likes: 36, comments: 5, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-05T18:00:00Z' },
  { id: '40', albumId: null, eventId: '4', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80', likes: 58, comments: 12, aspectRatio: 'landscape', downloadable: true, timestamp: '2024-12-05T18:30:00Z' },
];

export const mockComments: Comment[] = [
  { id: '1', photoId: '5', userId: '1', userName: 'Sarah Johnson', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', text: 'This is absolutely gorgeous! Best photo of the day! 💕', timestamp: '2024-12-16T09:00:00Z' },
  { id: '2', photoId: '5', userId: '2', userName: 'Michael Chen', userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', text: 'Amazing capture! The lighting is perfect.', timestamp: '2024-12-16T10:30:00Z' },
  { id: '3', photoId: '5', userId: '3', userName: 'Emily Davis', userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', text: 'I cried when I saw this! So beautiful 😭', timestamp: '2024-12-16T11:00:00Z' },
  { id: '4', photoId: '3', userId: '1', userName: 'Sarah Johnson', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', text: 'The ceremony was so magical!', timestamp: '2024-12-16T12:00:00Z' },
  { id: '5', photoId: '8', userId: '4', userName: 'David Wilson', userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', text: 'You two look so happy together!', timestamp: '2024-12-16T14:00:00Z' },
];

export const mockPersonTags: PersonTag[] = [
  { id: '1', photoId: '5', name: 'Sarah (Bride)', thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', photoCount: 234 },
  { id: '2', photoId: '5', name: 'Michael (Groom)', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', photoCount: 198 },
  { id: '3', photoId: '3', name: 'Sarah (Bride)', thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', photoCount: 234 },
  { id: '4', photoId: '3', name: 'Michael (Groom)', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', photoCount: 198 },
  { id: '5', photoId: '3', name: 'Father of Bride', thumbnail: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', photoCount: 45 },
  { id: '6', photoId: '8', name: 'Sarah (Bride)', thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', photoCount: 234 },
  { id: '7', photoId: '8', name: 'Michael (Groom)', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', photoCount: 198 },
  { id: '8', photoId: '1', name: 'Sarah (Bride)', thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', photoCount: 234 },
];

export const mockSimilarPhotos: SimilarPhoto[] = [
  { id: '1', photoId: '5', similarPhotoId: '3', similarity: 0.92, reason: 'scene' },
  { id: '2', photoId: '5', similarPhotoId: '4', similarity: 0.88, reason: 'scene' },
  { id: '3', photoId: '5', similarPhotoId: '8', similarity: 0.85, reason: 'face' },
  { id: '4', photoId: '3', similarPhotoId: '5', similarity: 0.92, reason: 'scene' },
  { id: '5', photoId: '3', similarPhotoId: '10', similarity: 0.78, reason: 'face' },
  { id: '6', photoId: '8', similarPhotoId: '15', similarity: 0.90, reason: 'face' },
  { id: '7', photoId: '8', similarPhotoId: '9', similarity: 0.82, reason: 'scene' },
  { id: '8', photoId: '1', similarPhotoId: '12', similarity: 0.88, reason: 'scene' },
  { id: '9', photoId: '1', similarPhotoId: '2', similarity: 0.75, reason: 'color' },
];

export function getEventById(id: string): Event | undefined {
  return mockEvents.find((event) => event.id === id);
}

export function getPhotographerById(id: string): Photographer | undefined {
  return mockPhotographers.find((photographer) => photographer.id === id);
}

export function getAlbumsByEventId(eventId: string): Album[] {
  return mockAlbums.filter((album) => album.eventId === eventId);
}

export function getPhotosByEventId(eventId: string): Photo[] {
  return mockPhotos.filter((photo) => photo.eventId === eventId);
}

export function getPhotosByAlbumId(albumId: string): Photo[] {
  return mockPhotos.filter((photo) => photo.albumId === albumId);
}

export function getPhotoById(photoId: string): Photo | undefined {
  return mockPhotos.find((photo) => photo.id === photoId);
}

export function getCommentsByPhotoId(photoId: string): Comment[] {
  return mockComments.filter((comment) => comment.photoId === photoId);
}

export function getPersonTagsByPhotoId(photoId: string): PersonTag[] {
  return mockPersonTags.filter((tag) => tag.photoId === photoId);
}

export function getSimilarPhotos(photoId: string): Photo[] {
  const similarIds = mockSimilarPhotos
    .filter((s) => s.photoId === photoId)
    .sort((a, b) => b.similarity - a.similarity)
    .map((s) => s.similarPhotoId);
  return similarIds.map((id) => mockPhotos.find((p) => p.id === id)).filter(Boolean) as Photo[];
}

export function getSimilarPhotoReasons(photoId: string): Map<string, string> {
  const reasons = new Map<string, string>();
  mockSimilarPhotos
    .filter((s) => s.photoId === photoId)
    .forEach((s) => reasons.set(s.similarPhotoId, s.reason));
  return reasons;
}

// AI Search Mock Data
export const mockDetectedFaces: DetectedFace[] = [
  { id: '1', eventId: '1', name: 'Sarah (Bride)', thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80', photoCount: 234, samplePhotoIds: ['1', '3', '5', '8'] },
  { id: '2', eventId: '1', name: 'Michael (Groom)', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80', photoCount: 198, samplePhotoIds: ['3', '5', '8', '9'] },
  { id: '3', eventId: '1', name: 'Father of Bride', thumbnail: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80', photoCount: 45, samplePhotoIds: ['3', '10'] },
  { id: '4', eventId: '1', name: 'Mother of Bride', thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80', photoCount: 52, samplePhotoIds: ['1', '12'] },
  { id: '5', eventId: '1', name: 'Best Man', thumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80', photoCount: 38, samplePhotoIds: ['6', '11'] },
  { id: '6', eventId: '1', name: 'Maid of Honor', thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80', photoCount: 41, samplePhotoIds: ['1', '2', '12'] },
];

export const mockColorOptions: ColorOption[] = [
  { id: '1', name: 'Red', hex: '#EF4444', photoCount: 156 },
  { id: '2', name: 'Yellow', hex: '#EAB308', photoCount: 89 },
  { id: '3', name: 'Pink', hex: '#EC4899', photoCount: 112 },
  { id: '4', name: 'Blue', hex: '#3B82F6', photoCount: 78 },
  { id: '5', name: 'Green', hex: '#22C55E', photoCount: 45 },
  { id: '6', name: 'Purple', hex: '#A855F7', photoCount: 34 },
  { id: '7', name: 'Orange', hex: '#F97316', photoCount: 67 },
  { id: '8', name: 'White', hex: '#F8FAFC', photoCount: 203 },
  { id: '9', name: 'Gold', hex: '#CA8A04', photoCount: 124 },
  { id: '10', name: 'Maroon', hex: '#881337', photoCount: 98 },
];

export const mockOutfitTypes: OutfitType[] = [
  { id: '1', name: 'Saree', icon: '👗', photoCount: 145 },
  { id: '2', name: 'Lehenga', icon: '💃', photoCount: 89 },
  { id: '3', name: 'Sherwani', icon: '🤵', photoCount: 67 },
  { id: '4', name: 'Suit', icon: '👔', photoCount: 112 },
  { id: '5', name: 'Dress', icon: '👘', photoCount: 78 },
  { id: '6', name: 'Kurta', icon: '🥻', photoCount: 56 },
  { id: '7', name: 'Gown', icon: '👰', photoCount: 34 },
  { id: '8', name: 'Traditional', icon: '🪔', photoCount: 189 },
];

export const mockSearchSuggestions: SearchSuggestion[] = [
  { id: '1', text: 'Bride walking with parents', category: 'scene' },
  { id: '2', text: 'Yellow saree near lake', category: 'scene' },
  { id: '3', text: 'Stage dance performance', category: 'activity' },
  { id: '4', text: 'Family group photo', category: 'people' },
  { id: '5', text: 'Couple portraits at sunset', category: 'scene' },
  { id: '6', text: 'Bride with bridesmaids', category: 'people' },
  { id: '7', text: 'Haldi ceremony', category: 'activity' },
  { id: '8', text: 'Mandap decoration', category: 'scene' },
  { id: '9', text: 'Ring exchange moment', category: 'activity' },
  { id: '10', text: 'Candid laughing moments', category: 'emotion' },
  { id: '11', text: 'First dance together', category: 'activity' },
  { id: '12', text: 'Groom getting ready', category: 'scene' },
];

export function getDetectedFacesByEventId(eventId: string): DetectedFace[] {
  return mockDetectedFaces.filter((face) => face.eventId === eventId);
}

export function searchPhotosByFace(faceId: string): Photo[] {
  const face = mockDetectedFaces.find((f) => f.id === faceId);
  if (!face) return [];
  return face.samplePhotoIds.map((id) => mockPhotos.find((p) => p.id === id)).filter(Boolean) as Photo[];
}

export function searchPhotosByColor(colorId: string): Photo[] {
  // Mock: return random subset of photos based on color
  const shuffled = [...mockPhotos].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * 8) + 4);
}

export function searchPhotosByOutfit(outfitId: string): Photo[] {
  // Mock: return random subset of photos based on outfit
  const shuffled = [...mockPhotos].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * 8) + 4);
}

export function searchPhotosByPrompt(prompt: string): Photo[] {
  // Mock: return photos based on prompt keywords
  const lowerPrompt = prompt.toLowerCase();

  // Simple keyword matching for demo
  if (lowerPrompt.includes('bride') || lowerPrompt.includes('sarah')) {
    return mockPhotos.filter((p) => ['1', '3', '5', '8', '12'].includes(p.id));
  }
  if (lowerPrompt.includes('groom') || lowerPrompt.includes('michael')) {
    return mockPhotos.filter((p) => ['3', '5', '8', '9'].includes(p.id));
  }
  if (lowerPrompt.includes('ceremony') || lowerPrompt.includes('mandap')) {
    return mockPhotos.filter((p) => p.albumId === '2');
  }
  if (lowerPrompt.includes('reception') || lowerPrompt.includes('dance')) {
    return mockPhotos.filter((p) => p.albumId === '3');
  }
  if (lowerPrompt.includes('portrait') || lowerPrompt.includes('couple')) {
    return mockPhotos.filter((p) => p.albumId === '4');
  }

  // Default: return random subset
  const shuffled = [...mockPhotos].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * 10) + 5);
}

// Favorites Mock Data
export const mockFavoriteFolders: FavoriteFolder[] = [
  { id: '1', eventId: '1', name: 'Best Shots', color: '#EF4444', photoIds: ['5', '8', '15'], createdAt: '2024-12-16T10:00:00Z' },
  { id: '2', eventId: '1', name: 'Family Moments', color: '#3B82F6', photoIds: ['3', '10', '12'], createdAt: '2024-12-16T11:00:00Z' },
  { id: '3', eventId: '1', name: 'For Print', color: '#22C55E', photoIds: ['4', '9', '11'], createdAt: '2024-12-16T12:00:00Z' },
];

export const mockFavoritePhotos: FavoritePhoto[] = [
  { id: '1', eventId: '1', photoId: '5', folderId: '1', addedAt: '2024-12-16T10:30:00Z' },
  { id: '2', eventId: '1', photoId: '8', folderId: '1', addedAt: '2024-12-16T10:31:00Z' },
  { id: '3', eventId: '1', photoId: '15', folderId: '1', addedAt: '2024-12-16T10:32:00Z' },
  { id: '4', eventId: '1', photoId: '3', folderId: '2', addedAt: '2024-12-16T11:00:00Z' },
  { id: '5', eventId: '1', photoId: '10', folderId: '2', addedAt: '2024-12-16T11:01:00Z' },
  { id: '6', eventId: '1', photoId: '12', folderId: '2', addedAt: '2024-12-16T11:02:00Z' },
  { id: '7', eventId: '1', photoId: '4', folderId: '3', addedAt: '2024-12-16T12:00:00Z' },
  { id: '8', eventId: '1', photoId: '9', folderId: '3', addedAt: '2024-12-16T12:01:00Z' },
  { id: '9', eventId: '1', photoId: '11', folderId: '3', addedAt: '2024-12-16T12:02:00Z' },
  { id: '10', eventId: '1', photoId: '1', folderId: null, addedAt: '2024-12-16T09:00:00Z' },
  { id: '11', eventId: '1', photoId: '6', folderId: null, addedAt: '2024-12-16T09:30:00Z' },
  { id: '12', eventId: '1', photoId: '13', folderId: null, addedAt: '2024-12-16T09:45:00Z' },
];

export function getFavoriteFoldersByEventId(eventId: string): FavoriteFolder[] {
  return mockFavoriteFolders.filter((folder) => folder.eventId === eventId);
}

export function getFavoritePhotosByEventId(eventId: string): FavoritePhoto[] {
  return mockFavoritePhotos.filter((fav) => fav.eventId === eventId);
}

export function getFavoritePhotosByFolderId(folderId: string | null, eventId: string): Photo[] {
  const favoritePhotoIds = mockFavoritePhotos
    .filter((fav) => fav.eventId === eventId && fav.folderId === folderId)
    .map((fav) => fav.photoId);
  return mockPhotos.filter((photo) => favoritePhotoIds.includes(photo.id));
}

export function getAllFavoritePhotos(eventId: string): Photo[] {
  const favoritePhotoIds = mockFavoritePhotos
    .filter((fav) => fav.eventId === eventId)
    .map((fav) => fav.photoId);
  return mockPhotos.filter((photo) => favoritePhotoIds.includes(photo.id));
}

// Download Center Mock Data
export const mockDownloadSizes: DownloadSize[] = [
  { id: 'web', name: 'Web', label: 'Web Quality', dimensions: '1920 x 1280', estimatedSize: '~500 KB' },
  { id: 'medium', name: 'Medium', label: 'Medium Quality', dimensions: '3000 x 2000', estimatedSize: '~2 MB' },
  { id: 'full', name: 'Full', label: 'Full Resolution', dimensions: '6000 x 4000', estimatedSize: '~8 MB' },
  { id: 'raw', name: 'RAW', label: 'Original RAW', dimensions: 'Original', estimatedSize: '~25 MB', pricePerPhoto: 5 },
];

// Calculate expiry date (7 days from now)
const getExpiryDate = (daysFromNow: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
};

export const mockDownloadPackages: DownloadPackage[] = [
  {
    id: '1',
    eventId: '1',
    name: 'All Wedding Photos - Web',
    description: 'All 234 photos from Sarah & Michael Wedding',
    photoCount: 234,
    totalSize: '117 MB',
    expiresAt: getExpiryDate(5),
    createdAt: new Date().toISOString(),
    status: 'ready',
    downloadUrl: '#',
    sizeOption: 'web',
  },
  {
    id: '2',
    eventId: '1',
    name: 'Ceremony Photos - Full',
    description: '45 ceremony photos in full resolution',
    photoCount: 45,
    totalSize: '360 MB',
    expiresAt: getExpiryDate(3),
    createdAt: new Date().toISOString(),
    status: 'ready',
    downloadUrl: '#',
    sizeOption: 'full',
  },
  {
    id: '3',
    eventId: '1',
    name: 'Selected Favorites',
    description: '12 favorite photos in full resolution',
    photoCount: 12,
    totalSize: '96 MB',
    expiresAt: getExpiryDate(7),
    createdAt: new Date().toISOString(),
    status: 'processing',
    sizeOption: 'full',
  },
];

export const mockDownloadSettings: DownloadSettings = {
  eventId: '1',
  maxDownloadsPerUser: 3,
  allowedSizes: ['web', 'medium', 'full'],
  expiryDays: 7,
  watermarkEnabled: false,
};

export function getDownloadablePhotos(eventId: string): Photo[] {
  return mockPhotos.filter((photo) => photo.eventId === eventId && photo.downloadable !== false);
}

export function getDownloadPackagesByEventId(eventId: string): DownloadPackage[] {
  return mockDownloadPackages.filter((pkg) => pkg.eventId === eventId);
}

export function getDownloadSettings(eventId: string): DownloadSettings {
  return mockDownloadSettings;
}

// Photographer Portal Mock Data
export const mockPhotographerStats: PhotographerStats = {
  totalEvents: 24,
  totalPhotos: 4856,
  storageUsed: '45.2 GB',
  storageLimit: '100 GB',
  totalViews: 12453,
  totalDownloads: 1234,
  totalLikes: 3421,
  totalComments: 567,
};

export const mockActivityItems: ActivityItem[] = [
  { id: '1', type: 'comment', eventId: '1', eventName: 'Sarah & Michael Wedding', photoId: '5', clientName: 'Sarah Johnson', message: 'Left a comment on a photo', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: '2', type: 'like', eventId: '1', eventName: 'Sarah & Michael Wedding', photoId: '8', clientName: 'Michael Chen', message: 'Liked 3 photos', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: '3', type: 'download', eventId: '1', eventName: 'Sarah & Michael Wedding', clientName: 'Emily Davis', message: 'Downloaded 12 photos', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: '4', type: 'view', eventId: '2', eventName: 'Priya & Raj Engagement', clientName: 'New visitor', message: 'Viewed the gallery', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: '5', type: 'comment', eventId: '1', eventName: 'Sarah & Michael Wedding', photoId: '3', clientName: 'Jennifer Wilson', message: 'Left a comment on a photo', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: '6', type: 'download', eventId: '2', eventName: 'Priya & Raj Engagement', clientName: 'Priya Sharma', message: 'Downloaded all photos', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: '7', type: 'like', eventId: '1', eventName: 'Sarah & Michael Wedding', clientName: 'Robert Brown', message: 'Liked 8 photos', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
  { id: '8', type: 'upload', eventId: '1', eventName: 'Sarah & Michael Wedding', message: 'You uploaded 45 photos', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
];

export const mockClientVisits: ClientVisit[] = [
  { id: '1', eventId: '1', clientName: 'Sarah Johnson', clientEmail: 'sarah@email.com', visitedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), photosViewed: 234, photosLiked: 45, photosDownloaded: 23, commentsLeft: 5 },
  { id: '2', eventId: '1', clientName: 'Michael Chen', clientEmail: 'michael@email.com', visitedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), photosViewed: 156, photosLiked: 34, photosDownloaded: 12, commentsLeft: 2 },
  { id: '3', eventId: '1', clientName: 'Emily Davis', visitedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), photosViewed: 89, photosLiked: 12, photosDownloaded: 8, commentsLeft: 0 },
  { id: '4', eventId: '1', clientName: 'Jennifer Wilson', clientEmail: 'jen@email.com', visitedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), photosViewed: 67, photosLiked: 8, photosDownloaded: 0, commentsLeft: 3 },
  { id: '5', eventId: '1', clientName: 'Anonymous Guest', visitedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), photosViewed: 34, photosLiked: 0, photosDownloaded: 0, commentsLeft: 0 },
];

export const mockPhotographerProfile: PhotographerProfile = {
  id: '1',
  name: 'John Smith',
  email: 'john@smithphotography.com',
  phone: '+1 555-123-4567',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  bio: 'Professional wedding & event photographer with 10+ years of experience.',
  website: 'https://smithphotography.com',
  instagram: '@johnsmithphoto',
  subscription: 'pro',
  storageUsed: 45.2,
  storageLimit: 100,
  watermarkUrl: undefined,
  defaultTemplate: 'modern',
  notificationSettings: {
    emailOnComment: true,
    emailOnDownload: true,
    emailOnNewClient: true,
    pushNotifications: false,
  },
};

export const galleryTemplates = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, minimal design with large photos',
    preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop',
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#3b82f6' }
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional gallery layout with borders',
    preview: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    colors: { primary: '#1a1a2e', secondary: '#f5f5f5', accent: '#d4af37' }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'White space focused, text-light design',
    preview: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=300&fit=crop',
    colors: { primary: '#ffffff', secondary: '#f8f8f8', accent: '#333333' }
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Sophisticated dark theme with gold accents',
    preview: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=300&fit=crop',
    colors: { primary: '#0d0d0d', secondary: '#1a1a1a', accent: '#d4af37' }
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Bold editorial style with slider & social sidebar',
    preview: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#ffffff' }
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    description: 'Fixed navigation with alternating layouts',
    preview: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop',
    colors: { primary: '#1a1a1a', secondary: '#ffffff', accent: '#000000' }
  },
];

export function getPhotographerStats(): PhotographerStats {
  return mockPhotographerStats;
}

export function getRecentActivity(): ActivityItem[] {
  return mockActivityItems;
}

export function getClientVisitsByEventId(eventId: string): ClientVisit[] {
  return mockClientVisits.filter((v) => v.eventId === eventId);
}

export function getPhotographerProfile(): PhotographerProfile {
  return mockPhotographerProfile;
}
