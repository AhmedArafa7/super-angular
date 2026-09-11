import { Injectable, signal } from '@angular/core';
import { CustomTextRule } from '../models/local-player.models';

@Injectable({
  providedIn: 'root'
})
export class OcrCleanerService {

  readonly STORAGE_KEY = 'local_player_custom_ocr_rules_v3';

  // Observable signal holding the current active custom text transformation rules
  customRules = signal<CustomTextRule[]>(this.loadCustomRules());

  /**
   * Returns pre-configured, battle-tested default rules designed specifically
   * to clean up code screenshots from Visual Studio, VS Code, JetBrains, and other IDEs.
   * Strips IDE menus, Solution Explorer side-columns, line numbers, and repairs syntax.
   */
  getDefaultRules(): CustomTextRule[] {
    const codeKeywords = '[ \\t]*(?:using|namespace|public|private|protected|internal|class|interface|struct|record|await|return|try|catch|finally|throw|if|else|switch|case|while|for|foreach|var|async|\\/\\/|_\\w+[ \\t]*=|[{}]|static)';

    return [
      {
        id: 'rule_ide_menus_bars',
        name: 'إزالة أشرطة وقوائم Visual Studio وأشرطة الـ Debug والـ Taskbar',
        description: 'حذف أشرطة القوائم والـ Debug وتبويبات الحل والـ Status Bar والـ Taskbar',
        pattern: '^(?:.*?(?:file\\s+edit\\s+view|debug\\s*-\\s*any\\s*cpu|github\\s*copilot|solution\\s*explorer|noissues\\s*found|error\\s*list|package\\s*manager\\s*console|select\\s*repository|add\\s*to\\s*source\\s*control|840\\s*pm|mea\\s*rr|zoom\\s*\\d+|\\d+%\\s*=~)[^\\r\\n]*)$',
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_leading_line_numbers',
        name: 'إزالة أرقام الأسطر ورموز الهامش من بداية السطر',
        description: 'حذف أرقام أسطر المحرر (1, 2, 77, 10, 117...) ورموز الهامش قبل الكود',
        pattern: '^[ \\t]*\\d{1,4}[ \\t]+(?=[a-zA-Z_{}\\/])',
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_fix_try_block',
        name: 'تصحيح وتنقية جملة try المشوهة من الـ OCR',
        description: 'تحويل Fry أو الأرقام قبل try وإزالة نصوص الـ Solution Explorer الملتصقة بها',
        pattern: '^[ \\t]*(?:\\d+[ \\t]*)?(?:try|Fry)\\b[^\\r\\n]*$',
        replacement: 'try',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_semicolon_strip',
        name: 'إزالة نصوص مستكشف الحلول بعد الفاصلة المنقوطة (;)',
        description: 'حذف أي نصوص أو تفريعات ملفات تظهر على يمين نهاية الجملة البرمجية',
        pattern: '(;)[ \\t]*[^\\r\\n;]+$',
        replacement: '$1',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_comments_strip',
        name: 'تنقية أسطر التعليقات // من أسماء ملفات المستكشف الملتصقة',
        description: 'حذف أسماء ملفات مثل BasketController.cs الملتصقة بنهاية التعليق',
        pattern: '(\\/\\/[ \\t]*.*?)[ \\t]+(?:b[ \\t]+c=|>[b \\t\\d]*c#|\\[|b[ \\t]*#)[^\\r\\n]*$',
        replacement: '$1',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_namespace_strip',
        name: 'تنقية سطر الـ namespace من نصوص المستكشف',
        description: 'حفظ اسم الـ namespace فقط وحذف نصوص المجلدات الملتصقة على اليمين',
        pattern: '^[ \\t]*(namespace[ \\t]+[\\w\\.]+)[ \\t]+[^\\r\\n]*$',
        replacement: '$1',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_class_strip',
        name: 'تنقية سطر الـ class من نصوص المستكشف والرموز',
        description: 'حفظ إعلان الـ class وحذف أي رموز أو أحرف ملتصقة على يمين السطر',
        pattern: '^[ \\t]*((?:public|private|protected|internal|static|abstract|sealed|partial)?[ \\t]*class[ \\t]+\\w+)[ \\t]+[^\\r\\n]*$',
        replacement: '$1',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_ctor_logger_param',
        name: 'إصلاح دالة البناء ومعامل الـ logger المقطوع',
        description: 'تصحيح المعامل المبتور logge وإغلاق قوس دالة البناء (logger)',
        pattern: '(\\bILogger<[\\w]+>)[ \\t]+logge\\b[^\\r\\n]*$',
        replacement: '$1 logger)',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_method_signature_paren',
        name: 'تنقية توقيع الدوال بعد القوس المغلق )',
        description: 'حذف أي نصوص أو ملفات ملتصقة بعد إغلاق قوس الدالة مثل InvokeAsync',
        pattern: '^[ \\t]*([^\\/\\r\\n]*\\))[ \\t]+[^\\r\\n{]*$',
        replacement: '$1',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_braces_strip',
        name: 'تنقية الأقواس المعقوفة { و } من الرموز والملفات الملتصقة',
        description: 'استخراج القوس المعقوف فقط { أو } وحذف نصوص الشجرة الملتصقة بجانبه',
        pattern: '^[ \\t]*(?:\\d+[ \\t]*)?([{}])[ \\t]+[^\\r\\n]*$',
        replacement: '$1',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_explorer_files',
        name: 'حذف أسطر ملفات مستكشف الحلول (.cs, .http, .json)',
        description: 'حذف الأسطر المعزولة التي تمثل ملفات مثل ApiBaseController.cs و appsettingsjson',
        pattern: `^(?!${codeKeywords}).*?(?:c#|c=|\\.cs\\b|\\.http\\b|\\.json\\b|appsettings)[^\\r\\n]*$`,
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_explorer_folders',
        name: 'حذف أسطر مجلدات شجرة Solution Explorer المعزولة',
        description: 'حذف أسطر Properties و bin و obj و Dependencies و Controllers المعزولة',
        pattern: `^(?!${codeKeywords}).*?(?:connected[ \\t]*services|properties|bin|obj|dependencies|commonresult|dtos|controllers|attributes|presentationlayer|infrastructurelayer|ecommerce|imports|weblayer|domain|solution)[^\\r\\n]*$`,
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_explorer_branches_noise',
        name: 'حذف تفريعات الشجرة المعزولة وأيقونات المجلدات [ ] و >',
        description: 'حذف أسطر الرموز المشوهة مثل [E Presentation] و [wu #=] و > 3) Imports و bin',
        pattern: `^(?!${codeKeywords})[ \\t]*(?:[-=~ \\t\\d\\w\\.:]{1,8}|[-be \\t\\d]+Alo-sa0.*|@&.*|it[ \\t]+pb.*|\\d+[\\)\\|[ \\t]]+ECommerce.*|[>[ \\t]\\d]*\\[.*?\\](?:[ \\t]*\\w+)?|[\\d[ \\t]]*>[b[ \\t]\\d]*\\[.*?\\]|.*?\\bCPE\\b|.*?c#|.*?\\.cs|.*?bin|.*?obj|.*?properties|[>:]\\s*[\\.\\s\\d\\”\\\"\\\'A-Za-z]+>[b\\s\\d]*\\w+)[^\\r\\n]*$`,
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_symbols_noise',
        name: 'إزالة أسطر الرموز الفارغة وبقايا الهوامش',
        description: 'حذف الأسطر التي لا تحتوي إلا على رموز أو مسافات أو أرقام مشتتة',
        pattern: '^[ \\t>:\\.\\”\\\"\\\'b\\d|\\-=~#\\$\\[\\]\\(\\)/\\*]+$',
        replacement: '',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_typo_system',
        name: 'تصحيح Systen إلى System',
        description: 'تصحيح خطأ قراءة OCR الشائع لكلمة System',
        pattern: '\\bSysten\\b',
        replacement: 'System',
        isRegex: true,
        caseSensitive: false,
        enabled: true,
        isBuiltIn: true
      },
      {
        id: 'rule_typo_linq',
        name: 'تصحيح Ling إلى Linq',
        description: 'تصحيح خطأ قراءة OCR الشائع لكلمة Linq',
        pattern: '\\bLing\\b',
        replacement: 'Linq',
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

    // Preserve any user-created custom rules from older versions
    let userCustomRules: CustomTextRule[] = [];
    try {
      const oldKeys = ['local_player_custom_ocr_rules', 'local_player_custom_ocr_rules_v2'];
      for (const k of oldKeys) {
        const oldSaved = localStorage.getItem(k);
        if (oldSaved) {
          const oldParsed: CustomTextRule[] = JSON.parse(oldSaved);
          if (Array.isArray(oldParsed)) {
            userCustomRules.push(...oldParsed.filter(r => !r.isBuiltIn));
          }
        }
      }
    } catch (e) {}

    const defaults = this.getDefaultRules();
    const merged = [...defaults, ...userCustomRules];
    this.saveCustomRules(merged);
    return merged;
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

    // Normalize Windows CRLF and Mac CR to standard LF newlines
    let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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
      .split('\n')
      .map(line => line.trimEnd())
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
