/**
 * REST API Client for Mobile FFM App.
 */

import { dbService, SyncPayload } from './db';
import { getDeviceId } from './deviceId';

// Previously hardcoded to 'http://localhost:8000/api/v1' unconditionally -
// meant every build (dev, preview, store) pointed at the same address,
// and on a physical device 'localhost' means the device itself, not a
// dev machine, so real-device testing failed silently (LocationService.ts
// swallows ping errors with a console.warn, so nothing visible on screen
// told you why).
//
// EXPO_PUBLIC_-prefixed env vars are inlined into the JS bundle
// automatically by Metro as of SDK 49 - no app.config.js/Constants
// plumbing needed for this to work; eas.json's per-profile `env` block
// is what actually sets the value per build. Falls back to localhost
// for plain `expo start` local dev, where that address is genuinely
// correct (web/simulator) or made correct via `adb reverse` (physical
// device over USB - see mobile/eas.json's development profile comment).
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class FFMAPIClient {
  private isOnline: boolean = true;
  private token: string | null = null;
  private userId: string | null = null;
  private userFullName: string | null = null;
  private userRole: string | null = null;
  private userEmployeeId: string | null = null;
  private deviceId: string | null = null;

  public setOnlineStatus(online: boolean) {
    this.isOnline = online;
    console.log(`[Network Status] App toggled to ${online ? 'ONLINE' : 'OFFLINE'}`);
    if (online) {
      this.triggerBackgroundSync();
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public setAuthToken(token: string) {
    this.token = token;
  }

  public getUserId(): string | null {
    return this.userId;
  }

  // Real per-install device identifier, resolved once at login and reused
  // for later requests (e.g. attendance check-in) so every call in a
  // session reports the same value rather than re-deriving it separately.
  public getDeviceIdValue(): string | null {
    return this.deviceId;
  }

  public getCurrentUser(): { id: string; fullName: string; role: string; employeeId: string } | null {
    if (!this.userId || !this.userFullName || !this.userRole) return null;
    return {
      id: this.userId,
      fullName: this.userFullName,
      role: this.userRole,
      employeeId: this.userEmployeeId ?? '',
    };
  }

  public isLoggedIn(): boolean {
    return !!this.token;
  }

  public logout() {
    this.token = null;
    this.userId = null;
    this.userFullName = null;
    this.userRole = null;
    this.userEmployeeId = null;
    this.deviceId = null;
  }

  // Real login: authenticates against the backend and stores the real
  // access token + user id. Previously LoginScreen accepted any non-empty
  // employee ID/password and set a hardcoded 'mock-jwt-token', so no
  // request ever succeeded once real network calls were made.
  //
  // device_id is now a real OS-persisted identifier (see deviceId.ts),
  // not omitted. The backend's LoginUserUseCase binds it to the account
  // on first login and rejects mismatches on later logins - previously
  // the mobile app never sent this field at all, so that check was never
  // actually engaged for mobile logins.
  public async login(employeeId: string, password: string): Promise<{ id: string; fullName: string; role: string }> {
    this.deviceId = await getDeviceId();
    const loginRes = await this.sendRequest('/auth/login', 'POST', {
      employee_id: employeeId,
      password,
      device_id: this.deviceId,
    });
    this.token = loginRes.access_token;

    const me = await this.sendRequest('/auth/me', 'GET');
    this.userId = me.id;
    this.userFullName = me.full_name;
    this.userRole = me.role;
    this.userEmployeeId = me.employee_id ?? employeeId;
    return { id: me.id, fullName: me.full_name, role: me.role };
  }

  // Uploads a captured photo as multipart/form-data and returns the real
  // URL the backend stored it at. Deliberately bypasses request()'s JSON
  // path and offline queue - a local file URI (especially one from the
  // camera's cache) isn't safely replayable later the way a JSON payload
  // is, so this only succeeds while actually online.
  public async uploadFile(endpoint: string, fileUri: string, fileName: string, mimeType: string): Promise<string> {
    const formData = new FormData();
    // React Native's FormData expects this {uri, name, type} shape for a
    // file field, not a browser File object - fetch/RN sets the
    // multipart boundary itself, so Content-Type is intentionally not
    // set manually here (matches the JSON path avoiding that mistake too).
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Upload failed (${response.status}): ${body}`);
    }
    const data = await response.json();
    return data.url;
  }

  // Trigger re-syncing database queue
  private async triggerBackgroundSync() {
    await dbService.syncQueueWithBackend(async (item: SyncPayload) => {
      try {
        await this.sendRequest(item.endpoint, item.method, item.data);
        return true;
      } catch (err) {
        console.warn(`[Sync] Failed to upload queued item [${item.type}]`, err);
        return false;
      }
    });
  }

  // Does the actual HTTP call. Throws on any network or server error.
  private async sendRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(data ?? {}),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Request failed (${response.status}): ${body}`);
    }
    if (response.status === 204) return { success: true };
    return response.json().catch(() => ({ success: true }));
  }

  // Wrapper that automatically falls back to an offline queue when there is no
  // connection, and re-queues on server errors so nothing is silently lost.
  public async request(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    type: SyncPayload['type'],
    data?: any
  ): Promise<any> {
    if (!this.isOnline) {
      if (method !== 'GET') {
        await dbService.queueItem(type, data, endpoint, method);
        return { offline: true, message: 'Saved to sync queue.' };
      }
      throw new Error('Connection offline. Cannot load live reports.');
    }

    try {
      return await this.sendRequest(endpoint, method, data);
    } catch (err) {
      if (method !== 'GET') {
        // Reachable network but the request still failed (bad token, server
        // hiccup, etc) - queue it instead of dropping the data on the floor.
        await dbService.queueItem(type, data, endpoint, method);
      }
      throw err;
    }
  }
}

export const apiClient = new FFMAPIClient();
