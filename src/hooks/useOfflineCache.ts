import { useState, useEffect, useCallback } from 'react';

const CACHE_PREFIX = 'offline_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const useOfflineCache = <T>(key: string, fetchFn: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const cacheKey = `${CACHE_PREFIX}${key}`;

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from cache
  const loadFromCache = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        const isExpired = Date.now() - entry.timestamp > CACHE_EXPIRY;
        if (!isExpired) {
          setLastUpdated(new Date(entry.timestamp));
          return entry.data;
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return null;
  }, [cacheKey]);

  // Save to cache
  const saveToCache = useCallback((newData: T) => {
    try {
      const entry: CacheEntry<T> = {
        data: newData,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }, [cacheKey]);

  // Fetch data with offline fallback
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // If offline, load from cache only
    if (isOffline) {
      const cachedData = loadFromCache();
      if (cachedData) {
        setData(cachedData);
      }
      setLoading(false);
      return;
    }

    try {
      const freshData = await fetchFn();
      setData(freshData);
      saveToCache(freshData);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fall back to cached data on error
      const cachedData = loadFromCache();
      if (cachedData) {
        setData(cachedData);
      }
    } finally {
      setLoading(false);
    }
  }, [isOffline, fetchFn, loadFromCache, saveToCache]);

  // Initial fetch
  useEffect(() => {
    // Try cache first for faster initial load
    const cachedData = loadFromCache();
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
    }
    
    // Then fetch fresh data if online
    if (!isOffline) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  // Refetch when coming back online
  useEffect(() => {
    if (!isOffline) {
      fetchData();
    }
  }, [isOffline]);

  return {
    data,
    loading,
    isOffline,
    lastUpdated,
    refetch: fetchData,
    saveToCache,
  };
};

// Helper to cache individual items
export const cacheItem = <T>(key: string, data: T) => {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error('Error caching item:', error);
  }
};

export const getCachedItem = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (cached) {
      const entry: CacheEntry<T> = JSON.parse(cached);
      const isExpired = Date.now() - entry.timestamp > CACHE_EXPIRY;
      if (!isExpired) {
        return entry.data;
      }
    }
  } catch (error) {
    console.error('Error getting cached item:', error);
  }
  return null;
};

export const clearCache = (key?: string) => {
  if (key) {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } else {
    // Clear all cached items
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }
};
