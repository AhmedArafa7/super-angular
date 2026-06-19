import { Injectable, signal } from '@angular/core';

export interface Board {
  id: string;
  name: string;
  icon: string;
  mcu: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSerialService {
  // Core signals
  isConnected = signal<boolean>(false);
  logs = signal<string[]>([]);
  activeBoardId = signal<string>('arduino-uno');
  activeViewMode = signal<'simulator' | 'editor'>('simulator');
  activeSidebarView = signal<string>('boards');
  isTerminalOpen = signal<boolean>(true);

  codeContent = signal<string>(`void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(115200);
  Serial.println("Si-Neuro Core Board Active!");
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("[OK] Led D13 HIGH");
  delay(1000);
  digitalWrite(13, LOW);
  Serial.println("[OK] Led D13 LOW");
  delay(1000);
}`);

  boards: Board[] = [
    { id: 'arduino-uno', name: 'Arduino Uno', icon: '🇮🇹', mcu: 'ATmega328P' },
    { id: 'arduino-mega', name: 'Arduino Mega', icon: '🎛️', mcu: 'ATmega2560' },
    { id: 'esp32', name: 'ESP32 WiFi/BT', icon: '🌐', mcu: 'Xtensa DualCore' },
    { id: 'pi-pico', name: 'Raspberry Pi Pico', icon: '🍓', mcu: 'RP2040' }
  ];

  private port: any = null;
  private isReading = false;
  private simInterval: any = null;

  // Attempt real serial handshake, fallback to simulated stream
  async connect(): Promise<boolean> {
    this.logs.set([]);
    this.addLog("[INIT] جاري الاتصال بالجهاز...");

    if (!('serial' in navigator)) {
      this.addLog("[WARN] منفذ Web Serial غير معتمد في هذا المتصفح. تفعيل المحاكي العصبي...");
      this.startSimulation();
      this.isConnected.set(true);
      return true;
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      
      this.isConnected.set(true);
      this.isReading = true;
      this.addLog("[SUCCESS] متصل باللوحة الفيزيائية بنجاح!");
      this.readStream();
      return true;
    } catch (e: any) {
      this.addLog(`[ERROR] فشل الاتصال الفيزيائي: ${e.message}. تم تفعيل المحاكي.`);
      this.startSimulation();
      this.isConnected.set(true);
      return true;
    }
  }

  async disconnect(): Promise<void> {
    this.isReading = false;
    this.stopSimulation();

    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {}
      this.port = null;
    }

    this.isConnected.set(false);
    this.addLog("[INFO] تم قطع الاتصال باللوحة.");
  }

  // Real Web Serial Reader
  private async readStream(): Promise<void> {
    const decoder = new TextDecoder();
    while (this.port?.readable && this.isReading) {
      const reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          this.addLog(decoder.decode(value));
        }
      } catch (e) {
        break;
      } finally {
        reader.releaseLock();
      }
    }
  }

  // Simulated Logger fallback
  private startSimulation(): void {
    this.stopSimulation();
    this.addLog("[BOOT] Board flashing process active...");
    this.addLog("[BOOT] MCU: " + this.boards.find(b => b.id === this.activeBoardId())?.mcu);

    let counter = 0;
    this.simInterval = setInterval(() => {
      counter++;
      const dateStr = new Date().toLocaleTimeString();
      const state = counter % 2 === 0 ? "HIGH" : "LOW";
      this.addLog(`[${dateStr}] [OK] Led D13 ${state} - Signal cycle completed.`);
    }, 1500);
  }

  private stopSimulation(): void {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }

  addLog(msg: string): void {
    if (!msg.trim()) return;
    this.logs.update(list => [...list.slice(-100), msg.trim()]);
  }

  clearLogs(): void {
    this.logs.set([]);
  }

  // Simulate flash flashing overlay trigger
  flashCode(): void {
    this.addLog("[FLASH] Initiating compiling firmware binary...");
    setTimeout(() => {
      this.addLog("[FLASH] Uploading bytecode to chip...");
    }, 800);
    setTimeout(() => {
      this.addLog("[FLASH] Flashing 100% completed successfully!");
      if (this.isConnected()) {
        this.startSimulation();
      }
    }, 1800);
  }
}
