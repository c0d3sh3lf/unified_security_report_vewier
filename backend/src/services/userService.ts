import bcrypt from 'bcryptjs';
import { AppError } from '../errors/AppError.js';
import { UserRepository } from '../repositories/UserRepository.js';
export class UserService {
  constructor(private readonly users: UserRepository) {}
  list() { return this.users.list(); }
  async create(data: { name: string; email: string; password: string; role: 'admin' | 'user' }) {
    if (await this.users.findByEmail(data.email)) throw new AppError(409, 'An account already uses this email address');
    return this.users.create({ name: data.name, email: data.email.toLowerCase(), passwordHash: await bcrypt.hash(data.password, 12), role: data.role });
  }
}
