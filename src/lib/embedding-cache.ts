type CacheEntry<T> = {
  value: T;
  timestamp: number;
};

type EmbeddingCacheStats = {
  hits: number;
  misses: number;
  size: number;
};

class EmbeddingCache {
  private cache = new Map<string, CacheEntry<number[]>>();
  private hits = 0;
  private misses = 0;
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 10000, ttlSeconds = 300) {
    this.maxSize = maxSize;
    this.ttlMs = ttlSeconds * 1000;
  }

  private hashKey(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `${hash}-${text.length}`;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > this.ttlMs;
  }

  private evictIfNeeded(): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  get(text: string): number[] | null {
    const key = this.hashKey(text);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    entry.timestamp = Date.now();
    return entry.value;
  }

  set(text: string, embedding: number[]): void {
    this.evictIfNeeded();
    const key = this.hashKey(text);
    this.cache.set(key, {
      value: embedding,
      timestamp: Date.now(),
    });
  }

  invalidate(text: string): void {
    const key = this.hashKey(text);
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getStats(): EmbeddingCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
    };
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return this.hits / total;
  }
}

export const embeddingCache = new EmbeddingCache(
  10000,
  300,
);

export const getEmbeddingCacheStats = () => ({
  stats: embeddingCache.getStats(),
  hitRate: embeddingCache.getHitRate(),
});

export const invalidateEmbeddingCache = (text?: string) => {
  if (text) {
    embeddingCache.invalidate(text);
  } else {
    embeddingCache.invalidateAll();
  }
};

export type { EmbeddingCacheStats };
