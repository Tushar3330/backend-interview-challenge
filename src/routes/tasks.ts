import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);

  // Get all tasks
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const tasks = await taskService.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get single task
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.json(task);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create task
  router.post('/', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const { title, description, completed } = req.body;

      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ 
          error: 'Title is required and must be a non-empty string',
          timestamp: new Date(),
          path: req.path,
        });
      }

      // Create task
      const task = await taskService.createTask({
        title: title.trim(),
        description: description ? String(description) : undefined,
        completed: completed === true,
      });

      return res.status(201).json(task);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to create task',
        timestamp: new Date(),
        path: req.path,
      });
    }
  });

  // Update task
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, completed } = req.body;

      // Validate at least one field to update
      if (title === undefined && description === undefined && completed === undefined) {
        return res.status(400).json({ 
          error: 'At least one field (title, description, or completed) must be provided',
          timestamp: new Date(),
          path: req.path,
        });
      }

      // Validate title if provided
      if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
        return res.status(400).json({ 
          error: 'Title must be a non-empty string',
          timestamp: new Date(),
          path: req.path,
        });
      }

      // Update task
      const updates: any = {};
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description;
      if (completed !== undefined) updates.completed = completed === true;

      const updatedTask = await taskService.updateTask(id, updates);

      if (!updatedTask) {
        return res.status(404).json({ 
          error: 'Task not found',
          timestamp: new Date(),
          path: req.path,
        });
      }

      return res.json(updatedTask);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to update task',
        timestamp: new Date(),
        path: req.path,
      });
    }
  });

  // Delete task
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const deleted = await taskService.deleteTask(id);

      if (!deleted) {
        return res.status(404).json({ 
          error: 'Task not found',
          timestamp: new Date(),
          path: req.path,
        });
      }

      // Return 204 No Content on successful deletion
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to delete task',
        timestamp: new Date(),
        path: req.path,
      });
    }
  });

  return router;
}