import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OcrCleanerService {

  /**
   * Cleans programming code and text extracted from IDE / code editor screenshots:
   * 1. Removes IDE chrome, status bar, tabs, and error console lines
   * 2. Removes left-side line numbers, gutter symbols, and fold markers (v, >)
   * 3. Removes vertical indentation guide noise (| i 1 l !)
   * 4. Removes 'X references' lines
   * 5. Fixes common OCR code mistakes (e.g. Ling -> Linq, trailing noise)
   * 6. Formats clean indentation based on { } blocks
   */
  cleanCode(rawText: string): string {
    if (!rawText) return '';

    const lines = rawText.split(/\r?\n/);
    const cleanedLines: string[] = [];

    // Check if a line is IDE status bar / chrome / console
    const isIdeChrome = (line: string): boolean => {
      const lower = line.toLowerCase();
      if (/^\s*\d+%\s*.*(issues|found|ln:|ch:|spc)/i.test(line)) return true;
      if (lower.includes('no issues found') || lower.includes('noissues found')) return true;
      if (lower.includes('error list') && lower.includes('output')) return true;
      if (lower.includes('package manager console') || lower.includes('debug console')) return true;
      if (lower.includes('add to source control') || lower.includes('select repository')) return true;
      if (/^\s*\[\]\s*ready/i.test(line)) return true;
      if (/^\s*ch:\s*\d+\s*spc\s*\d+/i.test(line)) return true;
      if (/^\s*ln:\s*\d+/i.test(line)) return true;
      if (/^\s*\d+\s*references?/i.test(line)) return true;
      if (/^\s*0\s*references?/i.test(line)) return true;
      return false;
    };

    // Check if line is just standalone line number or gutter noise (e.g. "6", "17 |.", "19")
    const isNoiseLine = (line: string): boolean => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      // Line contains only digits, spaces, and single symbols
      if (/^[\d\s|.:\-–—_'"`\\/!]+$/.test(trimmed) && trimmed.length <= 6) return true;
      return false;
    };

    // Map Arabic/Eastern digits to standard Latin digits
    const arabicToLatinDigits = (str: string): string => {
      const map: Record<string, string> = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
      };
      return str.replace(/[٠-٩]/g, d => map[d] || d);
    };

    for (let rawLine of lines) {
      if (isIdeChrome(rawLine) || isNoiseLine(rawLine)) {
        continue;
      }

      let line = rawLine;

      // 0. Normalize directional markers and convert Arabic digits
      line = line.replace(/[\u200E\u200F\u202A-\u202E]/g, '');
      line = arabicToLatinDigits(line);

      // Normalize curly quotes
      line = line.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

      // 1. Remove gutter line numbers/symbols before keywords:
      // "q using", "B using", "8 using", "7 v namespace", "9 v i public", "c static"
      line = line.replace(/^c\s+(static|public|private|protected)\b/i, 'public $1');
      line = line.replace(
        /^[a-zA-Z0-9\u0600-\u06FF]{1,4}\s+(using|import|from|namespace|public|private|protected|internal|static|readonly|async|class|struct|interface|enum|record|void|int|string|bool|task|const|let|var|function|def|return)\b/i,
        '$1'
      );

      // 2. Remove leading line numbers and gutter fold arrows/pipes/noise (including Arabic misread symbols like "11 ‏ا‎ i Failure"):
      // "12 1 | Validation = 1," -> "Validation = 1,"
      // "11 | Failure = '," -> "Failure = ',"
      // "165” {| InvalidCredentials" -> "InvalidCredentials"
      line = line.replace(/^[\s\d]*[vV>|!i1l•\-–—\u0600-\u06FF]\s+/g, '');
      line = line.replace(/^\s*\d{1,4}\s*[:.)|\-–—]?\s*/g, '');
      line = line.replace(/^(\s*[\d\w\u0600-\u06FF]*\s*[|!i1l]\s*)+/g, '');

      // Special case: "165” {| InvalidCredentials" or "165" {|" -> "InvalidCredentials"
      line = line.replace(/^\s*\d+["'`]?\s*(\{\||\{|\|)\s*/g, '');

      // 3. Remove trailing gutter noise:
      // "using System.Ling; 2]" -> "using System.Linq;"
      // "using System.Text; g" -> "using System.Text;"
      line = line.replace(/;\s*[a-zA-Z0-9\W]{1,4}$/g, ';');
      line = line.replace(/\s+\d{1,4}\s*[\]\)\}»>]*$/g, '');
      line = line.replace(/[|!]\s*$/g, '');

      // Remove trailing random junk after closing braces or paren: e.g. ") IN", ") EE"
      line = line.replace(/\)\s+[A-Z]{1,3}\s*[-–—]?\s*$/g, ')');

      // 4. Fix common code keyword typos and assignment errors:
      line = line.replace(/\bSystem\.Ling\b/g, 'System.Linq');
      line = line.replace(/\bSysten\b/g, 'System');

      // Fix parameter default value misreads where "=" was read as "-"
      line = line.replace(/(\bstring\s+\w+\s*)-\s*(?=["'])/g, '$1= ');

      // 5. Fix enum assignment misreads:
      // "Failure = '," -> "Failure = 0,"
      line = line.replace(/=\s*['`]\s*,/g, '= 0,');

      // Remove unwanted leading/trailing pipes
      line = line.replace(/^\|\s*/, '').replace(/\s*\|$/, '');

      const trimmed = line.trim();
      // Filter out pure noise lines like "EE -", "HE $", "[HE $", "IN"
      if (/^[A-Z\$\-\–—\s\(\)\[\]]{1,4}$/i.test(trimmed)) {
        continue;
      }

      if (trimmed.length > 0) {
        cleanedLines.push(trimmed);
      }
    }

    const joinedText = cleanedLines.join('\n');
    const unwrappedText = this.unwrapCodeLines(joinedText);
    return this.indentCode(unwrappedText.split(/\r?\n/));
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
   * Intelligently joins broken code lines that were split mid-statement or mid-signature
   */
  unwrapCodeLines(text: string): string {
    if (!text) return '';

    const lines = text.split(/\r?\n/);
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let current = lines[i];

      while (i + 1 < lines.length) {
        const trimmedCurrent = current.trim();
        const nextRaw = lines[i + 1];
        const trimmedNext = nextRaw.trim();

        if (!trimmedNext) break;

        // Check if next line is clearly the start of a distinct statement or block
        const isNextSeparate = /^(using|namespace|public|private|protected|internal|class|struct|interface|enum|record|void|return|if|else|for|while|switch|case|default)\b/i.test(trimmedNext) ||
                               trimmedNext.startsWith('{') || trimmedNext.startsWith('}') ||
                               trimmedNext.startsWith('//') || trimmedNext.startsWith('/*');

        // Check if current line clearly continues:
        // Ends with operator, comma, open paren/bracket, or assignment
        const endsWithContinuation = /[=,(:+*\/\\&|\^?-]$/.test(trimmedCurrent);
        // Next line starts with continuation:
        const startsWithContinuation = /^[,:).+*\/\\&|\^?=>\]]/.test(trimmedNext);
        // Unclosed quotes in current line:
        const quoteCount = (trimmedCurrent.match(/"/g) || []).length;
        const unclosedQuotes = quoteCount % 2 !== 0;
        // Incomplete statement without semicolon or brace:
        const incompleteStatement = !/[;{}]$/.test(trimmedCurrent) && !trimmedCurrent.endsWith(':') && !isNextSeparate;

        if (endsWithContinuation || startsWithContinuation || unclosedQuotes || incompleteStatement) {
          // If the next line is a separate block, don't join unless explicitly continuing with an operator
          if (isNextSeparate && !endsWithContinuation && !startsWithContinuation && !unclosedQuotes) {
            break;
          }
          current = trimmedCurrent + ' ' + trimmedNext;
          i++; // Consumed next line
        } else {
          break;
        }
      }

      result.push(current);
    }

    return result.join('\n');
  }
}
