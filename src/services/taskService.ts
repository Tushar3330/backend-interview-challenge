import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';

export class TaskService {
  constructor(private db: Database) {}

  async createTask(taskData: Partial<Task>): Promise<Task> {
    // Generate UUID for the task
    const id = uuidv4();
    const now = new Date().toISOString();

    // Set default values
    const task: Task = {
      id,
      title: taskData.title || '',
      description: taskData.description || undefined,
      completed: taskData.completed || false,
      created_at: new Date(now),
      updated_at: new Date(now),
      is_deleted: false,
      sync_status: 'pending',
      server_id: undefined,
      last_synced_at: undefined,
    };

    // Insert into database
    await this.db.run(
      `INSERT INTO tasks (id, title, description, completed, created_at, updated_at, is_deleted, sync_status, server_id, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        task.description,
        task.completed ? 1 : 0,
        now,
        now,
        task.is_deleted ? 1 : 0,
        task.sync_status,
        task.server_id,
        task.last_synced_at,
      ]
    );

    // Add to sync queue
    await this.addToSyncQueue(task.id, 'create', task);

    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // Check if task exists
    const existingTask = await this.getTask(id);
    if (!existingTask) {
      return null;
    }

    const now = new Date().toISOString();

    // Build update query dynamically based on provided fields
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.completed !== undefined) {
      updateFields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }

    // Always update these fields
    updateFields.push('updated_at = ?');
    values.push(now);
    updateFields.push('sync_status = ?');
    values.push('pending');

    values.push(id);

    // Update task in database
    await this.db.run(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated task
    const updatedTask = await this.getTaskIncludingDeleted(id);
    if (!updatedTask) {
      return null;
    }

    // Add to sync queue
    await this.addToSyncQueue(id, 'update', updatedTask);

    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    // Check if task exists
    const existingTask = await this.getTask(id);
    if (!existingTask) {
      return false;
    }

    const now = new Date().toISOString();

    // Set is_deleted to true (soft delete)
    await this.db.run(
      `UPDATE tasks SET is_deleted = ?, updated_at = ?, sync_status = ? WHERE id = ?`,
      [1, now, 'pending', id]
    );

    // Get the deleted task for sync queue
    const deletedTask = await this.getTaskIncludingDeleted(id);
    if (deletedTask) {
      // Add to sync queue
      await this.addToSyncQueue(id, 'delete', deletedTask);
    }

    return true;
  }

  async getTask(id: string): Promise<Task | null> {
    // Query database for task by id where is_deleted is false
    const row = await this.db.get(
      'SELECT * FROM tasks WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (!row) {
      return null;
    }

    return this.rowToTask(row);
  }

  async getAllTasks(): Promise<Task[]> {
    // Query database for all tasks where is_deleted = false
    const rows = await this.db.all(
      'SELECT * FROM tasks WHERE is_deleted = 0 ORDER BY created_at DESC'
    );

    return rows.map(this.rowToTask);
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    // Get all tasks with sync_status = 'pending' or 'error'
    const rows = await this.db.all(
      `SELECT * FROM tasks WHERE sync_status IN ('pending', 'error') ORDER BY updated_at ASC`
    );

    return rows.map(this.rowToTask);
  }

  // Helper method to get task including deleted ones (for internal use)
  private async getTaskIncludingDeleted(id: string): Promise<Task | null> {
    const row = await this.db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!row) {
      return null;
    }
    return this.rowToTask(row);
  }

  // Helper method to add operations to sync queue
  private async addToSyncQueue(
    taskId: string,
    operation: 'create' | 'update' | 'delete',
    data: Partial<Task>
  ): Promise<void> {
    const queueId = uuidv4();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [queueId, taskId, operation, JSON.stringify(data), now, 0]
    );
  }

  // Helper method to convert database row to Task object
  private rowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed === 1,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_deleted: row.is_deleted === 1,
      sync_status: row.sync_status,
      server_id: row.server_id,
      last_synced_at: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    };
  }
}