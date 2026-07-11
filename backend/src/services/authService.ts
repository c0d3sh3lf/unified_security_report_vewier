import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { AppError } from '../errors/AppError.js';
import { UserRepository } from '../repositories/UserRepository.js';
import type { IUser } from '../models/User.js';

type SafeUser = Pick<IUser, 'name' | 'email' | 'role' | 'active'> & { id: string };
export class AuthService {
  constructor(private readonly users: UserRepository) {}
  private sign(user: { _id: unknown; role: string }) { return jwt.sign({ sub: String(user._id), role: user.role }, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'] }); }
  private serialize(user: { _id: unknown; name: string; email: string; role: string; active: boolean }): SafeUser { return { id: String(user._id), name: user.name, email: user.email, role: user.role as SafeUser['role'], active: user.active }; }
  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'Invalid email or password');
    return { token: this.sign(user), user: this.serialize(user) };
  }
  async bootstrap() {
    const existing = await this.users.findByEmail(config.bootstrap.email);
    if (!existing) await this.users.create({ name: config.bootstrap.name, email: config.bootstrap.email, passwordHash: await bcrypt.hash(config.bootstrap.password, 12), role: 'admin' });
  }
  async updateProfile(id: string, data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    const user = await this.users.findByEmail((await this.users.findById(id))?.email ?? '');
    if (!user) throw new AppError(404, 'User not found');
    if (data.newPassword) {
      if (!data.currentPassword || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) throw new AppError(400, 'Current password is incorrect');
    }
    if (data.email && data.email !== user.email) {
      const duplicate = await this.users.findByEmail(data.email);
      if (duplicate) throw new AppError(409, 'An account already uses this email address');
    }
    const updated = await this.users.update(id, { ...(data.name ? { name: data.name } : {}), ...(data.email ? { email: data.email.toLowerCase() } : {}), ...(data.newPassword ? { passwordHash: await bcrypt.hash(data.newPassword, 12) } : {}) });
    if (!updated) throw new AppError(404, 'User not found');
    return this.serialize(updated);
  }
}
