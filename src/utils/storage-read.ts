export const STORAGE_READ_TIMEOUT_MS = 8000;

export class StorageReadTimeout extends Error {
  constructor() { super('Local storage did not respond before the read deadline.'); this.name = 'StorageReadTimeout'; }
}

// A timeout is an error, never an absent save. Late reads cannot restore stale
// data after rejection; callers must retry instead of writing an empty draft.
export function readWithDeadline<T>(read: () => Promise<T>, timeoutMs = STORAGE_READ_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new StorageReadTimeout()), timeoutMs);
    Promise.resolve().then(read).then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
