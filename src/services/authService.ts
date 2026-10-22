import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import * as userRepository from "../repositories/userRepository";
import type { LoginInput, RegisterInput } from "../schemas/authSchema";
import type { User } from "../generated/prisma/client";

export type PublicUser = Omit<User, "password">;

function toPublicUser(user: User): PublicUser {
  const { password, ...rest } = user;
  void password;
  return rest;
}

export async function register(input: RegisterInput): Promise<PublicUser> {
  const existing = await userRepository.findByEmail(input.email);

  if (existing) {
    throw new AppError(409, "CONFLICT", "El email ya esta registrado");
  }

  const password = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await userRepository.create({ email: input.email, password });

  return toPublicUser(user);
}

export async function login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
  const user = await userRepository.findByEmail(input.email);

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Credenciales invalidas");
  }

  const matches = await bcrypt.compare(input.password, user.password);

  if (!matches) {
    throw new AppError(401, "UNAUTHORIZED", "Credenciales invalidas");
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return { user: toPublicUser(user), token };
}
