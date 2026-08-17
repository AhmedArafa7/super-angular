import { Component, Input, inject, ViewChild, ElementRef, TemplateRef, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NavItem } from '../../../core/nav-items';
import { SidebarService } from '../../../core/sidebar.service';

@Component({
  selector: 'app-sidebar-item',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, OverlayModule],
  templateUrl: './sidebar-item.component.html'
})
export class SidebarItemComponent {
  @Input({ required: true }) item!: NavItem;
  @Input() pendingOffersCount = 0;
  @Input() unreadCount = 0;
  @Input() isBeta = false;

  sidebar = inject(SidebarService);
  private overlay = inject(Overlay);
  private viewContainerRef = inject(ViewContainerRef);
  
  @ViewChild('contextMenu') contextMenuTemplate!: TemplateRef<any>;
  @ViewChild('subMenuTemplate') subMenuTemplate!: TemplateRef<any>;
  private overlayRef: OverlayRef | null = null;
  private subMenuOverlayRef: OverlayRef | null = null;

  // Custom Search Aliases Dialog State
  showAliasesModal = false;
  newAliasText = '';

  openSubmenu(event: MouseEvent, target: HTMLElement) {
    event.stopPropagation();
    this.closeSubmenu();

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(target)
      .withPositions([{
        originX: 'end', originY: 'top',
        overlayX: 'start', overlayY: 'top',
        offsetX: 8
      }]);

    this.subMenuOverlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop'
    });

    this.subMenuOverlayRef.backdropClick().subscribe(() => this.closeSubmenu());
    
    const portal = new TemplatePortal(this.subMenuTemplate, this.viewContainerRef);
    this.subMenuOverlayRef.attach(portal);
  }

  closeSubmenu() {
    if (this.subMenuOverlayRef) {
      this.subMenuOverlayRef.dispose();
      this.subMenuOverlayRef = null;
    }
  }

  get badgeValue(): number | undefined {
    if (this.item.id === 'offers') return this.pendingOffersCount;
    if (this.item.id === 'notifications') return this.unreadCount;
    return this.item.badge;
  }

  get iconColorClass(): string {
    switch(this.item.id) {
      case 'time': return 'text-indigo-400';
      case 'micro-ide': return 'text-emerald-400';
      case 'health': return 'text-red-400 font-bold';
      case 'vault': return 'text-amber-400';
      case 'downloads': return 'text-indigo-400';
      default: return 'text-muted-foreground';
    }
  }

  get customAliases(): string[] {
    return this.sidebar.getAliases(this.item.id);
  }

  get usageCount(): number {
    return this.sidebar.getItemUsageCount(this.item.id);
  }

  openAliasesModal() {
    this.closeContextMenu();
    this.showAliasesModal = true;
    this.newAliasText = '';
  }

  closeAliasesModal() {
    this.showAliasesModal = false;
    this.newAliasText = '';
  }

  addAlias() {
    if (!this.newAliasText.trim()) return;
    this.sidebar.addAlias(this.item.id, this.newAliasText.trim());
    this.newAliasText = '';
  }

  removeAlias(alias: string) {
    this.sidebar.removeAlias(this.item.id, alias);
  }

  onContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.closeContextMenu();
    
    const target = event.currentTarget as HTMLElement;
    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(target)
      .withPositions([{
        originX: 'start', originY: 'bottom',
        overlayX: 'start', overlayY: 'top',
      }]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop'
    });

    this.overlayRef.backdropClick().subscribe(() => this.closeContextMenu());
    
    const portal = new TemplatePortal(this.contextMenuTemplate, this.viewContainerRef);
    this.overlayRef.attach(portal);
  }

  closeContextMenu() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  get isPinned(): boolean {
    return this.sidebar.isPinned(this.item.id);
  }

  togglePin() {
    this.sidebar.togglePin(this.item.id);
    this.closeContextMenu();
  }
}
