import { Injectable, inject, ComponentRef, ElementRef } from '@angular/core';
import { Overlay, OverlayRef, PositionStrategy, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ContextMenuComponent } from './context-menu.component';
import { ContextMenuItem } from './context-menu.model';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuService {
  private overlay = inject(Overlay);
  private overlayRef: OverlayRef | null = null;
  private actionSubject = new Subject<ContextMenuItem>();

  open(event: MouseEvent, items: ContextMenuItem[], data?: any): Observable<ContextMenuItem> {
    event.preventDefault();
    this.close();

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo({ x: event.clientX, y: event.clientY })
      .withPositions([
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' }
      ])
      .withPush(true);

    const overlayConfig = new OverlayConfig({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.close()
    });

    this.overlayRef = this.overlay.create(overlayConfig);

    this.overlayRef.backdropClick().subscribe(() => this.close());

    const portal = new ComponentPortal(ContextMenuComponent);
    const componentRef = this.overlayRef.attach(portal);

    // Initialize the component
    this.actionSubject = new Subject<ContextMenuItem>();
    componentRef.instance.items = items;
    componentRef.instance.data = data;
    componentRef.instance.actionSelected.subscribe(action => {
      this.actionSubject.next(action);
      this.close();
    });

    return this.actionSubject.asObservable();
  }

  openAttached(element: HTMLElement, items: ContextMenuItem[], data?: any): Observable<ContextMenuItem> {
    this.close();

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(element)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' }
      ])
      .withPush(true);

    const overlayConfig = new OverlayConfig({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.close()
    });

    this.overlayRef = this.overlay.create(overlayConfig);

    this.overlayRef.backdropClick().subscribe(() => this.close());

    const portal = new ComponentPortal(ContextMenuComponent);
    const componentRef = this.overlayRef.attach(portal);

    this.actionSubject = new Subject<ContextMenuItem>();
    componentRef.instance.items = items;
    componentRef.instance.data = data;
    componentRef.instance.actionSelected.subscribe(action => {
      this.actionSubject.next(action);
      this.close();
    });

    return this.actionSubject.asObservable();
  }

  close() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
