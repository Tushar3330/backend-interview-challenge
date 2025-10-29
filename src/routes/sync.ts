import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Trigger manual sync
  router.post('/sync', async (req: Request, res: Response) => {
    try {
      // Check connectivity first
      const isOnline = await syncService.checkConnectivity();
      
      if (!isOnline) {
        return res.status(503).json({ 
          error: 'Service unavailable - cannot reach sync server',
          timestamp: new Date(),
          path: req.path,
        });
      }

      // Call syncService.sync()
      const result = await syncService.sync();

      // Return sync result
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Sync failed',
        message: (error as Error).message,
        timestamp: new Date(),
        path: req.path,
      });
    }
  });

  // Check sync status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      // Get sync status from service
      const status = await syncService.getSyncStatus();
      
      return res.json(status);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to get sync status',
        timestamp: new Date(),
        path: req.path,
      });
    }
  });

  // Batch sync endpoint (for server-side)
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      // This endpoint simulates a server-side batch sync handler
      // In a real implementation, this would be on a separate server
      
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ 
          error: 'Invalid request - items array is required',
          timestamp: new Date(),
          path: req.path,
        });
      }

      // Simulate processing each item
      const processed_items = items.map((item: any) => {
        // Simulate successful sync
        return {
          client_id: item.task_id,
          server_id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'success',
          resolved_data: item.data,
        };
      });

      return res.json({ processed_items });
    } catch (error) {
      return res.status(500).json({ 
        error: 'Batch sync failed',
        timestamp: new Date(),
        path: req.path,
      });
    }
  });

  // Health check endpoint
  router.get('/health', async (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  return router;
}