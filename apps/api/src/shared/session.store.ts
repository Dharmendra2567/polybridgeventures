/** Dev-phase session pointer (replaced in Phase 2 with secure cookies). */
let currentSessionUserId: string | null = null;

export function getCurrentSessionUserId(): string | null {
  return currentSessionUserId;
}

export function setCurrentSessionUserId(userId: string): void {
  currentSessionUserId = userId;
}

export function clearCurrentSessionUserId(): void {
  currentSessionUserId = null;
}
