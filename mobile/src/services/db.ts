/**
 * SQLite Local Database Service & Offline Sync Queue Manager.
 */

import { Alert } from 'react-native';

export interface SyncPayload {
  id: string;
  type: 'check_in' | 'check_out' | 'gps_ping' | 'farmer_register' | 'stock_audit' | 'dealer_order' | 'crop_issue' | 'plan_submit';
  payload: string; // JSON String
  created_at: string;
  endpoint: string; // e.g. '/location/ping' - needed to actually replay the request
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: any; // parsed payload, kept alongside the JSON string for convenience
}

// Simulated SQLite Client. In a real React Native environment, this uses 'react-native-sqlite-storage'.
class OfflineSyncDatabase {
  private localQueue: SyncPayload[] = [];

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    console.log('[SQLite DB] Initialized offline database table structure.');
  }

  // Queue item locally when offline
  public async queueItem(
    type: SyncPayload['type'],
    data: any,
    endpoint: string,
    method: SyncPayload['method'] = 'POST'
  ): Promise<void> {
    const item: SyncPayload = {
      id: Math.random().toString(36).substring(7),
      type,
      payload: JSON.stringify(data),
      data,
      endpoint,
      method,
      created_at: new Date().toISOString(),
    };
    this.localQueue.push(item);
    console.log(`[SQLite DB] Queued offline action of type [${type}]. Local queue count: ${this.localQueue.length}`);
    Alert.alert(
      'Offline Mode',
      'No internet connection. Action saved locally and will auto-sync when network returns.'
    );
  }

  // Retrieve all queued items
  public async getQueuedItems(): Promise<SyncPayload[]> {
    return [...this.localQueue];
  }

  // Delete item from queue after successful sync
  public async dequeueItem(id: string): Promise<void> {
    this.localQueue = this.localQueue.filter(item => item.id !== id);
    console.log(`[SQLite DB] Cleared synced item [${id}]. Remaining queue: ${this.localQueue.length}`);
  }

  // Re-sync all queued events to the backend REST API
  public async syncQueueWithBackend(apiClient: (item: SyncPayload) => Promise<boolean>): Promise<void> {
    if (this.localQueue.length === 0) return;

    console.log(`[Sync Engine] Found ${this.localQueue.length} queued events. Initiating re-sync...`);
    let successfulSyncs = 0;
    
    for (const item of [...this.localQueue]) {
      try {
        const success = await apiClient(item);
        if (success) {
          await this.dequeueItem(item.id);
          successfulSyncs++;
        }
      } catch (err) {
        console.error(`[Sync Engine] Failed to sync item [${item.id}] of type [${item.type}]:`, err);
        break; // Stop sync train if connection fails midway
      }
    }

    if (successfulSyncs > 0) {
      Alert.alert(
        'Synchronization Successful',
        `Successfully synced ${successfulSyncs} offline action(s) to Vishakan Biotech servers.`
      );
    }
  }
}

export const dbService = new OfflineSyncDatabase();
