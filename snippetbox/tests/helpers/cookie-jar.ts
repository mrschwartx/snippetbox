interface Entry {
  value: string;
  options: Record<string, unknown>;
}

class CookieJar {
  private store = new Map<string, Entry>();

  get(name: string) {
    const entry = this.store.get(name);
    return entry ? { name, value: entry.value } : undefined;
  }

  getAll() {
    return [...this.store].map(([name, entry]) => ({ name, value: entry.value }));
  }

  has(name: string) {
    return this.store.has(name);
  }

  set(name: string, value: string, options: Record<string, unknown> = {}) {
    this.store.set(name, { value, options });
  }

  delete(name: string) {
    this.store.delete(name);
  }

  optionsOf(name: string) {
    return this.store.get(name)?.options;
  }

  clear() {
    this.store.clear();
  }
}

export const cookieJar = new CookieJar();
