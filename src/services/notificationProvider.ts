/**
 * DevCatalyst Hub — Notification Provider Abstraction
 * Decouples business logic from specific email delivery vendors.
 *
 * Security: Private provider credentials (e.g. Resend, SendGrid, AWS SES)
 * must NEVER be bundled into client-side code. Production dispatch is funneled
 * through a trusted InsForge Serverless Edge Function.
 */

import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { EmailMessage, SendEmailResult } from '../types/notifications';

export interface NotificationProvider {
  name: string;
  sendEmail(message: EmailMessage): Promise<SendEmailResult>;
}

const LOCAL_STORAGE_MOCK_DISPATCHES_KEY = 'devcatalyst_hub_mock_dispatches';

/**
 * 1. Mock Notification Provider (Local / Offline / Test Suite Engine)
 * Persists sent messages locally for testing, verification, and inspection.
 */
export class MockNotificationProvider implements NotificationProvider {
  name = 'MockNotificationProvider (Local Verification Engine)';

  private simulatedFailure: { message: string; isRetryable: boolean } | null = null;

  sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    if (this.simulatedFailure) {
      const { message: errText, isRetryable } = this.simulatedFailure;
      this.simulatedFailure = null; // consume once
      return Promise.resolve({
        success: false,
        error: errText,
        isRetryable,
      });
    }

    const messageId = `mock-msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_MOCK_DISPATCHES_KEY);
      const existing: Array<EmailMessage & { messageId: string; dispatchedAt: string }> = raw
        ? JSON.parse(raw)
        : [];
      existing.push({
        ...message,
        messageId,
        dispatchedAt: new Date().toISOString(),
      });
      localStorage.setItem(LOCAL_STORAGE_MOCK_DISPATCHES_KEY, JSON.stringify(existing));
    } catch {
      // Ignore localStorage write failure in non-browser environments
    }

    return Promise.resolve({
      success: true,
      messageId,
    });
  }

  // Test Simulation Utilities
  simulateFailureOnce(errorMessage = 'Simulated delivery failure'): void {
    this.simulatedFailure = { message: errorMessage, isRetryable: false };
  }

  simulateRetryableFailureOnce(errorMessage = 'Temporary upstream timeout'): void {
    this.simulatedFailure = { message: errorMessage, isRetryable: true };
  }

  getDispatchedEmails(): Array<EmailMessage & { messageId: string; dispatchedAt: string }> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_MOCK_DISPATCHES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  clearDispatches(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_MOCK_DISPATCHES_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * 2. InsForge Edge Function Provider (Trusted Backend Delivery)
 * Relies on the server-side InsForge function to dispatch emails via Resend / SMTP
 * without leaking API keys to the browser bundle.
 */
export class InsForgeEdgeFunctionEmailProvider implements NotificationProvider {
  name = 'InsForgeEdgeFunctionEmailProvider (Server-Side Delivery)';

  async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    try {
      // Dispatches to the trusted InsForge serverless function: send-notification
      // Auth token is passed in Authorization header automatically by SDK
      const response = await insforge.functions.invoke('send-notification', {
        body: {
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          idempotencyKey: message.idempotencyKey,
          attachments: message.attachments,
        },
      });

      if (response.error) {
        const isNetworkErr = response.error.message?.includes('network') || response.error.message?.includes('timeout');
        return {
          success: false,
          error: response.error.message || 'Serverless function execution failed',
          isRetryable: isNetworkErr,
        };
      }

      const result = response.data;
      return {
        success: Boolean(result?.success),
        messageId: result?.messageId || `insforge-${Date.now()}`,
        error: result?.error,
        isRetryable: Boolean(result?.isRetryable),
      };
    } catch (err: unknown) {
      const errMsg = (err as Error).message || 'Unexpected failure contacting InsForge notification endpoint';
      return {
        success: false,
        error: errMsg,
        isRetryable: true,
      };
    }
  }
}

// Global Provider Instance Management
const defaultMockProvider = new MockNotificationProvider();
const defaultEdgeProvider = new InsForgeEdgeFunctionEmailProvider();

let activeProvider: NotificationProvider = isInsForgeConfigured ? defaultEdgeProvider : defaultMockProvider;

export function getActiveNotificationProvider(): NotificationProvider {
  return activeProvider;
}

export function setActiveNotificationProvider(provider: NotificationProvider): void {
  activeProvider = provider;
}

export function resetNotificationProvider(): void {
  activeProvider = isInsForgeConfigured ? defaultEdgeProvider : defaultMockProvider;
}

export { defaultMockProvider };
