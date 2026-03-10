import { ROLE } from "@prisma/client";

export interface RegisterUserParams {
  name: string;
  email?: string;
  phone: string;
  password: string;
  role?: ROLE;
  otp: string;
}

export interface SignInParams {
  phone: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    role: ROLE;
    avatar: string | null;
  };
  accessToken: string;
  refreshToken: string;
}
