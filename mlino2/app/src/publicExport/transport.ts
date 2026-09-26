import { noteServerDate } from './clock';

export interface PublicExportTransport {
  read(): Promise<Uint8Array>;
}

export class FetchTransport implements PublicExportTransport {
  constructor(private readonly url: string, private readonly maxBytes = 2_000_000, private readonly timeoutMs = 10_000) {
    if (!url) throw new Error('PUBLIC_EXPORT_URL_REQUIRED');
  }

  async read(): Promise<Uint8Array> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('PUBLIC_EXPORT_FETCH_FAILED');
      // A copy the service worker kept while offline carries an old Date: it must not set the clock.
      if (!response.headers.get('x-mlino-offline')) noteServerDate(response.headers.get('date'));
      const length = Number(response.headers.get('content-length'));
      if (Number.isFinite(length) && length > this.maxBytes) throw new Error('PUBLIC_EXPORT_TOO_LARGE');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('PUBLIC_EXPORT_EMPTY_RESPONSE');
      const parts: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > this.maxBytes) throw new Error('PUBLIC_EXPORT_TOO_LARGE');
          parts.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size);
      let at = 0;
      for (const part of parts) { bytes.set(part, at); at += part.length; }
      return bytes;
    } finally { clearTimeout(timeout); }
  }
}

// In-memory file fixture port. It performs no I/O and is used by tests only.
export class FileTransport implements PublicExportTransport {
  constructor(private bytes: Uint8Array) {}
  replace(bytes: Uint8Array): void { this.bytes = bytes; }
  async read(): Promise<Uint8Array> { return new Uint8Array(this.bytes); }
}
