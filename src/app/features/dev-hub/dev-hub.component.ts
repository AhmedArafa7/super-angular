import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DevHubService } from './services/dev-hub.service';
import { 
  SpecializationId, 
  DevHubTab, 
  DevToolItem, 
  ArchitectureBlueprint, 
  AIPromptTemplate 
} from './models/dev-hub.models';

@Component({
  selector: 'app-dev-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './dev-hub.component.html',
  styleUrls: ['./dev-hub.component.scss']
})
export class DevHubComponent {
  hubService = inject(DevHubService);

  // Copy Feedback state
  copiedId = signal<string | null>(null);

  // Active modal or full preview for blueprint
  selectedBlueprint = signal<ArchitectureBlueprint | null>(null);
  selectedPrompt = signal<AIPromptTemplate | null>(null);
  promptVariables = signal<{ [key: string]: string }>({});

  // ----------------------------------------------------
  // Interactive Tools State
  // ----------------------------------------------------

  // 1. JSON to TypeScript / Formatter
  jsonInput = signal<string>(`{\n  "id": 101,\n  "title": "Super Dev Hub",\n  "isActive": true,\n  "tags": ["angular", "typescript", "tools"],\n  "metrics": {\n    "stars": 1250,\n    "rating": 4.9\n  }\n}`);
  jsonOutputMode = signal<'ts' | 'format' | 'minify'>('ts');
  jsonRootInterfaceName = signal<string>('SuperResponse');

  formattedJsonOrTs = computed(() => {
    const raw = this.jsonInput().trim();
    if (!raw) return '';

    try {
      const parsed = JSON.parse(raw);

      if (this.jsonOutputMode() === 'format') {
        return JSON.stringify(parsed, null, 2);
      }
      if (this.jsonOutputMode() === 'minify') {
        return JSON.stringify(parsed);
      }

      // Generate TypeScript Interfaces
      return this.generateTypeScriptTypes(parsed, this.jsonRootInterfaceName().trim() || 'RootObject');
    } catch (err: any) {
      return `❌ خطأ في تنسيق الـ JSON:\n${err.message}`;
    }
  });

  jsonSizeStats = computed(() => {
    const raw = this.jsonInput();
    const bytes = new Blob([raw]).size;
    const lines = raw.split('\n').length;
    return { bytes, kb: (bytes / 1024).toFixed(2), lines };
  });

  // 2. Regex Playground
  regexPattern = signal<string>(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}`);
  regexFlags = signal<string>('g');
  regexTestText = signal<string>(`مرحباً، يمكنك التواصل معنا عبر support@superapp.com أو admin@domain.org للمزيد من المعلومات.`);
  
  regexPresets = [
    { label: 'البريد الإلكتروني (Email)', pattern: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}`, flags: 'g' },
    { label: 'رابط ويب (URL/HTTP)', pattern: `https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)`, flags: 'gi' },
    { label: 'كلمة مرور قوية (Strong Password)', pattern: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$`, flags: '' },
    { label: 'أرقام هواتف دولية (Phone)', pattern: `\\+?[0-9]{1,4}?[-.\\s]?\\(?[0-9]{1,3}?\\)?[-.\\s]?[0-9]{1,4}[-.\\s]?[0-9]{1,9}`, flags: 'g' },
    { label: 'نصوص عربية فقط (Arabic Text)', pattern: `[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF]+`, flags: 'g' },
    { label: 'عناوين IPv4 (IP Address)', pattern: `\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b`, flags: 'g' },
    { label: 'كود اللون Hex Color (#FFF/#FFFFFF)', pattern: `#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})`, flags: 'gi' },
    { label: 'معرف UUID v4', pattern: `[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}`, flags: 'gi' }
  ];

  regexMatches = computed(() => {
    const pattern = this.regexPattern();
    const flags = this.regexFlags();
    const text = this.regexTestText();

    if (!pattern || !text) return { count: 0, items: [], isValid: true, error: '' };

    try {
      const reg = new RegExp(pattern, flags);
      const items: { match: string; index: number; groups?: string[] }[] = [];

      if (flags.includes('g')) {
        let match: RegExpExecArray | null;
        let limit = 0;
        while ((match = reg.exec(text)) !== null && limit < 100) {
          items.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1)
          });
          limit++;
          if (match.index === reg.lastIndex) reg.lastIndex++;
        }
      } else {
        const match = reg.exec(text);
        if (match) {
          items.push({ match: match[0], index: match.index, groups: match.slice(1) });
        }
      }

      return { count: items.length, items, isValid: true, error: '' };
    } catch (e: any) {
      return { count: 0, items: [], isValid: false, error: e.message };
    }
  });

  // 3. JWT Token Inspector
  jwtInput = signal<string>('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFobWVkIEFyYWZhIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNzk5OTk5OTk5fQ.kYvB5fXy_x2gB8mO_SuperDevSecretSignature');
  
  decodedJwt = computed(() => {
    const token = this.jwtInput().trim();
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) {
      return { isValid: false, error: 'رمز JWT غير مكتمل (يجب أن يتكون من 3 أجزاء مفصولة بنقاط).' };
    }

    try {
      const headerStr = this.base64UrlDecode(parts[0]);
      const payloadStr = this.base64UrlDecode(parts[1]);
      const signature = parts[2] || '';

      const header = JSON.parse(headerStr);
      const payload = JSON.parse(payloadStr);

      let isExpired = false;
      let expDateStr = '';
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        isExpired = expDate.getTime() < Date.now();
        expDateStr = expDate.toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'medium' });
      }

      return {
        isValid: true,
        header,
        payload,
        signature,
        isExpired,
        expDateStr
      };
    } catch (err: any) {
      return { isValid: false, error: `فشل فك تشفير الرمز: ${err.message}` };
    }
  });

  // 4. Crypto & Hash Lab
  cryptoInput = signal<string>('Hello Super Developers!');
  cryptoEncodingMode = signal<'base64' | 'url' | 'html' | 'uuid'>('base64');
  base64Output = signal<string>('');
  urlEncodedOutput = signal<string>('');
  sha256Result = signal<string>('');
  sha1Result = signal<string>('');
  uuidResult = signal<string>('');

  // 5. CSS Visual Lab
  cssGlassBlur = signal<number>(16);
  cssGlassOpacity = signal<number>(15);
  cssGlassBorderOpacity = signal<number>(20);
  cssGlassColor = signal<string>('#ffffff');
  cssGradientType = signal<'linear' | 'radial' | 'mesh'>('linear');
  cssGradientColor1 = signal<string>('#6366f1');
  cssGradientColor2 = signal<string>('#ec4899');
  cssGradientColor3 = signal<string>('#3b82f6');
  cssGradientAngle = signal<number>(135);

  // 6. Git Wizard
  selectedGitProblem = signal<string>('undo-last-commit');
  gitProblemOptions = [
    { id: 'undo-last-commit', title: 'التراجع عن آخر Commit مع الاحتفاظ بالتعديلات', cmd: 'git reset --soft HEAD~1', desc: 'يحذف آخر commit ويعيد التغييرات لمنطقة الـ Staged.' },
    { id: 'undo-and-discard', title: 'حذف آخر Commit والتخلص من التعديلات نهائياً', cmd: 'git reset --hard HEAD~1', desc: 'تحذير: هذا الأمر يحذف جميع التعديلات في آخر commit بدون إمكانية استرجاع.' },
    { id: 'change-last-msg', title: 'تعديل رسالة آخر Commit', cmd: 'git commit --amend -m "الرسالة الجديدة هنا"', desc: 'يعدل رسالة الـ commit الأخير دون إنشاء commit جديد.' },
    { id: 'discard-file', title: 'إلغاء تعديلات ملف معين واسترجاعه من المستودع', cmd: 'git checkout -- <file_path>', desc: 'يلغي أي تغييرات غير مسجلة في ملف محدد.' },
    { id: 'delete-remote-branch', title: 'حذف فرع بعيد (Remote Branch) من GitHub/GitLab', cmd: 'git push origin --delete <branch_name>', desc: 'يحذف الفرع المحدد من الخادم البعيد.' },
    { id: 'create-switch-branch', title: 'إنشاء فرع جديد والانتقال إليه فوراً', cmd: 'git checkout -b <new_branch_name>', desc: 'يفرع كودك الحالي في فرع جديد بضغطة واحدة.' },
    { id: 'cherry-pick', title: 'نسخ Commit معين من فرع آخر إلى فرعي الحالي', cmd: 'git cherry-pick <commit_hash>', desc: 'يأخذ تعديلات commit محدد فقط ويطبقها على الفرع النشط.' },
    { id: 'squash-commits', title: 'دمج آخر 3 كومتس في كومت واحد (Squash)', cmd: 'git reset --soft HEAD~3 && git commit -m "Merged feature commits"', desc: 'تنظيف تاريخ الـ Git بدمج الكومتس الصغيرة في كومت رئيسي مرتب.' }
  ];

  activeGitSolution = computed(() => {
    return this.gitProblemOptions.find(p => p.id === this.selectedGitProblem()) || this.gitProblemOptions[0];
  });

  // 7. HTTP & cURL Generator
  httpMethod = signal<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('POST');
  httpUrl = signal<string>('https://api.example.com/v1/users');
  httpAuthToken = signal<string>('Bearer super_secret_token_123');
  httpRequestBody = signal<string>(`{\n  "name": "Super Dev",\n  "email": "dev@super.app",\n  "role": "engineer"\n}`);

  generatedCurl = computed(() => {
    const method = this.httpMethod();
    const url = this.httpUrl().trim() || 'https://api.example.com';
    const auth = this.httpAuthToken().trim();
    const body = this.httpRequestBody().trim();

    let cmd = `curl -X ${method} "${url}" \\\n  -H "Content-Type: application/json"`;
    if (auth) {
      cmd += ` \\\n  -H "Authorization: ${auth}"`;
    }
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      const sanitized = body.replace(/\n/g, '').replace(/"/g, '\\"');
      cmd += ` \\\n  -d "${sanitized}"`;
    }
    return cmd;
  });

  generatedFetchCode = computed(() => {
    const method = this.httpMethod();
    const url = this.httpUrl().trim() || 'https://api.example.com';
    const auth = this.httpAuthToken().trim();
    const body = this.httpRequestBody().trim();

    const headersObj: any = { 'Content-Type': 'application/json' };
    if (auth) headersObj['Authorization'] = auth;

    let code = `const response = await fetch("${url}", {\n  method: "${method}",\n  headers: ${JSON.stringify(headersObj, null, 4)}`;
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      code += `,\n  body: JSON.stringify(${body.replace(/\n/g, '\n  ')})`;
    }
    code += `\n});\nconst data = await response.json();\nconsole.log(data);`;
    return code;
  });

  // 8. Cron Schedule Generator
  cronMin = signal<string>('*/15');
  cronHour = signal<string>('*');
  cronDayMonth = signal<string>('*');
  cronMonth = signal<string>('*');
  cronDayWeek = signal<string>('*');

  fullCronExpression = computed(() => {
    return `${this.cronMin()} ${this.cronHour()} ${this.cronDayMonth()} ${this.cronMonth()} ${this.cronDayWeek()}`;
  });

  cronHumanReadable = computed(() => {
    const min = this.cronMin();
    const hour = this.cronHour();
    const dMonth = this.cronDayMonth();
    const month = this.cronMonth();
    const dWeek = this.cronDayWeek();

    let arDesc = '';
    if (min === '*' && hour === '*') arDesc = 'يتم التنفيذ كل دقيقة باستمرار.';
    else if (min.startsWith('*/')) arDesc = `يتم التنفيذ كل ${min.replace('*/', '')} دقيقة.`;
    else if (hour.startsWith('*/') && min === '0') arDesc = `يتم التنفيذ كل ${hour.replace('*/', '')} ساعات في الدقيقة 0.`;
    else if (hour !== '*' && min !== '*') arDesc = `يتم التنفيذ يومياً في الساعة ${hour}:${min.padStart(2, '0')}.`;
    else arDesc = `جدولة مخصصة: [دقيقة: ${min}] [ساعة: ${hour}] [يوم الشهر: ${dMonth}] [الشهر: ${month}] [يوم الأسبوع: ${dWeek}]`;

    return arDesc;
  });

  // 9. SEO & Meta Tags
  seoTitle = signal<string>('منصة سوبر للمطورين | Super Developer Hub');
  seoDescription = signal<string>('أفضل وأشمل منصة أدوات ومصادر للمطورين بمختلف التخصصات البرمجية.');
  seoKeywords = signal<string>('برمجة, أدوات مطورين, typescript, angular, react, python, devops');
  seoUrl = signal<string>('https://super.app/dev-hub');
  seoImageUrl = signal<string>('https://super.app/assets/og-preview.jpg');

  generatedMetaHtml = computed(() => {
    return `<!-- Primary Meta Tags -->
<title>${this.seoTitle()}</title>
<meta name="title" content="${this.seoTitle()}">
<meta name="description" content="${this.seoDescription()}">
<meta name="keywords" content="${this.seoKeywords()}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="${this.seoUrl()}">
<meta property="og:title" content="${this.seoTitle()}">
<meta property="og:description" content="${this.seoDescription()}">
<meta property="og:image" content="${this.seoImageUrl()}">

<!-- Twitter Card -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${this.seoUrl()}">
<meta property="twitter:title" content="${this.seoTitle()}">
<meta property="twitter:description" content="${this.seoDescription()}">
<meta property="twitter:image" content="${this.seoImageUrl()}">`;
  });

  // ----------------------------------------------------
  // Lifecycle & Helpers
  // ----------------------------------------------------

  selectTrack(id: SpecializationId): void {
    this.hubService.setTrack(id);
  }

  selectTab(tab: DevHubTab): void {
    this.hubService.setTab(tab);
  }

  copyToClipboard(text: string, id: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.copiedId.set(id);
      setTimeout(() => {
        if (this.copiedId() === id) {
          this.copiedId.set(null);
        }
      }, 2500);
    }
  }

  openBlueprintModal(bp: ArchitectureBlueprint): void {
    this.selectedBlueprint.set(bp);
  }

  closeBlueprintModal(): void {
    this.selectedBlueprint.set(null);
  }

  openPromptModal(prompt: AIPromptTemplate): void {
    this.selectedPrompt.set(prompt);
    const initialVars: { [key: string]: string } = {};
    prompt.variables.forEach(v => initialVars[v] = '');
    this.promptVariables.set(initialVars);
  }

  closePromptModal(): void {
    this.selectedPrompt.set(null);
  }

  getFilledPrompt(): string {
    const prompt = this.selectedPrompt();
    if (!prompt) return '';
    let text = prompt.prompt;
    const vars = this.promptVariables();
    Object.keys(vars).forEach(k => {
      const val = vars[k] || `[${k}]`;
      text = text.replace(new RegExp(`{{${k}}}`, 'g'), val);
    });
    return text;
  }

  updatePromptVariable(key: string, value: string): void {
    this.promptVariables.update(v => ({ ...v, [key]: value }));
  }

  // Generate Crypto Hashes in Browser using Web Crypto API
  async calculateCryptoHashes(): Promise<void> {
    const str = this.cryptoInput();
    if (!str || typeof crypto === 'undefined' || !crypto.subtle) return;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);

      // SHA-256
      const hashBuffer256 = await crypto.subtle.digest('SHA-256', data);
      const hashArray256 = Array.from(new Uint8Array(hashBuffer256));
      this.sha256Result.set(hashArray256.map(b => b.toString(16).padStart(2, '0')).join(''));

      // SHA-1
      const hashBuffer1 = await crypto.subtle.digest('SHA-1', data);
      const hashArray1 = Array.from(new Uint8Array(hashBuffer1));
      this.sha1Result.set(hashArray1.map(b => b.toString(16).padStart(2, '0')).join(''));

      // Base64
      this.base64Output.set(btoa(unescape(encodeURIComponent(str))));

      // URL Encoded
      this.urlEncodedOutput.set(encodeURIComponent(str));

      // UUID
      this.uuidResult.set(crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }));
    } catch (e) {
      console.warn('Crypto calculation fallback:', e);
    }
  }

  decodeBase64(): void {
    try {
      const decoded = decodeURIComponent(escape(atob(this.cryptoInput())));
      this.base64Output.set(decoded);
    } catch (e: any) {
      this.base64Output.set(`❌ خطأ في فك ترميز Base64: ${e.message}`);
    }
  }

  decodeUrl(): void {
    try {
      const decoded = decodeURIComponent(this.cryptoInput());
      this.urlEncodedOutput.set(decoded);
    } catch (e: any) {
      this.urlEncodedOutput.set(`❌ خطأ في فك ترميز URL: ${e.message}`);
    }
  }

  generateRandomUuid(): void {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      this.uuidResult.set(crypto.randomUUID());
    } else {
      this.uuidResult.set('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }));
    }
  }

  // TypeScript interface generator helper
  private generateTypeScriptTypes(obj: any, rootName: string): string {
    const interfaces: Map<string, string> = new Map();

    const parseObject = (data: any, name: string): string => {
      if (data === null) return 'any';
      if (Array.isArray(data)) {
        if (data.length === 0) return 'any[]';
        const innerType = parseObject(data[0], `${name}Item`);
        return `${innerType}[]`;
      }
      if (typeof data === 'object') {
        const lines: string[] = [];
        const typeName = name.charAt(0).toUpperCase() + name.slice(1);

        for (const [key, value] of Object.entries(data)) {
          const childTypeName = `${typeName}_${key.charAt(0).toUpperCase() + key.slice(1)}`;
          const childType = parseObject(value, childTypeName);
          lines.push(`  ${key}: ${childType};`);
        }

        const interfaceCode = `export interface ${typeName} {\n${lines.join('\n')}\n}`;
        interfaces.set(typeName, interfaceCode);
        return typeName;
      }
      return typeof data;
    };

    parseObject(obj, rootName);
    return Array.from(interfaces.values()).reverse().join('\n\n');
  }

  private base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(
      Array.prototype.map.call(atob(base64), (c: string) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
  }
}
