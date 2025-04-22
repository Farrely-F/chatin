export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    const serializedValue =
      typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`Error setting localStorage key “${key}”:`, error);
  }
}

export function getLocalStorage<T = string>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;

    try {
      return JSON.parse(item);
    } catch {
      // Fallback if not JSON
      return item as T;
    }
  } catch (error) {
    console.error(`Error getting localStorage key “${key}”:`, error);
    return null;
  }
}

export function removeLocalStorage(key: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing localStorage key “${key}”:`, error);
  }
}
