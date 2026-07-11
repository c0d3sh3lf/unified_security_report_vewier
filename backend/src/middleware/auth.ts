import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { AppError } from '../errors/AppError.js';
import { UserRepository } from '../repositories/UserRepository.js';
const users = new UserRepository();
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) throw new AppError(401, 'Authentication token is required');
    const claims = jwt.verify(token, config.auth.jwtSecret);
    if (typeof claims === 'string' || !claims.sub) throw new AppError(401, 'Invalid authentication token');
    const user = await users.findById(claims.sub);
    if (!user || !user.active) throw new AppError(401, 'User is no longer active');
    req.user = { _id: user._id, name: user.name, email: user.email, role: user.role, active: user.active };
    next();
  } catch (error) { next(error instanceof AppError ? error : new AppError(401, 'Invalid or expired authentication token')); }
};
export const authorize = (...roles: Array<'admin' | 'user'>): RequestHandler => (req, _res, next) => req.user && roles.includes(req.user.role) ? next() : next(new AppError(403, 'You do not have permission to perform this action'));
