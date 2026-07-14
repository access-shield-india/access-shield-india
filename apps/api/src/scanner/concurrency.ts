/**
 * Simple concurrency limiter — replaces p-limit to avoid tsx ESM resolution issues in dev.
 */

export type ConcurrencyLimiter = <T>(fn: () => Promise<T>) => Promise<T>;

/**
 * Create a function that runs at most `concurrency` async tasks in parallel.
 */
export function createConcurrencyLimit(concurrency: number): ConcurrencyLimiter {
  let activeCount = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (activeCount >= concurrency || queue.length === 0) {
      return;
    }
    const run = queue.shift();
    run?.();
  };

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        activeCount++;
        void fn()
          .then(resolve, reject)
          .finally(() => {
            activeCount--;
            next();
          });
      };

      if (activeCount < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
}
