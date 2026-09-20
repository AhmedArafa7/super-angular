import { Injectable } from '@angular/core';

export interface ConverterOptions {
  casing: 'camelCase' | 'PascalCase' | 'preserve';
  nullableStyle: 'optional' | 'nullUnion' | 'both'; // optional (id?: string), nullUnion (id: string | null), both (id?: string | null)
  dateType: 'string' | 'Date';
  outputTarget: 'interface' | 'type' | 'class' | 'reactiveForm' | 'mockJson' | 'apiService';
  includeReadonly: boolean;
  exportKeyword: boolean;
  respectJsonPropertyName: boolean;
  defaultNumberType: 'number';
}

export interface ParsedProperty {
  originalName: string;
  mappedName: string;
  csharpType: string;
  tsType: string;
  isNullable: boolean;
  isArray: boolean;
  defaultValue?: string;
  jsonPropertyName?: string;
  comment?: string;
}

export interface ParsedItem {
  kind: 'record' | 'class' | 'struct' | 'interface' | 'enum';
  name: string;
  properties: ParsedProperty[];
  enumValues?: { name: string; value?: string }[];
  comments?: string[];
  rawHeader?: string;
}

export interface ConversionResult {
  code: string;
  items: ParsedItem[];
  stats: {
    classesCount: number;
    enumsCount: number;
    propertiesCount: number;
    linesCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CsharpToTsService {

  private readonly typeMapping: Record<string, string> = {
    // String & Char
    'string': 'string',
    'char': 'string',
    'String': 'string',
    'Char': 'string',

    // Integers
    'int': 'number',
    'int32': 'number',
    'Int32': 'number',
    'uint': 'number',
    'UInt32': 'number',
    'long': 'number',
    'int64': 'number',
    'Int64': 'number',
    'ulong': 'number',
    'UInt64': 'number',
    'short': 'number',
    'int16': 'number',
    'Int16': 'number',
    'ushort': 'number',
    'UInt16': 'number',
    'byte': 'number',
    'Byte': 'number',
    'sbyte': 'number',
    'SByte': 'number',
    'nint': 'number',
    'nuint': 'number',

    // Floating-point & Decimals
    'float': 'number',
    'Single': 'number',
    'double': 'number',
    'Double': 'number',
    'decimal': 'number',
    'Decimal': 'number',

    // Boolean
    'bool': 'boolean',
    'Boolean': 'boolean',

    // Guid & Identifiers
    'Guid': 'string',
    'guid': 'string',

    // DateTime & Dates
    'DateTime': 'string',
    'DateTimeOffset': 'string',
    'DateOnly': 'string',
    'TimeOnly': 'string',
    'TimeSpan': 'string',

    // Objects & Generics
    'object': 'any',
    'Object': 'any',
    'dynamic': 'any',
    'void': 'void',
    'JsonElement': 'any',
    'JsonDocument': 'any',
    'JObject': 'any',
    'JToken': 'any'
  };

  /**
   * Main entry point to convert C# code to TypeScript or selected target.
   */
  convert(csharpCode: string, options: Partial<ConverterOptions> = {}): ConversionResult {
    const opts: ConverterOptions = {
      casing: 'camelCase',
      nullableStyle: 'optional',
      dateType: 'string',
      outputTarget: 'interface',
      includeReadonly: false,
      exportKeyword: true,
      respectJsonPropertyName: true,
      defaultNumberType: 'number',
      ...options
    };

    const trimmed = (csharpCode || '').trim();
    if (!trimmed) {
      return {
        code: '// الصق كود C# DTO في مربع الإدخال على اليسار لتوليد كود TypeScript هنا فوراً...',
        items: [],
        stats: { classesCount: 0, enumsCount: 0, propertiesCount: 0, linesCount: 0 }
      };
    }

    const items = this.parseCsharp(trimmed, opts);
    let generatedCode = '';

    switch (opts.outputTarget) {
      case 'interface':
        generatedCode = this.generateInterfaces(items, opts);
        break;
      case 'type':
        generatedCode = this.generateTypes(items, opts);
        break;
      case 'class':
        generatedCode = this.generateClasses(items, opts);
        break;
      case 'reactiveForm':
        generatedCode = this.generateReactiveForms(items, opts);
        break;
      case 'mockJson':
        generatedCode = this.generateMockJson(items, opts);
        break;
      case 'apiService':
        generatedCode = this.generateApiService(items, opts);
        break;
    }

    const totalProps = items.reduce((acc, it) => acc + (it.properties?.length || 0), 0);
    const classesCount = items.filter(it => it.kind !== 'enum').length;
    const enumsCount = items.filter(it => it.kind === 'enum').length;
    const linesCount = generatedCode.split('\n').length;

    return {
      code: generatedCode,
      items,
      stats: {
        classesCount,
        enumsCount,
        propertiesCount: totalProps,
        linesCount
      }
    };
  }

  /**
   * Robust parser for C# records, classes, structs, enums, primary constructors.
   */
  parseCsharp(rawCode: string, options: ConverterOptions): ParsedItem[] {
    const items: ParsedItem[] = [];

    // Strip out namespaces, using statements, but preserve internal block content
    let cleaned = rawCode
      .replace(/using\s+[\w.]+;\s*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '') // strip multiline comments
      .trim();

    // Remove namespace wrapper if present: namespace Book.ServiceAbstraction.DTOs.Auth; or namespace ... { ... }
    cleaned = cleaned.replace(/namespace\s+[\w.]+\s*;?/g, '').trim();

    // Match Enums
    const enumRegex = /(?:public\s+|internal\s+)?enum\s+(\w+)\s*(?::\s*[\w\d]+)?\s*\{([\s\S]*?)\}/g;
    let enumMatch: RegExpExecArray | null;
    while ((enumMatch = enumRegex.exec(cleaned)) !== null) {
      const enumName = enumMatch[1];
      const enumBody = enumMatch[2];
      const enumValues: { name: string; value?: string }[] = [];

      const lines = enumBody.split(/,\s*\n|,\s*|\n/);
      for (const line of lines) {
        const trimmedLine = line.trim().replace(/\/\/.*$/, '');
        if (!trimmedLine) continue;
        const parts = trimmedLine.split('=').map(p => p.trim());
        const valName = parts[0];
        const val = parts[1];
        if (valName && /^[a-zA-Z_]\w*$/.test(valName)) {
          enumValues.push({ name: valName, value: val });
        }
      }

      items.push({
        kind: 'enum',
        name: enumName,
        properties: [],
        enumValues
      });
    }

    // Match Positional Records: public record LoginRequestDto(string Email, string Password, bool RememberMe = false);
    const positionalRecordRegex = /(?:public\s+|internal\s+)?(?:readonly\s+)?record\s+(?:class\s+|struct\s+)?(\w+)\s*\(([\s\S]*?)\)\s*(?:;|:\s*[\w\d,\s<>]+\s*;|\{[^}]*\})?/g;
    let posMatch: RegExpExecArray | null;
    while ((posMatch = positionalRecordRegex.exec(cleaned)) !== null) {
      const recordName = posMatch[1];
      const paramsList = posMatch[2];

      // If already added, skip
      if (items.some(it => it.name === recordName)) continue;

      const properties: ParsedProperty[] = [];
      const paramLines = this.splitParams(paramsList);

      for (const p of paramLines) {
        const parsedProp = this.parseParamDefinition(p, options);
        if (parsedProp) properties.push(parsedProp);
      }

      items.push({
        kind: 'record',
        name: recordName,
        properties
      });
    }

    // Match Classes, Records with body, and Structs
    // e.g. public record AuthResponseDto { ... } or public class UserDto : BaseDto { ... }
    const classRegex = /(?:public\s+|internal\s+|protected\s+)?(?:abstract\s+|sealed\s+|partial\s+|static\s+|readonly\s+)*(record|class|struct|interface)\s+(?:class\s+|struct\s+)?(\w+)(?:<[\w\s,]+>)?\s*(?::\s*[\w\d,\s<>]*)?\s*\{([\s\S]*?)\n\s*\}/g;
    let classMatch: RegExpExecArray | null;
    while ((classMatch = classRegex.exec(cleaned)) !== null) {
      const kind = classMatch[1] as 'record' | 'class' | 'struct' | 'interface';
      const name = classMatch[2];
      const body = classMatch[3];

      // If already added, skip
      if (items.some(it => it.name === name)) continue;

      const properties = this.parsePropertiesFromBody(body, options);
      items.push({
        kind,
        name,
        properties
      });
    }

    // Fallback: If no structured class was matched (e.g. user pasted just the properties inside a class without the header)
    if (items.length === 0 && cleaned.includes('{ get; set; }')) {
      const properties = this.parsePropertiesFromBody(cleaned, options);
      if (properties.length > 0) {
        items.push({
          kind: 'record',
          name: 'DtoModel',
          properties
        });
      }
    }

    return items;
  }

  /**
   * Parse properties inside a class/record body
   */
  private parsePropertiesFromBody(body: string, options: ConverterOptions): ParsedProperty[] {
    const properties: ParsedProperty[] = [];
    const lines = body.split('\n');

    let currentAttributes: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Check for single line comments
      if (line.startsWith('//')) continue;

      // Collect attributes: [JsonPropertyName("display_name")], [Required], etc.
      if (line.startsWith('[')) {
        currentAttributes.push(line);
        continue;
      }

      // Check for property pattern
      // e.g.: public string Id { get; set; } = string.Empty;
      // public IList<string> Roles { get; set; } = [];
      // public required string? Name { get; init; }
      // public DateTime ExpiresOn { get; set; }
      // public decimal? Price { get; } = 0;
      const propRegex = /^(?:public\s+|internal\s+|protected\s+)?(?:required\s+)?(?:virtual\s+|override\s+|new\s+|readonly\s+)?([\w\d_<>?[\].,\s]+?)\s+([a-zA-Z_]\w*)\s*(?:\{\s*(?:get;\s*(?:set;|init;)?|init;|set;)?\s*\}|;)\s*(?:=\s*([^;]+);?)?$/;

      const match = line.match(propRegex);
      if (match) {
        const rawType = match[1].trim();
        const propName = match[2].trim();
        const defaultValue = match[3] ? match[3].trim() : undefined;

        // Check attributes for JsonPropertyName
        let jsonPropertyName: string | undefined;
        for (const attr of currentAttributes) {
          const jsonMatch = attr.match(/\[(?:JsonPropertyName|JsonProperty)\(\s*["']([^"']+)["']\s*\)\]/);
          if (jsonMatch) {
            jsonPropertyName = jsonMatch[1];
          }
        }

        const isExplicitNullable = rawType.endsWith('?') || rawType.startsWith('Nullable<');
        const cleanCsharpType = this.stripNullable(rawType);
        const { tsType, isArray } = this.mapCsharpTypeToTs(cleanCsharpType, options);

        // Naming casing
        let mappedName = propName;
        if (options.respectJsonPropertyName && jsonPropertyName) {
          mappedName = jsonPropertyName;
        } else if (options.casing === 'camelCase') {
          mappedName = this.toCamelCase(propName);
        } else if (options.casing === 'PascalCase') {
          mappedName = this.toPascalCase(propName);
        }

        properties.push({
          originalName: propName,
          mappedName,
          csharpType: rawType,
          tsType,
          isNullable: isExplicitNullable,
          isArray,
          defaultValue,
          jsonPropertyName
        });

        currentAttributes = [];
      } else {
        // Clear attributes if line wasn't a property
        if (!line.startsWith('[')) {
          currentAttributes = [];
        }
      }
    }

    return properties;
  }

  /**
   * Parse parameter from primary constructor: `string Email, bool RememberMe = false`
   */
  private parseParamDefinition(paramDef: string, options: ConverterOptions): ParsedProperty | null {
    const trimmed = paramDef.trim().replace(/\/\/.*$/, '');
    if (!trimmed) return null;

    // Pattern: [attributes] Type Name [= defaultValue]
    const match = trimmed.match(/(?:\[[^\]]*\]\s*)*([\w\d_<>?[\].,\s]+?)\s+([a-zA-Z_]\w*)(?:\s*=\s*(.*))?$/);
    if (!match) return null;

    const rawType = match[1].trim();
    const propName = match[2].trim();
    const defaultValue = match[3] ? match[3].trim() : undefined;

    const isExplicitNullable = rawType.endsWith('?') || rawType.startsWith('Nullable<');
    const cleanCsharpType = this.stripNullable(rawType);
    const { tsType, isArray } = this.mapCsharpTypeToTs(cleanCsharpType, options);

    let mappedName = propName;
    if (options.casing === 'camelCase') {
      mappedName = this.toCamelCase(propName);
    } else if (options.casing === 'PascalCase') {
      mappedName = this.toPascalCase(propName);
    }

    return {
      originalName: propName,
      mappedName,
      csharpType: rawType,
      tsType,
      isNullable: isExplicitNullable || defaultValue !== undefined,
      isArray,
      defaultValue
    };
  }

  /**
   * Split comma-separated parameters taking generics into account e.g. (int a, List<string> b)
   */
  private splitParams(paramsList: string): string[] {
    const results: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < paramsList.length; i++) {
      const char = paramsList[i];
      if (char === '<' || char === '(' || char === '[') depth++;
      else if (char === '>' || char === ')' || char === ']') depth--;

      if (char === ',' && depth === 0) {
        if (current.trim()) results.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) results.push(current.trim());
    return results;
  }

  /**
   * Map C# type string to TypeScript type string
   */
  mapCsharpTypeToTs(cleanType: string, options: ConverterOptions): { tsType: string; isArray: boolean } {
    let type = cleanType.trim();

    // Check array: T[] or Array<T>
    if (type.endsWith('[]')) {
      const inner = type.slice(0, -2);
      const mappedInner = this.mapCsharpTypeToTs(inner, options);
      return { tsType: `${mappedInner.tsType}[]`, isArray: true };
    }

    // Check generic collection types: List<T>, IList<T>, IEnumerable<T>, ICollection<T>, IReadOnlyList<T>, HashSet<T>
    const collectionMatch = type.match(/^(?:(?:I(?:ReadOnly)?(?:List|Collection)|List|IEnumerable|HashSet|ISet|ObservableCollection|ImmutableList))\s*<([\s\S]+)>$/);
    if (collectionMatch) {
      const inner = collectionMatch[1].trim();
      const mappedInner = this.mapCsharpTypeToTs(inner, options);
      return { tsType: `${mappedInner.tsType}[]`, isArray: true };
    }

    // Check Dictionary: Dictionary<TKey, TValue> or IDictionary<TKey, TValue>
    const dictMatch = type.match(/^(?:(?:I(?:ReadOnly)?Dictionary|Dictionary|ConcurrentDictionary))\s*<([^,]+),\s*([\s\S]+)>$/);
    if (dictMatch) {
      const keyType = this.mapCsharpTypeToTs(dictMatch[1].trim(), options).tsType;
      const valType = this.mapCsharpTypeToTs(dictMatch[2].trim(), options).tsType;
      const validKey = keyType === 'number' ? 'number' : 'string';
      return { tsType: `Record<${validKey}, ${valType}>`, isArray: false };
    }

    // Check KeyValuePair
    const kvpMatch = type.match(/^KeyValuePair\s*<([^,]+),\s*([\s\S]+)>$/);
    if (kvpMatch) {
      const keyType = this.mapCsharpTypeToTs(kvpMatch[1].trim(), options).tsType;
      const valType = this.mapCsharpTypeToTs(kvpMatch[2].trim(), options).tsType;
      return { tsType: `{ key: ${keyType}; value: ${valType} }`, isArray: false };
    }

    // Check DateTime option
    if (['DateTime', 'DateTimeOffset', 'DateOnly'].includes(type)) {
      return { tsType: options.dateType === 'Date' ? 'Date' : 'string', isArray: false };
    }

    // Direct mapping
    if (this.typeMapping[type]) {
      return { tsType: this.typeMapping[type], isArray: false };
    }

    // Default to type name (assume custom DTO / Enum / Interface)
    return { tsType: type, isArray: false };
  }

  private stripNullable(type: string): string {
    let t = type.trim();
    if (t.endsWith('?')) {
      t = t.slice(0, -1).trim();
    }
    const nullableMatch = t.match(/^Nullable\s*<([\s\S]+)>$/);
    if (nullableMatch) {
      t = nullableMatch[1].trim();
    }
    return t;
  }

  toCamelCase(str: string): string {
    if (!str) return '';
    // If all caps, like 'ID' or 'URL'
    if (str.length <= 3 && str === str.toUpperCase()) {
      return str.toLowerCase();
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  toPascalCase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format property for interface or type
   */
  private formatPropLine(prop: ParsedProperty, options: ConverterOptions): string {
    const readonlyStr = options.includeReadonly ? 'readonly ' : '';
    let propName = prop.mappedName;
    let typeStr = prop.tsType;

    // Determine optional / nullable marker
    if (prop.isNullable) {
      if (options.nullableStyle === 'optional') {
        propName += '?';
      } else if (options.nullableStyle === 'nullUnion') {
        typeStr = `${typeStr} | null`;
      } else if (options.nullableStyle === 'both') {
        propName += '?';
        typeStr = `${typeStr} | null`;
      }
    }

    return `  ${readonlyStr}${propName}: ${typeStr};`;
  }

  /**
   * 1. Generate TypeScript Interfaces
   */
  private generateInterfaces(items: ParsedItem[], options: ConverterOptions): string {
    const chunks: string[] = [];
    const exp = options.exportKeyword ? 'export ' : '';

    for (const item of items) {
      if (item.kind === 'enum') {
        chunks.push(this.generateEnum(item, options));
        continue;
      }

      const lines: string[] = [];
      lines.push(`${exp}interface ${item.name} {`);

      if (item.properties.length === 0) {
        lines.push('  // لا توجد حقول أو خصائص');
      } else {
        for (const prop of item.properties) {
          lines.push(this.formatPropLine(prop, options));
        }
      }

      lines.push('}');
      chunks.push(lines.join('\n'));
    }

    return chunks.join('\n\n');
  }

  /**
   * 2. Generate TypeScript Types
   */
  private generateTypes(items: ParsedItem[], options: ConverterOptions): string {
    const chunks: string[] = [];
    const exp = options.exportKeyword ? 'export ' : '';

    for (const item of items) {
      if (item.kind === 'enum') {
        chunks.push(this.generateEnum(item, options));
        continue;
      }

      const lines: string[] = [];
      lines.push(`${exp}type ${item.name} = {`);

      for (const prop of item.properties) {
        lines.push(this.formatPropLine(prop, options));
      }

      lines.push('};');
      chunks.push(lines.join('\n'));
    }

    return chunks.join('\n\n');
  }

  /**
   * 3. Generate TypeScript Classes
   */
  private generateClasses(items: ParsedItem[], options: ConverterOptions): string {
    const chunks: string[] = [];
    const exp = options.exportKeyword ? 'export ' : '';

    for (const item of items) {
      if (item.kind === 'enum') {
        chunks.push(this.generateEnum(item, options));
        continue;
      }

      const lines: string[] = [];
      lines.push(`${exp}class ${item.name} {`);

      for (const prop of item.properties) {
        let defaultInit = '';
        if (prop.isArray) defaultInit = ' = []';
        else if (prop.tsType === 'string') defaultInit = ` = ''`;
        else if (prop.tsType === 'number') defaultInit = ` = 0`;
        else if (prop.tsType === 'boolean') defaultInit = ` = false`;
        else if (prop.isNullable) defaultInit = ` = null`;

        const optMark = prop.isNullable ? '?' : '!';
        lines.push(`  ${prop.mappedName}${optMark}: ${prop.tsType}${defaultInit};`);
      }

      lines.push('}');
      chunks.push(lines.join('\n'));
    }

    return chunks.join('\n\n');
  }

  /**
   * Generate TypeScript Enum
   */
  private generateEnum(item: ParsedItem, options: ConverterOptions): string {
    const exp = options.exportKeyword ? 'export ' : '';
    const lines: string[] = [];
    lines.push(`${exp}enum ${item.name} {`);

    if (item.enumValues && item.enumValues.length > 0) {
      for (const val of item.enumValues) {
        if (val.value) {
          lines.push(`  ${val.name} = ${val.value},`);
        } else {
          lines.push(`  ${val.name},`);
        }
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * 4. Generate Angular Reactive Forms (FormBuilder)
   */
  private generateReactiveForms(items: ParsedItem[], options: ConverterOptions): string {
    const chunks: string[] = [
      `// تذكر استيراد: import { FormBuilder, Validators, FormGroup } from '@angular/forms';\n`
    ];

    for (const item of items) {
      if (item.kind === 'enum') continue;

      const formVarName = `${this.toCamelCase(item.name)}Form`;
      const lines: string[] = [];
      lines.push(`// نموذج Reactive Form الخاص بـ ${item.name}`);
      lines.push(`${formVarName}: FormGroup = this.fb.group({`);

      for (const prop of item.properties) {
        const valValidators: string[] = [];
        let initialVal = `''`;

        if (!prop.isNullable) {
          valValidators.push('Validators.required');
        }

        if (prop.isArray) {
          lines.push(`  ${prop.mappedName}: this.fb.array([]),`);
          continue;
        }

        if (prop.tsType === 'number') {
          initialVal = `0`;
        } else if (prop.tsType === 'boolean') {
          initialVal = `false`;
        } else if (prop.mappedName.toLowerCase().includes('email')) {
          valValidators.push('Validators.email');
        } else if (prop.tsType === 'string' && (prop.mappedName.toLowerCase().includes('date') || prop.csharpType.includes('Date'))) {
          initialVal = `null`;
        }

        const validatorsStr = valValidators.length > 0 ? `, [${valValidators.join(', ')}]` : '';
        lines.push(`  ${prop.mappedName}: [${initialVal}${validatorsStr}],`);
      }

      lines.push('});');
      chunks.push(lines.join('\n'));
    }

    return chunks.join('\n\n');
  }

  /**
   * 5. Generate Mock JSON Data
   */
  private generateMockJson(items: ParsedItem[], options: ConverterOptions): string {
    const targetItem = items.find(it => it.kind !== 'enum') || items[0];
    if (!targetItem || targetItem.kind === 'enum') {
      return '{}';
    }

    const mockObj: Record<string, any> = {};

    for (const prop of targetItem.properties) {
      mockObj[prop.mappedName] = this.getMockValue(prop);
    }

    return JSON.stringify(mockObj, null, 2);
  }

  private getMockValue(prop: ParsedProperty): any {
    const nameLower = prop.originalName.toLowerCase();

    if (prop.isArray) {
      if (nameLower.includes('role')) return ['Admin', 'User'];
      if (prop.tsType.startsWith('string')) return ['عنصر 1', 'عنصر 2'];
      if (prop.tsType.startsWith('number')) return [1, 2, 3];
      return [];
    }

    if (nameLower === 'id' || nameLower.endsWith('id')) {
      return prop.csharpType.toLowerCase().includes('guid') 
        ? 'c8f1e2a0-4b3d-4e5f-9a1b-0c2d3e4f5a6b' 
        : (prop.tsType === 'number' ? 101 : 'USR_98234');
    }

    if (nameLower.includes('email')) return 'user@example.com';
    if (nameLower.includes('name') && nameLower.includes('display')) return 'أحمد عرفة (Ahmed Arafa)';
    if (nameLower.includes('username')) return 'ahmed_dev';
    if (nameLower.includes('first')) return 'أحمد';
    if (nameLower.includes('last')) return 'عرفة';
    if (nameLower.includes('token')) return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy_token_signature';
    if (nameLower.includes('password')) return 'Super@Secret2026';
    if (nameLower.includes('phone') || nameLower.includes('mobile')) return '+201000000000';
    if (nameLower.includes('address')) return 'القاهرة، مصر';
    if (nameLower.includes('title')) return 'عنوان تجريبي';
    if (nameLower.includes('desc') || nameLower.includes('content')) return 'هذا نص وصفي تجريبي لاختبار البيانات في واجهة المستخدم.';

    if (prop.csharpType.includes('Date') || nameLower.includes('expire') || nameLower.includes('created') || nameLower.includes('at')) {
      return new Date().toISOString();
    }

    if (prop.tsType === 'boolean') {
      return !nameLower.includes('delete') && !nameLower.includes('disabled');
    }

    if (prop.tsType === 'number') {
      if (nameLower.includes('price') || nameLower.includes('balance') || nameLower.includes('amount') || nameLower.includes('salary')) {
        return 499.99;
      }
      if (nameLower.includes('count') || nameLower.includes('total') || nameLower.includes('qty') || nameLower.includes('quantity')) {
        return 12;
      }
      if (nameLower.includes('age')) return 28;
      return 1;
    }

    return 'قيمة نصية تجريبية';
  }

  /**
   * 6. Generate Angular HttpClient Service snippet
   */
  private generateApiService(items: ParsedItem[], options: ConverterOptions): string {
    const chunks: string[] = [
      `// تذكر استيراد: import { inject } from '@angular/core'; import { HttpClient } from '@angular/common/http'; import { Observable } from 'rxjs';\n`
    ];

    for (const item of items) {
      if (item.kind === 'enum') continue;

      const entityName = item.name.replace(/Dto|Request|Response|Model/g, '') || item.name;
      const singularName = this.toCamelCase(entityName);
      const pluralName = `${singularName}s`;
      const typeName = item.name;

      const lines: string[] = [];
      lines.push(`// دوال استدعاء الـ API الخاصة بـ ${typeName}`);
      lines.push(`// داخل الـ Service الخاصة بك:`);
      lines.push(`private http = inject(HttpClient);`);
      lines.push(`private readonly apiUrl = 'https://api.example.com/api/${pluralName}';\n`);

      // GET by Id
      lines.push(`// 1. جلب عنصر واحد بالمعرف`);
      lines.push(`get${entityName}ById(id: string | number): Observable<${typeName}> {`);
      lines.push(`  return this.http.get<${typeName}>(\`\${this.apiUrl}/\${id}\`);`);
      lines.push(`}\n`);

      // GET All
      lines.push(`// 2. جلب جميع العناصر`);
      lines.push(`getAll${entityName}s(): Observable<${typeName}[]> {`);
      lines.push(`  return this.http.get<${typeName}[]>(\`\${this.apiUrl}\`);`);
      lines.push(`}\n`);

      // POST Create
      lines.push(`// 3. إنشاء أو إرسال عنصر جديد`);
      lines.push(`create${entityName}(dto: Partial<${typeName}>): Observable<${typeName}> {`);
      lines.push(`  return this.http.post<${typeName}>(\`\${this.apiUrl}\`, dto);`);
      lines.push(`}`);

      chunks.push(lines.join('\n'));
    }

    return chunks.join('\n\n');
  }
}
