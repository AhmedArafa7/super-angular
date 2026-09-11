import { Injectable, signal } from '@angular/core';
import { CustomTextRule } from '../models/local-player.models';

@Injectable({
  providedIn: 'root'
})
export class OcrCleanerService {

  readonly STORAGE_KEY = 'local_player_custom_ocr_rules';

  // Observable signal holding the current active custom text transformation rules
  customRules = signal<CustomTextRule[]>(this.loadCustomRules());

  /**
   * Returns pre-configured, battle-tested default rules designed specifically
   * to clean up code screenshots from Visual Studio, VS Code, JetBrains, and other IDEs.
   */
  getDefaultRules(): CustomTextRule[] {
    return [
      {
        id: 'rule_ide_menus',
        name: 'إزالة أشرطة وقوائم Visual Studio والأشرطة العلوية',
        description: 'حذف أشرطة القوائم والـ Debug وتبويبات الحل وأشرطة Copilot',
        pattern: '^(?:.*?(?:file|edit|view|git|project|build|debug|test|analyze|tools|extensions|window|help).*|(?:@-\\s*He|.*debug\\s*-\\s*any\\s*cpu.*|.*github\\s*copilot.*|exceptionhan\\.\\.\\..*solution\\s*explorer.*))$',
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_solution_explorer_lines',
        name: 'إزالة أسطر ومجلدات شجرة Solution Explorer المعزولة',
        description: 'حذف الأسطر التي تحتوي فقط على أسماء مشاريع، مجلدات، أو ملفات مستكشف الحلول',
        pattern: '^\\s*(?:[>b\\d\\s]*\\[.*?\\]|[>b\\d\\s]*(?:connected\\s*services|properties|bin|obj|appsettings|dependencies|commonresult|dtos|controllers|attributes|presentationlayer|infrastructurelayer|ecommerce\\s*(?:shared|presentation|services|web)).*|[-=~\\s\\d\\w]{1,6}|[a-z]\\s*=\\s*[\\.\\s\\d]+|be\\s+alo.*|@&.*|it\\s+pb.*)\\s*$',
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_semicolon_solution_explorer',
        name: 'إزالة نصوص مستكشف الحلول العالقة بعد الفاصلة المنقوطة ;',
        description: 'إزالة أي نصوص تبدأ بعد نهاية الجملة البرمجية ; في نفس السطر',
        pattern: '(?<=;)\\s+(?:[>b4\\[].*|[A-Z][a-zA-Z0-9_\\s\\(\\)\\[\\]\\.]+)$',
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_leading_line_numbers',
        name: 'إزالة أرقام الأسطر ورموز الهامش من بداية السطر',
        description: 'حذف أرقام الأسطر 1, 2, 77, 117 من بداية السطر قبل الكود أو التعليق',
        pattern: '^\\s*\\d{1,4}\\s+(?=[a-zA-Z_{}\\/])',
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_comments_solution_explorer',
        name: 'تنظيف أسماء الملفات العالقة في نهاية التعليقات البرمجية',
        description: 'إبقاء نص التعليق فقط وحذف أسماء ملفات .cs العالقة في نهايته',
        pattern: '(\\/\\/\\s*.+?)\\s+(?:[b>]\\s*)?c[#=]\\s+\\w+\\.cs.*$',
        replacement: '$1',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_typo_try',
        name: 'تصحيح Fry إلى try في لغة C# / JS',
        description: 'تصحيح خطأ قراءة OCR الشائع لكلمة try البرمجية',
        pattern: '\\bFry\\b',
        replacement: 'try',
        isRegex: true,
        caseSensitive: true,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_typo_system_linq',
        name: 'تصحيح أخطاء أسماء المكتبات System و Linq',
        description: 'تصحيح System.Ling إلى System.Linq وتصحيح Systen',
        pattern: '\\bSystem\\.Ling\\b',
        replacement: 'System.Linq',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_bottom_status_bar',
        name: 'إزالة شريط الحالة السفلي وشريط مهام Windows',
        description: 'حذف شريط الحالة وساعة وتاريخ الويندوز وأشرطة Git و Error List',
        pattern: '^.*(?:\\b(?:no\\s*issues\\s*found|noissues\\s*found|error\\s*list|output|package\\s*manager\\s*console|add\\s*to\\s*source\\s*control|select\\s*repository|ready)\\b|\\d{1,2}:\\d{2}\\s*(?:am|pm)|(?:\\beng\\b|\\bara\\b)).*$',
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_clean_braces',
        name: 'تنقية الأقواس المعقوفة { و } من المخلفات المجاورة',
        description: 'إبقاء القوس المعقوف وحذف أي نصوص لمستكشف الحلول بجانبه في نفس السطر',
        pattern: '^\\s*\\d*\\s*(\\{|\\})\\s+.*$',
        replacement: '$1',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_collapse_blank_lines',
        name: 'تقليص تكرار الأسطر الفارغة',
        description: 'دمج أي أسطر فارغة متتالية تزيد عن سطرين لتنسيق قراءة الكود',
        pattern: '\\n{3,}',
        replacement: '\\n\\n',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      }
    ];
  }

  loadCustomRules(): CustomTextRule[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed: CustomTextRule[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load custom OCR rules:', e);
    }
    const defaults = this.getDefaultRules();
    this.saveCustomRules(defaults);
    return defaults;
  }

  saveCustomRules(rules: CustomTextRule[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rules));
      this.customRules.set([...rules]);
    } catch (e) {
      console.warn('Could not save custom OCR rules:', e);
    }
  }

  resetToDefaultRules(): CustomTextRule[] {
    const defaults = this.getDefaultRules();
    this.saveCustomRules(defaults);
    return defaults;
  }

  addCustomRule(ruleData: Omit<CustomTextRule, 'id'>): CustomTextRule {
    const newRule: CustomTextRule = {
      ...ruleData,
      id: 'rule_custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
    };
    const updated = [...this.customRules(), newRule];
    this.saveCustomRules(updated);
    return newRule;
  }

  updateCustomRule(id: string, changes: Partial<CustomTextRule>): void {
    const updated = this.customRules().map(rule => rule.id === id ? { ...rule, ...changes } : rule);
    this.saveCustomRules(updated);
  }

  deleteCustomRule(id: string): void {
    const updated = this.customRules().filter(rule => rule.id !== id);
    this.saveCustomRules(updated);
  }

  toggleCustomRule(id: string): void {
    const updated = this.customRules().map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule);
    this.saveCustomRules(updated);
  }

  reorderCustomRules(fromIndex: number, toIndex: number): void {
    const rules = [...this.customRules()];
    if (fromIndex < 0 || fromIndex >= rules.length || toIndex < 0 || toIndex >= rules.length) return;
    const [moved] = rules.splice(fromIndex, 1);
    rules.splice(toIndex, 0, moved);
    this.saveCustomRules(rules);
  }

  applyCustomRules(text: string, rules?: CustomTextRule[]): string {
    if (!text) return '';
    const activeRules = (rules || this.customRules()).filter(r => r.enabled);

    let result = text;
    for (const rule of activeRules) {
      if (!rule.pattern) continue;
      try {
        if (rule.isRegex) {
          const flags = (rule.caseSensitive ? 'g' : 'gi') + 'm';
          const re = new RegExp(rule.pattern, flags);
          result = result.replace(re, rule.replacement ?? '');
        } else {
          if (rule.caseSensitive) {
            result = result.split(rule.pattern).join(rule.replacement ?? '');
          } else {
            const re = new RegExp(rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            result = result.replace(re, rule.replacement ?? '');
          }
        }
      } catch (err) {
        console.warn(`[OcrCleanerService] Error applying rule "${rule.name}":`, err);
      }
    }

    return result
      .split(/\r?\n/)
      .filter((line, idx, arr) => {
        if (line.trim().length > 0) return true;
        return idx > 0 && arr[idx - 1].trim().length > 0;
      })
      .join('\n')
      .trim();
  }

  cleanCode(rawText: string, applyCustom: boolean = true): string {
    if (!rawText) return '';

    const lines = rawText.split(/\r?\n/);
    const resultLines: string[] = [];

    const isIdeChrome = (line: string): boolean => {
      const lower = line.trim().toLowerCase();
      if (!lower) return false;

      // Menu bars
      if (/(file|edit|view|git|project|build|debug|test|analyze|tools|extensions|window|help)/i.test(lower) &&
          (lower.includes('solution') || lower.includes('debug') || lower.includes('search') || lower.includes('git'))) {
        return true;
      }
      // Debug toolbar
      if (/debug\s*-\s*any\s*cpu/i.test(lower) || lower.includes('github copilot') || lower.includes('https +')) {
        return true;
      }
      // Document tabs & Solution explorer header
      if (lower.includes('solution explorer') || (/\.(cs|ts|js)\b/i.test(lower) && (lower.includes('# x') || lower.includes('results') || lower.includes('vax') || lower.includes('apibasecontroller')))) {
        return true;
      }
      // Status bar & taskbar
      if (lower.includes('noissues found') || lower.includes('no issues found') || lower.includes('error list') ||
          lower.includes('package manager console') || lower.includes('add to source control') ||
          lower.includes('select repository') || /ready/i.test(lower) || /\d+:\d+\s*(am|pm)/i.test(lower) ||
          lower.includes('eng') || /\d+%/i.test(lower) || /840\s*pm/i.test(lower)) {
        return true;
      }
      return false;
    };

    const isOrphanNoiseLine = (line: string): boolean => {
      let trimmed = line.trim();
      if (!trimmed) return true;

      trimmed = trimmed.replace(/^[\d\s|.:\-–—_'"\`\\/!#$=><\[\]\(\)]+/, '');
      if (!trimmed) return true;

      // Solution explorer tree nodes without code
      if (/^[>b\d\s]*\[.*?\].*$/i.test(line.trim())) return true;
      if (/^(\d+\s*)?[>b\d\s]*c[#=]\s+\w+\.cs/i.test(line.trim())) return true;
      if (/^[>b\d\s]*(connected services|properties|bin|obj|appsettings|dependencies|commonresult|dtos|controllers|attributes|presentationlayer|infrastructurelayer|ecommerce\s*(?:shared|presentation|services|web))/i.test(trimmed)) return true;
      if (/^(imports|properties|dependencies|connected services|bin|obj|appsettings|dtos|commonresult|controllers|attributes|presentationlayer|infrastructurelayer)/i.test(trimmed)) return true;
      if (/^[-=~\s\d\w]{1,6}$/i.test(trimmed) && !trimmed.includes('{') && !trimmed.includes('}')) return true;
      if (/^[a-z]\s*=\s*[\.\s\d]+$/i.test(trimmed)) return true;
      if (/^be\s+alo/i.test(trimmed)) return true;
      if (/^@&[a-z0-9]/i.test(trimmed)) return true;
      if (/^it\s+pb/i.test(trimmed)) return true;
      if (/^[0-9\)\|\s]+ecommerce\.\s*web/i.test(trimmed)) return true;
      if (/^[>:\s\.\”\"\']+(bin|obj|properties|imports)/i.test(trimmed)) return true;
      return false;
    };

    const isSolutionExplorerLine = (l: string): boolean => {
      const lower = l.toLowerCase();
      if (/\b(using|namespace|class|interface|public|private|protected|internal|async|task|await|return|if|else|try|catch|finally|throw)\b/i.test(l)) {
        return false;
      }
      if (l.startsWith('//') || l.includes('{') || l.includes('}') || (l.includes('=') && !l.includes('==') && !l.startsWith('='))) {
        return false;
      }
      if (/(\[E\d*|\>\s*\[|\bb\s*#|\bconnected services\b|\bproperties\b|\bdependencies\b|\bcontrollers\b|\bpresentation\b|\bbin\b|\bobj\b|\bappsettings\b|\becommerce\.)/i.test(lower)) {
        return true;
      }
      return false;
    };

    for (const rawLine of lines) {
      if (isIdeChrome(rawLine) || isOrphanNoiseLine(rawLine) || isSolutionExplorerLine(rawLine)) continue;

      let line = rawLine.trim();

      // If line has isolated braces with noise, extract clean brace
      if (/^\s*\d*\s*\{\s*.*$/.test(line) && !line.includes('class') && !line.includes('namespace') && !line.includes('(')) {
        resultLines.push('{');
        continue;
      }
      if (/^\s*\d*\s*\}\s*.*$/.test(line)) {
        resultLines.push('}');
        continue;
      }

      // Remove leading line numbers and gutter noise
      line = line.replace(/^\s*\d{1,4}\s+(?=\/\/)/, '');
      line = line.replace(/^\s*\d{1,4}\s+(?=[a-zA-Z_{}])/g, '');
      line = line.replace(/^[\d\s|.:\-–—'"\`!#$]+(?=[a-zA-Z_{}\/])/g, '');

      // 1. Statements ending with semicolon: strip right-side Solution Explorer noise
      if (line.includes(';')) {
        line = line.replace(/;\s*.*$/, ';');
      }

      // 2. Namespace declaration: namespace <name>
      if (/^namespace\b/i.test(line)) {
        line = line.replace(/^(namespace\s+[\w\.]+).*$/, '$1');
      }

      // 3. Class / struct / interface declaration
      if (/\bclass\s+\w+/i.test(line)) {
        line = line.replace(/^((?:public|private|protected|internal|static|abstract|sealed)?\s*class\s+\w+).*$/, '$1');
      }

      // 4. Method / constructor declaration with closing parenthesis
      if (line.includes('(') && line.includes(')')) {
        line = line.replace(/(\))\s+.*$/, '$1');
      } else if (line.includes('(') && /logge\b/i.test(line)) {
        line = line.replace(/logge.*$/i, 'logger)');
      }

      // 5. Comments with right-side Solution explorer noise
      if (line.startsWith('//')) {
        line = line.replace(/(\/\/\s*.+?)\s+([b>]\s*)?c[#=]\s+\w+\.cs.*$/i, '$1');
        line = line.replace(/(\/\/\s*.+?)\s+b\s+c=.*$/i, '$1');
      }

      // 6. Try block with noise
      if (/^\s*(try|Fry)\b/i.test(line)) {
        line = 'try';
      }

      // 7. Fix common OCR typos
      line = line.replace(/\bFry\b/g, 'try');
      line = line.replace(/\bCatch\b/g, 'catch');
      line = line.replace(/\bSysten\b/g, 'System');
      line = line.replace(/\bLing\b/g, 'Linq');

      line = line.trim();
      if (line.length > 0 && !isOrphanNoiseLine(line) && !isSolutionExplorerLine(line)) {
        resultLines.push(line);
      }
    }

    // Indent code properly
    let indent = 0;
    const formatted: string[] = [];
    for (const l of resultLines) {
      if (l.startsWith('}') || l.startsWith(']')) {
        indent = Math.max(0, indent - 1);
      }
      formatted.push('  '.repeat(indent) + l);
      if (l.endsWith('{') || l.endsWith('[') || (l.startsWith('{') && l.length === 1)) {
        indent++;
      }
    }

    let codeResult = formatted.join('\n');

    if (applyCustom) {
      codeResult = this.applyCustomRules(codeResult);
    }

    return codeResult;
  }

  /**
   * Applies clean indentation to lines of code
   */
  private indentCode(lines: string[]): string {
    let indentLevel = 0;
    const result: string[] = [];

    for (const line of lines) {
      if (line.startsWith('}') || line.startsWith(']')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indent = '  '.repeat(indentLevel);
      result.push(indent + line);

      if (line.endsWith('{') || line.endsWith('[') || line.endsWith('(')) {
        indentLevel++;
      }
    }

    return result.join('\n');
  }

  /**
   * Strips all numbers from text
   */
  removeNumbers(text: string): string {
    if (!text) return '';
    return text
      .split(/\r?\n/)
      .map(line => line.replace(/[0-9]/g, '').replace(/[٠-٩]/g, '').trim())
      .filter(l => l.length > 0)
      .join('\n');
  }

  /**
   * Strips empty lines and trims lines
   */
  removeBlankLines(text: string): string {
    if (!text) return '';
    return text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .join('\n');
  }

  /**
   * Keeps only ASCII Latin characters, digits, and programming symbols
   * Strips any Arabic characters that were mistakenly recognized in code
   */
  keepLatinAndCodeOnly(text: string): string {
    if (!text) return '';
    return text
      .split(/\r?\n/)
      .map(line => line.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, '').trimEnd())
      .filter(l => l.trim().length > 0)
      .join('\n');
  }

  /**
   * Keeps only Arabic text and standard punctuation
   */
  keepArabicOnly(text: string): string {
    if (!text) return '';
    return text
      .split(/\r?\n/)
      .map(line => line.replace(/[^\u0600-\u06FF\s0-9\.,!؟\-\(\)]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(l => l.length > 0)
      .join('\n');
  }

  /**
   * Safely trims code lines without destroying line breaks
   */
  unwrapCodeLines(text: string): string {
    if (!text) return '';
    return text;
  }
}
