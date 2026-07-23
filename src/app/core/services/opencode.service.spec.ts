// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpencodeService, OpenCodeConfig } from './opencode.service';
import { EncryptionService } from './encryption.service';
import { FirebaseService } from './firebase.service';

try {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  );
} catch {
  // Already initialized
}

describe('OpencodeService', () => {
  let service: OpencodeService;
  let mockEncryptionService: Partial<EncryptionService>;
  let mockFirebaseService: Partial<FirebaseService>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    mockEncryptionService = {
      encrypt: vi.fn().mockImplementation(async (data: any) => `encrypted:${JSON.stringify(data)}`),
      decrypt: vi.fn().mockImplementation(async (str: string) => {
        if (str && str.startsWith('encrypted:')) {
          return JSON.parse(str.replace('encrypted:', ''));
        }
        return null;
      })
    };

    mockFirebaseService = {
      currentUser: vi.fn().mockReturnValue(null) as any
    };

    TestBed.configureTestingModule({
      providers: [
        OpencodeService,
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: FirebaseService, useValue: mockFirebaseService }
      ]
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    service = TestBed.inject(OpencodeService);
  });

  afterEach(() => {
    if (service) {
      service.disconnect();
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should be created with initial disconnected status', () => {
    expect(service).toBeTruthy();
    expect(service.connectionStatus()).toBe('disconnected');
    expect(service.savedConfig()).toBeNull();
    expect(service.isConnected()).toBe(false);
  });

  it('should save and load encrypted config successfully', async () => {
    const testConfig: OpenCodeConfig = {
      instanceUrl: 'https://my-opencode-instance.example.com',
      authToken: 'secret_token_12345'
    };

    const saveResult = await service.saveConfig(testConfig);
    expect(saveResult).toBe(true);
    expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(testConfig);
    expect(service.savedConfig()).toEqual(testConfig);

    const loadedConfig = await service.loadSavedConfig();
    expect(loadedConfig).toEqual(testConfig);
  });

  it('should fail connection if config is missing or invalid', async () => {
    const result = await service.connect({ instanceUrl: '', authToken: '' });
    expect(result).toBe(false);
    expect(service.connectionStatus()).toBe('error');
    expect(service.errorMessage()).toContain('يرجى إدخال');
  });

  it('should reset connection and remove stored config', async () => {
    const testConfig: OpenCodeConfig = {
      instanceUrl: 'https://my-opencode.example.com',
      authToken: 'token123'
    };

    await service.saveConfig(testConfig);
    expect(service.savedConfig()).toEqual(testConfig);

    await service.resetConnection();
    expect(service.savedConfig()).toBeNull();
    expect(service.connectionStatus()).toBe('disconnected');
  });
});
