import { MemoryCache } from '../../src/shared/cache/memoryCache';

describe('MemoryCache', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns undefined for a key that was never set', () => {
    const cache = new MemoryCache();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('returns a value before its TTL elapses', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-01T00:00:00Z'));
    const cache = new MemoryCache();
    cache.set('key', { count: 1 }, 1000);

    jest.setSystemTime(new Date('2026-08-01T00:00:00.999Z'));
    expect(cache.get('key')).toEqual({ count: 1 });
  });

  it('expires a value once its TTL has elapsed', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-01T00:00:00Z'));
    const cache = new MemoryCache();
    cache.set('key', 'value', 1000);

    jest.setSystemTime(new Date('2026-08-01T00:00:01.001Z'));
    expect(cache.get('key')).toBeUndefined();
  });

  it('delete() removes a single key without touching others', () => {
    const cache = new MemoryCache();
    cache.set('a', 1, 10_000);
    cache.set('b', 2, 10_000);

    cache.delete('a');

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
  });

  it('clear() drops every entry', () => {
    const cache = new MemoryCache();
    cache.set('a', 1, 10_000);
    cache.set('b', 2, 10_000);

    cache.clear();

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  describe('getOrSet', () => {
    it('computes and caches on a miss', async () => {
      const cache = new MemoryCache();
      const compute = jest.fn().mockResolvedValue('computed');

      const result = await cache.getOrSet('key', 10_000, compute);

      expect(result).toBe('computed');
      expect(compute).toHaveBeenCalledTimes(1);
      expect(cache.get('key')).toBe('computed');
    });

    it('never calls compute again on a hit', async () => {
      const cache = new MemoryCache();
      const compute = jest.fn().mockResolvedValue('computed');

      await cache.getOrSet('key', 10_000, compute);
      const second = await cache.getOrSet('key', 10_000, compute);

      expect(second).toBe('computed');
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it('recomputes once the cached value has expired', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-01T00:00:00Z'));
      const cache = new MemoryCache();
      const compute = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

      const first = await cache.getOrSet('key', 1000, compute);
      jest.setSystemTime(new Date('2026-08-01T00:00:02Z'));
      const second = await cache.getOrSet('key', 1000, compute);

      expect(first).toBe('first');
      expect(second).toBe('second');
      expect(compute).toHaveBeenCalledTimes(2);
    });
  });
});
