export interface PlannerDataProvider {
  load<T extends { plan?: Record<string, unknown> }>(fallback: T): Promise<T>;
  save<T>(data: T): Promise<void>;
}

/**
 * Current provider: local browser storage.
 *
 * The app depends on this interface rather than calling localStorage directly.
 * Replace the implementation with the authenticated AWS API provider only
 * after Cognito sign-in, the API deployment and consent-based migration exist.
 * This browser provider is not cloud sync and must not be described as such.
 */
const browserStorageProvider: PlannerDataProvider = {
  async load<T extends { plan?: Record<string, unknown> }>(fallback: T): Promise<T> {
    try {
      const serialized = window.localStorage.getItem("payday-data-v1");
      if (!serialized) return fallback;
      const saved = JSON.parse(serialized) as Partial<T>;
      const merged = { ...fallback, ...saved } as T;

      if (fallback.plan && saved.plan) {
        merged.plan = { ...fallback.plan, ...saved.plan };
      }

      return merged;
    } catch {
      // Preserve the existing planner experience if storage is unavailable
      // or contains invalid JSON. Do not block the app from opening.
      return fallback;
    }
  },

  async save<T>(data: T): Promise<void> {
    try {
      window.localStorage.setItem("payday-data-v1", JSON.stringify(data));
    } catch (error) {
      // Browser storage can fail due to quota or browser privacy settings.
      // Surface this in development logs without crashing the planner.
      console.error("Payday could not save planner data to browser storage.", error);
    }
  },
};

export const plannerDataProvider = browserStorageProvider;
