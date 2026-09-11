import { Injectable } from '@angular/core';

export interface InstanceHealth {
  url: string;
  consecutiveFailures: number;
  lastFailureTime: number;
  cooldownMs: number;
}

@Injectable({
  providedIn: 'root'
})
export class InstanceHealthRegistry {
  private healthMap = new Map<string, InstanceHealth>();
  private readonly DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  isAvailable(url: string): boolean {
    const health = this.healthMap.get(url);
    if (!health || health.consecutiveFailures < 2) return true;

    // Half-open retry window
    if (Date.now() - health.lastFailureTime > health.cooldownMs) {
      return true;
    }
    return false;
  }

  recordSuccess(url: string): void {
    this.healthMap.delete(url);
  }

  recordFailure(url: string): void {
    const health = this.healthMap.get(url) || {
      url,
      consecutiveFailures: 0,
      lastFailureTime: 0,
      cooldownMs: this.DEFAULT_COOLDOWN_MS
    };
    health.consecutiveFailures += 1;
    health.lastFailureTime = Date.now();
    this.healthMap.set(url, health);
  }

  filterAvailable(instances: string[]): string[] {
    const available = instances.filter(url => this.isAvailable(url));
    if (available.length === 0 && instances.length > 0) {
      // If all instances in cooldown, fallback to the oldest failed instance to avoid complete stalling
      let oldest = instances[0];
      let oldestTime = Infinity;
      for (const inst of instances) {
        const h = this.healthMap.get(inst);
        if (h && h.lastFailureTime < oldestTime) {
          oldestTime = h.lastFailureTime;
          oldest = inst;
        }
      }
      return [oldest];
    }
    return available;
  }
}
