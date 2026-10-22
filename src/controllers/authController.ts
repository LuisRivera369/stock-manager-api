import type { CookieOptions, Request, Response } from "express";

import { env } from "../config/env";
import * as authService from "../services/authService";
import type { LoginInput, RegisterInput } from "../schemas/authSchema";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export async function register(
  req: Request<Record<string, never>, unknown, RegisterInput>,
  res: Response,
): Promise<void> {
  const user = await authService.register(req.body);

  res.status(201).json({ data: user });
}

export async function login(
  req: Request<Record<string, never>, unknown, LoginInput>,
  res: Response,
): Promise<void> {
  const { user, token } = await authService.login(req.body);

  res.cookie("token", token, {
    ...cookieOptions,
    maxAge: env.JWT_EXPIRES_IN * 1000,
  });

  res.status(200).json({ data: user });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie("token", cookieOptions);
  res.status(204).send();
}
