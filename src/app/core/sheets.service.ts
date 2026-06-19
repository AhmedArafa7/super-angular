import { Injectable, signal, computed } from '@angular/core';

export interface Column {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date';
}

export interface Row {
  id: string;
  [key: string]: any;
}

export interface DataTable {
  id: string;
  name: string;
  description: string;
  columns: Column[];
  rows: Row[];
  lastModified: string;
  category: string;
}

@Injectable({
  providedIn: 'root'
})
export class SheetsService {
  private readonly STORAGE_KEY = 'Si-Neuro-sheets-registry';

  // Signals
  tables = signal<DataTable[]>([]);
  activeTableId = signal<string | null>(null);

  // Computed active table helper
  activeTable = computed(() => {
    const list = this.tables();
    const activeId = this.activeTableId();
    return list.find(t => t.id === activeId) || null;
  });

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        this.tables.set(parsed || []);
        if (parsed.length > 0) {
          this.activeTableId.set(parsed[0].id);
        }
        return;
      } catch (e) {
        console.error("Sheets Load Error", e);
      }
    }

    // Seed default sheets
    const seedTable: DataTable = {
      id: 'sheet_seed_1',
      name: 'موازنة الخوادم والنواة العصبية',
      description: 'سجل النفقات والمدخلات المالية الافتراضية للنواة عصبياً',
      category: 'عام',
      lastModified: new Date().toISOString(),
      columns: [
        { id: 'c1', name: 'البيان', type: 'text' },
        { id: 'c2', name: 'القيمة الفعالة', type: 'number' },
        { id: 'c3', name: 'تاريخ التسجيل', type: 'date' }
      ],
      rows: [
        { id: 'r1', c1: 'اشتراكات الخوادم السحابية', c2: -2500, c3: '2026-05-01' },
        { id: 'r2', c1: 'عائدات إعلانات WeTube', c2: 12500, c3: '2026-05-10' },
        { id: 'r3', c1: 'نفقات صيانة العقد الذكية', c2: -850, c3: '2026-05-18' }
      ]
    };

    this.tables.set([seedTable]);
    this.activeTableId.set(seedTable.id);
    this.saveState();
  }

  private saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tables()));
  }

  // Table operations
  createTable(name: string): void {
    const newTable: DataTable = {
      id: `sheet_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || 'جدول غير معنون',
      description: 'قاعدة بيانات ذكية مبسطة',
      category: 'عام',
      lastModified: new Date().toISOString(),
      columns: [
        { id: 'c1', name: 'البيان', type: 'text' },
        { id: 'c2', name: 'القيمة', type: 'number' },
        { id: 'c3', name: 'التاريخ', type: 'date' }
      ],
      rows: [
        { id: 'r1', c1: 'سجل افتراضي جديد', c2: 0, c3: new Date().toISOString().split('T')[0] }
      ]
    };

    this.tables.update(list => [...list, newTable]);
    this.activeTableId.set(newTable.id);
    this.saveState();
  }

  deleteTable(id: string): void {
    this.tables.update(list => list.filter(t => t.id !== id));
    const remaining = this.tables();
    if (remaining.length > 0) {
      this.activeTableId.set(remaining[0].id);
    } else {
      this.activeTableId.set(null);
    }
    this.saveState();
  }

  // Row and Cell manipulations
  addRow(tableId: string): void {
    this.tables.update(list => {
      return list.map(t => {
        if (t.id === tableId) {
          const newRow: Row = {
            id: `row_${Math.random().toString(36).substr(2, 9)}`
          };
          t.columns.forEach(c => {
            newRow[c.id] = c.type === 'number' ? 0 : '';
          });
          return {
            ...t,
            rows: [...t.rows, newRow],
            lastModified: new Date().toISOString()
          };
        }
        return t;
      });
    });
    this.saveState();
  }

  deleteRow(tableId: string, rowId: string): void {
    this.tables.update(list => {
      return list.map(t => {
        if (t.id === tableId) {
          return {
            ...t,
            rows: t.rows.filter(r => r.id !== rowId),
            lastModified: new Date().toISOString()
          };
        }
        return t;
      });
    });
    this.saveState();
  }

  updateCellValue(tableId: string, rowId: string, colId: string, val: any): void {
    this.tables.update(list => {
      return list.map(t => {
        if (t.id === tableId) {
          return {
            ...t,
            rows: t.rows.map(r => {
              if (r.id === rowId) {
                // If column type is number: parse safely
                const colType = t.columns.find(col => col.id === colId)?.type;
                let parsedVal = val;
                if (colType === 'number') {
                  parsedVal = val === '' ? 0 : Number(val);
                }
                return { ...r, [colId]: parsedVal };
              }
              return r;
            }),
            lastModified: new Date().toISOString()
          };
        }
        return t;
      });
    });
    this.saveState();
  }

  // Column operations
  addColumn(tableId: string, name: string, type: 'text' | 'number' | 'date'): void {
    this.tables.update(list => {
      return list.map(t => {
        if (t.id === tableId) {
          const colId = `c_${Date.now()}`;
          const updatedRows = t.rows.map(r => ({
            ...r,
            [colId]: type === 'number' ? 0 : ''
          }));
          return {
            ...t,
            columns: [...t.columns, { id: colId, name, type }],
            rows: updatedRows,
            lastModified: new Date().toISOString()
          };
        }
        return t;
      });
    });
    this.saveState();
  }
}
