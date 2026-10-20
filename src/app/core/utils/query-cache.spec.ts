import { QueryCache } from './query-cache';

describe('QueryCache', () => {
  it('shares simultaneous reads and isolates consumer changes', async () => {
    const cache = new QueryCache();
    const load = jasmine.createSpy<() => Promise<Array<{ id: number }>>>().and.resolveTo([{ id: 1 }]);
    const [first, second] = await Promise.all([
      cache.read('catalog', 1000, load), cache.read('catalog', 1000, load)
    ]);
    first[0].id = 9;
    expect(second[0].id).toBe(1);
    expect((await cache.read('catalog', 1000, load))[0].id).toBe(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('expires from completion and reloads at expiry', async () => {
    let now = 0;
    const cache = new QueryCache(100, () => now);
    const load = jasmine.createSpy().and.callFake(async () => { now += 10; return now; });
    expect(await cache.read('a', 100, load)).toBe(10);
    now = 109;
    expect(await cache.read('a', 100, load)).toBe(10);
    now = 110;
    expect(await cache.read('a', 100, load)).toBe(120);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed loads', async () => {
    const cache = new QueryCache();
    await expectAsync(cache.read('a', 1000, async () => { throw new Error('network'); })).toBeRejected();
    expect(await cache.read('a', 1000, async () => 2)).toBe(2);
  });

  it('invalidates cached values after writes or session changes', async () => {
    const cache = new QueryCache();
    await cache.read('a', 1000, async () => 1);
    cache.clear();
    expect(await cache.read('a', 1000, async () => 2)).toBe(2);
  });

  it('does not let an invalidated in-flight read overwrite a new value', async () => {
    const cache = new QueryCache();
    let resolve!: (value: number) => void;
    const oldRead = cache.read('a', 1000, () => new Promise<number>((done) => { resolve = done; }));
    await Promise.resolve();
    cache.clear();
    expect(await cache.read('a', 1000, async () => 2)).toBe(2);
    resolve(1);
    await oldRead;
    expect(await cache.read('a', 1000, async () => 3)).toBe(2);
  });

  it('bounds stored entries and keeps parameter keys separate', async () => {
    const cache = new QueryCache(2);
    await cache.read('es', 1000, async () => 1);
    await cache.read('en', 1000, async () => 2);
    await cache.read('fr', 1000, async () => 3);
    expect(await cache.read('en', 1000, async () => 9)).toBe(2);
    expect(await cache.read('es', 1000, async () => 4)).toBe(4);
  });
});
