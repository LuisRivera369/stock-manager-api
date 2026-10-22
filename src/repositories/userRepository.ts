import type { Role, User } from "../generated/prisma/client";
import { prisma } from "../config/database";

export type CreateUserData = {
  email: string;
  password: string;
  role?: Role;
};

export function findByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function create(data: CreateUserData): Promise<User> {
  return prisma.user.create({ data });
}
