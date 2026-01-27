import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";
import { UserRole } from "./user-role.enum";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  async createUser(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const user = this.userRepo.create({
      email: normalizedEmail,
      password,
      role: UserRole.User,
    });

    return this.userRepo.save(user);
  }

  async softDeleteById(id: string) {
    await this.userRepo.softDelete(id);
  }
}
