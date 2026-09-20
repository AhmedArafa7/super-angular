import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CsharpToTsService, ConverterOptions, ConversionResult } from '../../core/services/csharp-to-ts.service';

export interface HistoryItem {
  id: string;
  title: string;
  timestamp: number;
  csharpCode: string;
}

@Component({
  selector: 'app-csharp-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './csharp-converter.component.html',
  styleUrls: ['./csharp-converter.component.scss']
})
export class CsharpConverterComponent implements OnInit {
  private converterService = inject(CsharpToTsService);

  // User's provided code as default!
  inputCode = signal<string>(`namespace Book.ServiceAbstraction.DTOs.Auth;

public record AuthResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public IList<string> Roles { get; set; } = [];
    public DateTime ExpiresOn { get; set; }
}`);

  // Conversion Options
  casing = signal<'camelCase' | 'PascalCase' | 'preserve'>('camelCase');
  nullableStyle = signal<'optional' | 'nullUnion' | 'both'>('optional');
  dateType = signal<'string' | 'Date'>('string');
  outputTarget = signal<'interface' | 'type' | 'class' | 'reactiveForm' | 'mockJson' | 'apiService'>('interface');
  includeReadonly = signal<boolean>(false);
  exportKeyword = signal<boolean>(true);
  respectJsonPropertyName = signal<boolean>(true);

  // UI state
  copiedTarget = signal<string | null>(null);
  showHistoryDrawer = signal<boolean>(false);
  historyList = signal<HistoryItem[]>([]);
  notificationMsg = signal<string | null>(null);

  // Computed Conversion Result
  conversionResult = computed<ConversionResult>(() => {
    const code = this.inputCode();
    const options: ConverterOptions = {
      casing: this.casing(),
      nullableStyle: this.nullableStyle(),
      dateType: this.dateType(),
      outputTarget: this.outputTarget(),
      includeReadonly: this.includeReadonly(),
      exportKeyword: this.exportKeyword(),
      respectJsonPropertyName: this.respectJsonPropertyName(),
      defaultNumberType: 'number'
    };

    return this.converterService.convert(code, options);
  });

  // Presets for quick switching
  presets = [
    {
      id: 'auth-response',
      title: 'AuthResponseDto (المثال الحالي)',
      badge: 'C# Record',
      code: `namespace Book.ServiceAbstraction.DTOs.Auth;

public record AuthResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public IList<string> Roles { get; set; } = [];
    public DateTime ExpiresOn { get; set; }
}`
    },
    {
      id: 'order-nested',
      title: 'طلب مع عناصر وقائمة (Order DTO)',
      badge: 'Nested Models',
      code: `namespace Shop.Application.DTOs;

public class OrderDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<OrderItemDto> Items { get; set; } = [];
    public Dictionary<string, string> Metadata { get; set; } = new();
}

public class OrderItemDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public enum OrderStatus
{
    Pending = 0,
    Processing = 1,
    Shipped = 2,
    Delivered = 3,
    Cancelled = 4
}`
    },
    {
      id: 'user-registration',
      title: 'تسجيل مستخدم مع سمات (Validation & Attributes)',
      badge: 'Attributes',
      code: `namespace Identity.DTOs;

public class RegisterRequestDto
{
    [JsonPropertyName("full_name")]
    public required string FullName { get; set; }

    [JsonPropertyName("email_address")]
    public required string Email { get; set; }

    public string Password { get; set; } = default!;
    public string? PhoneNumber { get; set; }
    public int? Age { get; set; }
    public bool AcceptTerms { get; set; }
    public DateTime? BirthDate { get; set; }
}`
    },
    {
      id: 'positional-record',
      title: 'سجل مختصر (Positional Record)',
      badge: 'C# 10+',
      code: `public record LoginRequestDto(string Email, string Password, bool RememberMe = false);

public record ChangePasswordDto(string OldPassword, string NewPassword, string ConfirmPassword);`
    }
  ];

  ngOnInit(): void {
    this.loadHistory();
  }

  // Load a preset
  loadPreset(preset: any): void {
    this.inputCode.set(preset.code);
    this.showToast(`تم تحميل نموذج: ${preset.title}`);
  }

  // Paste from clipboard
  async pasteFromClipboard(): Promise<void> {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          this.inputCode.set(text);
          this.saveToHistory();
          this.showToast('تم لصق الكود من الحافظة!');
        }
      }
    } catch {
      this.showToast('يرجى لصق الكود يدوياً (Ctrl + V)');
    }
  }

  // Copy output to clipboard
  async copyOutput(): Promise<void> {
    const code = this.conversionResult().code;
    if (!code) return;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      this.copiedTarget.set('output');
      this.showToast('تم نسخ الكود بنجاح إلى الحافظة! 🎉');
      setTimeout(() => this.copiedTarget.set(null), 2500);

      // Save to recent history
      this.saveToHistory();
    } catch {
      this.showToast('فشل النسخ التلقائي، يرجى تحديده يدوياً');
    }
  }

  // Download code as .ts file
  downloadFile(): void {
    const code = this.conversionResult().code;
    if (!code) return;

    const target = this.outputTarget();
    let ext = 'ts';
    if (target === 'mockJson') ext = 'json';

    const firstItem = this.conversionResult().items[0];
    const fileName = firstItem ? `${this.toKebabCase(firstItem.name)}.${ext}` : `dto-models.${ext}`;

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast(`تم تحميل الملف: ${fileName}`);
  }

  clearInput(): void {
    this.inputCode.set('');
    this.showToast('تم مسح حقل الإدخال');
  }

  // Local Storage History
  private saveToHistory(): void {
    const code = this.inputCode().trim();
    if (!code || code.length < 15) return;

    const items = this.conversionResult().items;
    const title = items.length > 0 ? items.map(i => i.name).join(', ') : 'C# DTO Snippet';

    const current = this.historyList();
    // Avoid duplicate title if last item is identical
    if (current.length > 0 && current[0].csharpCode === code) return;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      title,
      timestamp: Date.now(),
      csharpCode: code
    };

    const updated = [newItem, ...current.filter(i => i.csharpCode !== code)].slice(0, 15);
    this.historyList.set(updated);

    try {
      localStorage.setItem('super_csharp_to_ts_history', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem('super_csharp_to_ts_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.historyList.set(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load history from localStorage', e);
    }
  }

  recallHistoryItem(item: HistoryItem): void {
    this.inputCode.set(item.csharpCode);
    this.showHistoryDrawer.set(false);
    this.showToast(`تمت استعادة: ${item.title}`);
  }

  clearAllHistory(): void {
    this.historyList.set([]);
    try {
      localStorage.removeItem('super_csharp_to_ts_history');
    } catch {}
    this.showToast('تم مسح سجل التحويلات');
  }

  private showToast(msg: string): void {
    this.notificationMsg.set(msg);
    setTimeout(() => {
      if (this.notificationMsg() === msg) {
        this.notificationMsg.set(null);
      }
    }, 3000);
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}
