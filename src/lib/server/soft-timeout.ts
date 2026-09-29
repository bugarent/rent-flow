/** Resolve with fallback if `promise` is slow or rejects (keeps navigations from hanging). */
export async function softTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  ms = 2000,
  onTimeout?: () => void,
): Promise<T> {
  let settled = false;
  try {
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        onTimeout?.();
        resolve(fallback);
      }, ms);
      promise.then(
        (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  } catch {
    return fallback;
  }
}
