import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideDynamicIcon } from '@lucide/angular';
import { WebSerialService, Board } from '../../core/web-serial.service';

@Component({
  selector: 'app-microcontroller-lab',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './microcontroller-lab.component.html',
  styleUrls: ['./microcontroller-lab.component.scss']
})
export class MicrocontrollerLabComponent {
  serialService = inject(WebSerialService);
  sanitizer = inject(DomSanitizer);

  // Dynamic Wokwi Simulation embed URL
  get simulatorUrl(): SafeResourceUrl {
    const board = this.serialService.activeBoardId();
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://wokwi.com/projects/new/${board}?embed=1`);
  }

  // Toggle active view mode
  setViewMode(mode: 'simulator' | 'editor'): void {
    this.serialService.activeViewMode.set(mode);
  }

  // Sidebar controls
  setSidebarView(view: string): void {
    if (this.serialService.activeSidebarView() === view) {
      // Toggle off if clicked again
      this.serialService.activeSidebarView.set('');
    } else {
      this.serialService.activeSidebarView.set(view);
    }
  }

  // Connection controls
  async toggleConnection(): Promise<void> {
    if (this.serialService.isConnected()) {
      await this.serialService.disconnect();
    } else {
      await this.serialService.connect();
    }
  }

  // Flash action trigger
  handleFlash(): void {
    this.serialService.flashCode();
  }

  // Clear log logs
  clearLogs(): void {
    this.serialService.clearLogs();
  }

  // Toggle Terminal Panel height
  toggleTerminal(): void {
    this.serialService.isTerminalOpen.update(v => !v);
  }
}
