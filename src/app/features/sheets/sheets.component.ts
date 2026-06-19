import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { SheetsService, DataTable, Column, Row } from '../../core/sheets.service';

@Component({
  selector: 'app-sheets',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './sheets.component.html',
  styleUrls: ['./sheets.component.scss']
})
export class SheetsComponent {
  sheetsService = inject(SheetsService);

  // Search filter query
  searchQuery = signal<string>('');

  // Table Creation Modal toggles
  isCreateOpen = false;
  newTableName = '';

  // New Column parameters dropdown
  isColDropdownOpen = false;

  // Filter tables list based on search query
  get filteredTables(): DataTable[] {
    const list = this.sheetsService.tables();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return list;
    return list.filter(t => t.name.toLowerCase().includes(query));
  }

  // Create Table action trigger
  handleCreateTable(): void {
    if (!this.newTableName.trim()) return;
    this.sheetsService.createTable(this.newTableName);
    this.newTableName = '';
    this.isCreateOpen = false;
  }

  // Cell revision trigger
  onCellBlur(rowId: string, colId: string, event: Event): void {
    const active = this.sheetsService.activeTable();
    if (!active) return;
    
    const input = event.target as HTMLInputElement;
    this.sheetsService.updateCellValue(active.id, rowId, colId, input.value);
  }

  // Column addition helper
  handleAddColumn(name: string, type: 'text' | 'number' | 'date'): void {
    const active = this.sheetsService.activeTable();
    if (!active) return;
    this.sheetsService.addColumn(active.id, name, type);
    this.isColDropdownOpen = false;
  }

  // Row operations
  handleAddRow(): void {
    const active = this.sheetsService.activeTable();
    if (!active) return;
    this.sheetsService.addRow(active.id);
  }

  handleDeleteRow(rowId: string): void {
    const active = this.sheetsService.activeTable();
    if (!active) return;
    this.sheetsService.deleteRow(active.id, rowId);
  }

  // Table deletion
  handleDeleteTable(id: string): void {
    if (confirm("هل أنت متأكد من حذف جدول البيانات هذا نهائياً؟")) {
      this.sheetsService.deleteTable(id);
    }
  }

  // Real-time aggregates summation
  getColumnTotal(colId: string): number {
    const active = this.sheetsService.activeTable();
    if (!active) return 0;
    return active.rows.reduce((sum, r) => sum + (Number(r[colId]) || 0), 0);
  }
}
