import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Task, SyncQueueItem, SyncResult, BatchSyncRequest, BatchSyncResponse } from '../types';
import { Database } from '../db/database';
import { TaskService } from './taskService';

export class SyncService {
  private apiUrl: string;
  private batchSize: number;
  private maxRetries: number = 3;
  
  constructor(
    private db: Database,
 
    private _taskService: TaskService,
    apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
  ) {
    this.apiUrl = apiUrl;
    this.batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '50', 10);
  }

  async sync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced_items: 0,
      failed_items: 0,
      errors: [],
    };

    try {
     
      const queueItems = await this.getSyncQueueItems();

      if (queueItems.length === 0) {
        return result;
      }


      for (let i = 0; i < queueItems.length; i += this.batchSize) {
        const batch = queueItems.slice(i, i + this.batchSize);
        
        try {
          const batchResponse = await this.processBatch(batch);

          for (const processedItem of batchResponse.processed_items) {
            if (processedItem.status === 'success' || processedItem.status === 'conflict') {
         
              await this.updateSyncStatus(
                processedItem.client_id,
                'synced',
                {
                  server_id: processedItem.server_id,
                  ...processedItem.resolved_data,
                }
              );
              
        
              await this.removeFromSyncQueue(processedItem.client_id);
              result.synced_items++;

         
              if (processedItem.status === 'conflict') {
                result.errors.push({
                  task_id: processedItem.client_id,
                  operation: 'sync',
                  error: 'Conflict resolved using last-write-wins',
                  timestamp: new Date(),
                });
              }
            } else {
              
              const queueItem = batch.find(item => item.task_id === processedItem.client_id);
              if (queueItem) {
                await this.handleSyncError(
                  queueItem,
                  new Error(processedItem.error || 'Unknown error')
                );
              }
              result.failed_items++;
              result.errors.push({
                task_id: processedItem.client_id,
                operation: 'sync',
                error: processedItem.error || 'Unknown error',
                timestamp: new Date(),
              });
            }
          }
        } catch (error) {
          
          result.success = false;
          for (const item of batch) {
            await this.handleSyncError(item, error as Error);
            result.failed_items++;
            result.errors.push({
              task_id: item.task_id,
              operation: item.operation,
              error: (error as Error).message,
              timestamp: new Date(),
            });
          }
        }
      }

 
      result.success = result.failed_items === 0;
      
    } catch (error) {
      result.success = false;
      result.errors.push({
        task_id: 'N/A',
        operation: 'sync',
        error: (error as Error).message,
        timestamp: new Date(),
      });
    }

    return result;
  }

  async addToSyncQueue(taskId: string, operation: 'create' | 'update' | 'delete', data: Partial<Task>): Promise<void> {
    const queueId = uuidv4();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [queueId, taskId, operation, JSON.stringify(data), now, 0]
    );
  }

  private async getSyncQueueItems(): Promise<SyncQueueItem[]> {
  
    const rows = await this.db.all(
      `SELECT * FROM sync_queue 
       WHERE retry_count < ? 
       ORDER BY created_at ASC`,
      [this.maxRetries]
    );

    return rows.map(row => ({
      id: row.id,
      task_id: row.task_id,
      operation: row.operation,
      data: JSON.parse(row.data),
      created_at: new Date(row.created_at),
      retry_count: row.retry_count,
      error_message: row.error_message,
    }));
  }

  private async processBatch(items: SyncQueueItem[]): Promise<BatchSyncResponse> {
   
    const batchRequest: BatchSyncRequest = {
      items,
      client_timestamp: new Date(),
    };

  
    const checksum = this.calculateChecksum(items);

  
    const response = await axios.post(`${this.apiUrl}/batch`, {
      ...batchRequest,
      checksum,
    });

    return response.data;
  }

  private calculateChecksum(items: SyncQueueItem[]): string {
   
    const data = items.map(item => `${item.task_id}-${item.operation}`).join('|');
    return Buffer.from(data).toString('base64');
  }

  // Conflict resolution method (kept for future enhancements)

  private async _resolveConflict(localTask: Task, serverTask: Task): Promise<Task> {
    // Implement last-write-wins conflict resolution
    const localTime = new Date(localTask.updated_at).getTime();
    const serverTime = new Date(serverTask.updated_at).getTime();

    // Compare timestamps
    if (localTime > serverTime) {
      console.log(`Conflict resolved: Local task ${localTask.id} is newer`);
      return localTask;
    } else if (serverTime > localTime) {
      console.log(`Conflict resolved: Server task ${localTask.id} is newer`);
      return serverTask;
    } else {

      console.log(`Conflict resolved: Timestamps equal, using server version for task ${localTask.id}`);
      return serverTask;
    }
  }

  private async updateSyncStatus(taskId: string, status: 'synced' | 'error', serverData?: Partial<Task>): Promise<void> {
    const now = new Date().toISOString();
    
    const updateFields: string[] = ['sync_status = ?'];
    const values: any[] = [status];

    if (status === 'synced') {
      updateFields.push('last_synced_at = ?');
      values.push(now);

      if (serverData?.server_id) {
        updateFields.push('server_id = ?');
        values.push(serverData.server_id);
      }
    }

    values.push(taskId);

    await this.db.run(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
  }

  private async removeFromSyncQueue(taskId: string): Promise<void> {
    await this.db.run(
      'DELETE FROM sync_queue WHERE task_id = ?',
      [taskId]
    );
  }

  private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
    const newRetryCount = item.retry_count + 1;

    if (newRetryCount >= this.maxRetries) {
     
      await this.db.run(
        `UPDATE sync_queue 
         SET retry_count = ?, error_message = ? 
         WHERE id = ?`,
        [newRetryCount, error.message, item.id]
      );

  
      await this.db.run(
        `UPDATE tasks SET sync_status = ? WHERE id = ?`,
        ['failed', item.task_id]
      );

      console.error(`Task ${item.task_id} moved to dead letter queue after ${this.maxRetries} attempts`);
    } else {

      await this.db.run(
        `UPDATE sync_queue 
         SET retry_count = ?, error_message = ? 
         WHERE id = ?`,
        [newRetryCount, error.message, item.id]
      );

 
      await this.db.run(
        `UPDATE tasks SET sync_status = ? WHERE id = ?`,
        ['error', item.task_id]
      );

      console.log(`Sync failed for task ${item.task_id}, retry ${newRetryCount}/${this.maxRetries}`);
    }
  }

  async getSyncStatus(): Promise<{
    pending_sync_count: number;
    last_sync_timestamp: Date | null;
    is_online: boolean;
    sync_queue_size: number;
  }> {
    // Get pending sync count
    const pendingCountResult = await this.db.get(
      `SELECT COUNT(*) as count FROM tasks WHERE sync_status IN ('pending', 'error')`
    );
    const pending_sync_count = pendingCountResult?.count || 0;

    // Get last sync timestamp
    const lastSyncResult = await this.db.get(
      `SELECT last_synced_at FROM tasks WHERE last_synced_at IS NOT NULL ORDER BY last_synced_at DESC LIMIT 1`
    );
    const last_sync_timestamp = lastSyncResult?.last_synced_at 
      ? new Date(lastSyncResult.last_synced_at) 
      : null;

    // Check connectivity
    const is_online = await this.checkConnectivity();

    // Get sync queue size
    const queueSizeResult = await this.db.get(
      `SELECT COUNT(*) as count FROM sync_queue`
    );
    const sync_queue_size = queueSizeResult?.count || 0;

    return {
      pending_sync_count,
      last_sync_timestamp,
      is_online,
      sync_queue_size,
    };
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // Helper method to check if service is properly initialized (for testing/debugging)
  isInitialized(): boolean {
    return !!this.db && !!this._taskService;
  }


  canResolveConflicts(): boolean {
    return typeof this._resolveConflict === 'function';
  }
}