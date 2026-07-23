// @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpencodeComponent } from './opencode.component';
import { OpencodeService } from '../../core/services/opencode.service';
import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';

try {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  );
} catch {
  // Already initialized
}

describe('OpencodeComponent', () => {
  let component: OpencodeComponent;
  let mockOpencodeService: Partial<OpencodeService>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    mockOpencodeService = {
      connectionStatus: signal('disconnected'),
      savedConfig: signal(null),
      errorMessage: signal(''),
      isConnected: signal(false) as any,
      isConnecting: signal(false) as any,
      isColdStart: signal(false) as any,
      hasSavedConfig: signal(false) as any,
      connect: vi.fn().mockResolvedValue(true) as any,
      disconnect: vi.fn(),
      resetConnection: vi.fn().mockResolvedValue(undefined) as any,
      sendInput: vi.fn(),
      onData: vi.fn().mockReturnValue(() => {})
    };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: OpencodeService, useValue: mockOpencodeService }
      ]
    });

    TestBed.runInInjectionContext(() => {
      component = new OpencodeComponent();
    });

    component.ngOnInit();
  });

  it('should create the component and initialize form', () => {
    expect(component).toBeTruthy();
    expect(component.connectForm).toBeDefined();
    expect(component.connectForm.valid).toBe(false);
  });

  it('should validate instanceUrl and authToken form controls', () => {
    const urlControl = component.connectForm.get('instanceUrl');
    const tokenControl = component.connectForm.get('authToken');

    urlControl?.setValue('invalid-url-format-spaces string');
    tokenControl?.setValue('12');

    expect(urlControl?.valid).toBe(false);
    expect(tokenControl?.valid).toBe(false);

    urlControl?.setValue('https://my-opencode.render.com');
    tokenControl?.setValue('valid_token_123');

    expect(urlControl?.valid).toBe(true);
    expect(tokenControl?.valid).toBe(true);
    expect(component.connectForm.valid).toBe(true);
  });

  it('should call connect on service when form is valid', async () => {
    component.connectForm.setValue({
      instanceUrl: 'https://opencode-instance.example.com',
      authToken: 'token_abc123'
    });

    await component.handleConnect();

    expect(mockOpencodeService.connect).toHaveBeenCalledWith({
      instanceUrl: 'https://opencode-instance.example.com',
      authToken: 'token_abc123'
    });
  });
});
