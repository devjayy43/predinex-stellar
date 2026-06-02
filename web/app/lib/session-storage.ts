/**
 * Session Storage Service
 * Secure session persistence for wallet connections
 */

import { WalletSession } from './wallet-service';
import { createScopedLogger } from './logger';

const log = createScopedLogger('session-storage');

export interface StoredSession {
  session: WalletSession;
  timestamp: number;
  version: string;
}

export class SessionStorageService {
  private static readonly STORAGE_KEY = 'predinex_wallet_session';
  private static readonly STORAGE_VERSION = '1.0.0';
  private static readonly SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Store wallet session securely
   */
  static storeSession(session: WalletSession): void {
    try {
      const storedSession: StoredSession = {
        session,
        timestamp: Date.now(),
        version: this.STORAGE_VERSION,
      };

      const encrypted = this.encryptData(JSON.stringify(storedSession));
      localStorage.setItem(this.STORAGE_KEY, encrypted);
    } catch (error) {
      log.error('Failed to store session', error);
      throw new Error('Session storage failed');
    }
  }

  /**
   * Retrieve wallet session
   */
  static retrieveSession(): WalletSession | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const decrypted = this.decryptData(stored);
      const storedSession: StoredSession = JSON.parse(decrypted);

      // Check version compatibility
      if (storedSession.version !== this.STORAGE_VERSION) {
        this.clearSession();
        return null;
      }

      // Check expiration
      if (Date.now() - storedSession.timestamp > this.SESSION_TTL) {
        this.clearSession();
        return null;
      }

      // Validate session structure
      if (!this.isValidSession(storedSession.session)) {
        this.clearSession();
        return null;
      }

      return {
        ...storedSession.session,
        connectedAt: new Date(storedSession.session.connectedAt),
        lastActivity: new Date(storedSession.session.lastActivity),
      };
    } catch (error) {
      log.error('Failed to retrieve session', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Clear stored session
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      log.error('Failed to clear session', error);
    }
  }

  /**
   * Update session activity timestamp
   */
  static updateActivity(session: WalletSession): void {
    const updatedSession = {
      ...session,
      lastActivity: new Date(),
    };
    this.storeSession(updatedSession);
  }

  /**
   * Check if session exists
   */
  static hasStoredSession(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  /**
   * Validate session structure
   */
  private static isValidSession(session: unknown): session is WalletSession {
    return (
      session &&
      typeof (session as any).address === 'string' &&
      typeof (session as any).publicKey === 'string' &&
      typeof (session as any).network === 'string' &&
      typeof (session as any).balance === 'number' &&
      typeof (session as any).isConnected === 'boolean' &&
      typeof (session as any).walletType === 'string' &&
      (session as any).connectedAt &&
      (session as any).lastActivity
    );
  }

  /**
   * Simple encryption for session data
   * Note: This is basic obfuscation, not cryptographically secure
   */
  private static encryptData(data: string): string {
    // Simple base64 encoding with rotation
    const encoded = btoa(data);
    return encoded.split('').reverse().join('');
  }

  /**
   * Simple decryption for session data
   */
  private static decryptData(data: string): string {
    // Reverse the rotation and decode
    const reversed = data.split('').reverse().join('');
    return atob(reversed);
  }

  /**
   * Get storage usage info.
   *
   * Uses the async Storage API (navigator.storage.estimate) where available,
   * with a synchronous fallback that only calculates already-used space by
   * iterating existing localStorage keys — it no longer writes test data to
   * localStorage, eliminating the previous 10 MB quota-filling side effect.
   *
   * Note: call the async variant `getStorageInfoAsync()` when you need the
   * available-quota figure; this sync overload returns `available: 0` on
   * browsers that lack the Storage API.
   */
  static getStorageInfo(): { used: number; available: number } {
    try {
      let used = 0;
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          used += (localStorage[key]?.length ?? 0) + key.length;
        }
      }
      return { used, available: 0 };
    } catch {
      return { used: 0, available: 0 };
    }
  }

  /**
   * Async variant that uses navigator.storage.estimate() to determine both
   * used and available quota without writing any test data to localStorage.
   * Falls back to the sync getStorageInfo() on unsupported browsers.
   */
  static async getStorageInfoAsync(): Promise<{ used: number; available: number }> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        return { used: usage, available: quota - usage };
      }
    } catch {
      // Storage API unavailable — fall through to sync fallback
    }
    return this.getStorageInfo();
  }
}