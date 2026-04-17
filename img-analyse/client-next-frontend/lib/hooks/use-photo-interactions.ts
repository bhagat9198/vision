'use client';

import { useState, useEffect, useCallback } from 'react';

interface PhotoInteraction {
  photoId: string;
  eventId: string;
  displayId?: number;
  likedAt?: string;
  favoritedAt?: string;
  thumbnail?: string;
  url?: string;
}

interface InteractionsState {
  likes: Record<string, PhotoInteraction>;
  favorites: Record<string, PhotoInteraction>;
}

const STORAGE_KEY = 'photoInteractions';
const API_URL = 'http://localhost:4000/api/v1';

function getStoredInteractions(): InteractionsState {
  if (typeof window === 'undefined') return { likes: {}, favorites: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse photo interactions', e);
  }
  return { likes: {}, favorites: {} };
}

function saveInteractions(state: InteractionsState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function usePhotoInteractions() {
  const [interactions, setInteractions] = useState<InteractionsState>({ likes: {}, favorites: {} });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load initial state
  useEffect(() => {
    // 1. Check Auth
    const token = localStorage.getItem('authToken');
    const authUserStr = localStorage.getItem('authUser');

    // Get or create session ID
    let currentSessionId = localStorage.getItem('guestSessionId');
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      localStorage.setItem('guestSessionId', currentSessionId);
    }
    setSessionId(currentSessionId);

    if (token && authUserStr) {
      // Authenticated Mode
      setIsAuthenticated(true);
      const user = JSON.parse(authUserStr);
      setUserEmail(user.email);

      // Fetch from API
      Promise.all([
        fetch(`${API_URL}/photos/me/likes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/photos/me/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      ]).then(async ([likesRes, favsRes]) => {
        if (likesRes.ok && favsRes.ok) {
          const likesData = await likesRes.json();
          const favsData = await favsRes.json();

          // Transform API response to state format
          const likesMap: Record<string, PhotoInteraction> = {};
          // Assuming API payload is { success: true, data: [] }
          const likesList = likesData.data || [];
          const favsList = favsData.data || [];

          likesList.forEach((item: any) => {
            likesMap[item.photoId] = item;
          });

          const favsMap: Record<string, PhotoInteraction> = {};
          favsList.forEach((item: any) => {
            favsMap[item.photoId] = item;
          });

          setInteractions({ likes: likesMap, favorites: favsMap });
        }
      }).catch(err => console.error('Failed to sync interactions', err))
        .finally(() => setIsLoaded(true));

    } else {
      // Guest Mode - LocalStorage
      const stored = getStoredInteractions();
      setInteractions(stored);
      setIsLoaded(true);
      setIsAuthenticated(false);
    }
  }, []);

  // Sync to API helper
  const syncAction = async (type: 'like' | 'favorite', photoId: string, actionData: any) => {
    const token = localStorage.getItem('authToken');
    // Allow if we have token OR session ID
    if (!token && !sessionId) return;

    try {
      const endpoint = type === 'like' ? 'like' : 'favorite';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body: any = {};
      if (userEmail) {
        body.userEmail = userEmail;
      } else {
        body.sessionId = sessionId;
      }

      await fetch(`${API_URL}/photos/${photoId}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.error(`Failed to sync ${type}`, e);
    }
  };

  // Check if photo is liked
  const isLiked = useCallback((photoId: string) => {
    return !!interactions.likes[photoId];
  }, [interactions.likes]);

  // Check if photo is favorited
  const isFavorited = useCallback((photoId: string) => {
    return !!interactions.favorites[photoId];
  }, [interactions.favorites]);

  // Toggle like
  const toggleLike = useCallback((photoId: string, eventId: string, thumbnail?: string, url?: string) => {
    setInteractions(prev => {
      const newState = { ...prev };
      const isLiking = !prev.likes[photoId];

      if (!isLiking) {
        // Unlike
        const { [photoId]: _, ...rest } = newState.likes;
        newState.likes = rest;
      } else {
        // Like
        newState.likes[photoId] = {
          photoId,
          eventId,
          likedAt: new Date().toISOString(),
          thumbnail,
          url,
        };
      }

      // Always sync to API, either with auth token or session ID
      syncAction('like', photoId, { userEmail });

      // Also save to local storage for guests as backup/persistence
      if (!isAuthenticated) {
        saveInteractions(newState);
      }

      return newState;
    });
  }, [isAuthenticated, userEmail, sessionId]);

  // Toggle favorite
  const toggleFavorite = useCallback((photoId: string, eventId: string, thumbnail?: string, url?: string) => {
    setInteractions(prev => {
      const newState = { ...prev };
      const isFavoriting = !prev.favorites[photoId];

      if (!isFavoriting) {
        // Unfavorite
        const { [photoId]: _, ...rest } = newState.favorites;
        newState.favorites = rest;
      } else {
        // Favorite
        newState.favorites[photoId] = {
          photoId,
          eventId,
          favoritedAt: new Date().toISOString(),
          thumbnail,
          url,
        };
      }

      // Always sync to API, either with auth token or session ID
      syncAction('favorite', photoId, { userEmail });

      // Also save to local storage for guests as backup/persistence
      if (!isAuthenticated) {
        saveInteractions(newState);
      }

      return newState;
    });
  }, [isAuthenticated, userEmail, sessionId]);

  // Get all favorites
  const getFavorites = useCallback(() => {
    return Object.values(interactions.favorites);
  }, [interactions.favorites]);

  // Get all likes
  const getLikes = useCallback(() => {
    return Object.values(interactions.likes);
  }, [interactions.likes]);

  // Get favorites count
  const favoritesCount = Object.keys(interactions.favorites).length;

  // Get likes count
  const likesCount = Object.keys(interactions.likes).length;

  return {
    isLoaded,
    isLiked,
    isFavorited,
    toggleLike,
    toggleFavorite,
    getFavorites,
    getLikes,
    favoritesCount,
    likesCount,
  };
}

export type { PhotoInteraction };

