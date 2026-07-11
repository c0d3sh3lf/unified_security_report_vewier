import { User, type IUser } from '../models/User.js';

export class UserRepository {
  findByEmail(email: string) { return User.findOne({ email: email.toLowerCase() }).select('+passwordHash'); }
  findById(id: string) { return User.findById(id); }
  list() { return User.find().sort({ createdAt: -1 }); }
  create(data: Pick<IUser, 'name' | 'email' | 'passwordHash' | 'role'>) { return User.create(data); }
  update(id: string, data: Partial<Pick<IUser, 'name' | 'email' | 'passwordHash'>>) { return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }); }
}
