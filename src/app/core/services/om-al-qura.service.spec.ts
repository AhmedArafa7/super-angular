import { TestBed } from '@angular/core/testing';
import { OmAlQuraService } from './om-al-qura.service';
import { FirebaseService } from './firebase.service';
import { ToastService } from './toast.service';

class MockFirebaseService {
  firestore = null;
}

class MockToastService {
  show = jasmine.createSpy('show');
}

describe('OmAlQuraService', () => {
  let service: OmAlQuraService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OmAlQuraService,
        { provide: FirebaseService, useClass: MockFirebaseService },
        { provide: ToastService, useClass: MockToastService }
      ]
    });
    service = TestBed.inject(OmAlQuraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should manage categories correctly', () => {
    service.addCategory('قسم تجريبي جديد');
    expect(service.categories()).toContain('قسم تجريبي جديد');

    service.renameCategory('قسم تجريبي جديد', 'قسم معدل');
    expect(service.categories()).toContain('قسم معدل');
    expect(service.categories()).not.toContain('قسم تجريبي جديد');

    service.deleteCategory('قسم معدل');
    expect(service.categories()).not.toContain('قسم معدل');
  });

  it('should manage products and compute low stock', () => {
    service.addProduct({
      name: 'مسحوق غسيل تجريبي',
      barcode: '690111222',
      category: 'منظفات',
      price: 150,
      stockQuantity: 3,
      discountPercent: 0,
      isBoycott: false,
      boycottAlternatives: [],
      locationInStore: 'الممر 1',
      isInWarehouse: false,
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
      description: 'وصف تجريبي'
    });

    expect(service.products().length).toBeGreaterThan(0);
    expect(service.lowStockProducts().length).toBeGreaterThan(0);
  });

  it('should validate daily attendance code', () => {
    const currentCode = service.dailyAttendanceCode();
    expect(currentCode).toBeTruthy();
    expect(service.validateAttendanceCode(currentCode)).toBeTrue();
    expect(service.validateAttendanceCode('9999')).toBeFalse();
  });

  it('should calculate financial metrics correctly', () => {
    expect(service.totalSalesRevenue()).toBe(0);
    expect(service.netProfitOrLoss()).toBeDefined();
    expect(typeof service.isProfit()).toBe('boolean');
  });
});
