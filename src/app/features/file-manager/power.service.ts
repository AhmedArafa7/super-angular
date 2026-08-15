import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PowerService {
  async getStatus() {
    if ((window as any).electronAPI) {
      return await (window as any).electronAPI.power.getStatus();
    }
    return { onBattery: false };
  }
}
