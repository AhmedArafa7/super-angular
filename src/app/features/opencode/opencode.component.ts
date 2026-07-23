import { 
  Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, signal 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OpencodeService, OpenCodeConfig } from '../../core/services/opencode.service';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

@Component({
  selector: 'app-opencode',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './opencode.component.html',
  styleUrls: ['./opencode.component.scss']
})
export class OpencodeComponent implements OnInit, AfterViewInit, OnDestroy {
  opencodeService = inject(OpencodeService);
  private fb = inject(FormBuilder);

  @ViewChild('terminalContainer') terminalContainer!: ElementRef<HTMLDivElement>;

  connectForm!: FormGroup;
  showToken = signal<boolean>(false);
  
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private unbindDataListener: (() => void) | null = null;

  ngOnInit(): void {
    this.initForm();
    
    // Auto-fill form if saved config exists
    const saved = this.opencodeService.savedConfig();
    if (saved) {
      this.connectForm.patchValue({
        instanceUrl: saved.instanceUrl,
        authToken: saved.authToken
      });
    }
  }

  ngAfterViewInit(): void {
    if (this.opencodeService.isConnected()) {
      this.initTerminal();
    }
  }

  ngOnDestroy(): void {
    this.destroyTerminal();
  }

  private initForm(): void {
    this.connectForm = this.fb.group({
      instanceUrl: ['', [
        Validators.required,
        Validators.pattern(/^(https?:\/\/|wss?:\/\/)?([a-zA-Z0-9.-]+)(:[0-9]+)?(\/.*)?$/)
      ]],
      authToken: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  toggleShowToken(): void {
    this.showToken.update(v => !v);
  }

  async handleConnect(): Promise<void> {
    if (this.connectForm.invalid) {
      this.connectForm.markAllAsTouched();
      return;
    }

    const config: OpenCodeConfig = {
      instanceUrl: this.connectForm.value.instanceUrl.trim(),
      authToken: this.connectForm.value.authToken.trim()
    };

    const success = await this.opencodeService.connect(config);
    if (success) {
      setTimeout(() => {
        this.initTerminal();
      }, 100);
    }
  }

  async handleReconnect(): Promise<void> {
    const success = await this.opencodeService.connect();
    if (success && !this.terminal) {
      setTimeout(() => {
        this.initTerminal();
      }, 100);
    }
  }

  async handleReset(): Promise<void> {
    if (confirm('هل أنت تأكد من فصل الحساب ومسح بيانات الربط المخزنة محلياً؟')) {
      this.destroyTerminal();
      await this.opencodeService.resetConnection();
      this.connectForm.reset();
    }
  }

  clearTerminalScreen(): void {
    if (this.terminal) {
      this.terminal.clear();
    }
  }

  private initTerminal(): void {
    if (this.terminal || !this.terminalContainer) return;

    const elem = this.terminalContainer.nativeElement;
    elem.innerHTML = '';

    this.terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: '#0a0d14',
        foreground: '#e6edf3',
        cursor: '#38bdf8',
        selectionBackground: '#0284c744',
        black: '#1e293b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#38bdf8',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#f1f5f9',
        brightBlack: '#64748b',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#eab308',
        brightBlue: '#0284c7',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#ffffff'
      }
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    this.terminal.open(elem);
    this.fitAddon.fit();

    // Welcome banner in terminal
    this.terminal.writeln('\x1b[1;36m=== Super Code Assistant (OpenCode Terminal) ===\x1b[0m');
    this.terminal.writeln('\x1b[90mConnected directly via Secure P2P WebSocket.\x1b[0m\r\n');

    // Send user input to service
    this.terminal.onData((data: string) => {
      this.opencodeService.sendInput(data);
    });

    // Listen to output from service
    this.unbindDataListener = this.opencodeService.onData((data: string) => {
      this.terminal?.write(data);
    });

    // Observe size changes
    this.resizeObserver = new ResizeObserver(() => {
      try {
        this.fitAddon?.fit();
      } catch (err) {}
    });
    this.resizeObserver.observe(elem);
  }

  private destroyTerminal(): void {
    if (this.unbindDataListener) {
      this.unbindDataListener();
      this.unbindDataListener = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
      this.fitAddon = null;
    }
  }
}
