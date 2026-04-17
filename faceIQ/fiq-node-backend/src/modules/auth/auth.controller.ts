import { Request, Response, NextFunction } from 'express';
import { authService, loginSchema, setupSchema } from './auth.service.js';
import { logger } from '../../utils/logger.js';

export async function setup(req: Request, res: Response, next: NextFunction) {
    try {
        const validated = setupSchema.parse(req.body);
        const result = await authService.createFirstUser(validated);
        res.json(result);
    } catch (error: any) {
        if (error.message === 'Setup already completed') {
            res.status(403).json({ error: 'Setup already completed' });
            return;
        }
        next(error);
    }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const validated = loginSchema.parse(req.body);
        const result = await authService.login(validated);
        res.json(result);
    } catch (error: any) {
        if (error.message === 'Invalid credentials') {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        next(error);
    }
}

export async function checkSetup(req: Request, res: Response, next: NextFunction) {
    try {
        const hasUsers = await authService.hasUsers();
        res.json({ setupRequired: !hasUsers });
    } catch (error) {
        next(error);
    }
}
