/** Bounded, memory-only cache. Each consumer receives an independent value. */
export class QueryCache {
  private readonly entries = new Map<string, { expiresAt: number; value: unknown }>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private generation = 0;

  constructor(private readonly maxEntries = 100, private readonly now = () => Date.now()) {}

  async read<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > this.now()) return structuredClone(cached.value as T);
    this.entries.delete(key);

    let request = this.pending.get(key) as Promise<T> | undefined;
    if (!request) {
      const generation = this.generation;
      request = Promise.resolve().then(load).then((value) => {
        if (generation === this.generation && ttlMs > 0) {
          for (const [entryKey, entry] of this.entries) {
            if (entry.expiresAt <= this.now()) this.entries.delete(entryKey);
          }
          if (this.entries.size >= this.maxEntries) {
            this.entries.delete(this.entries.keys().next().value!);
          }
          this.entries.set(key, { expiresAt: this.now() + ttlMs, value: structuredClone(value) });
        }
        return value;
      }).finally(() => {
        if (this.pending.get(key) === request) this.pending.delete(key);
      });
      this.pending.set(key, request);
    }
    return structuredClone(await request);
  }

  clear(): void {
    this.generation++;
    this.entries.clear();
    this.pending.clear();
  }
}
