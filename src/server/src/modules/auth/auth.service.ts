import crypto from "crypto";
import AppError from "@/shared/errors/AppError";
import sendEmail from "@/shared/utils/sendEmail";
import passwordResetTemplate from "@/shared/templates/passwordReset";
import { tokenUtils, passwordUtils } from "@/shared/utils/authUtils";
import { AuthResponse, RegisterUserParams, SignInParams } from "./auth.types";
import { ROLE } from "@prisma/client";
import logger from "@/infra/winston/logger";
import jwt from "jsonwebtoken";
import { AuthRepository } from "./auth.repository";
import BadRequestError from "@/shared/errors/BadRequestError";
import NotFoundError from "@/shared/errors/NotFoundError";
import { hashPassword } from "@/shared/utils/auth/passwordUtils";
import { generateOTP } from "@/shared/utils/auth/generateOtpUtils";
import emailVerificationTemplate from "@/shared/templates/emailVerification";
import twilioClient from "@/shared/utils/sms.service";

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async sendPhoneOtp(phone: string) {
    try {
      const verification = await twilioClient.verify
        .v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
        .verifications.create({
          to: phone,
          channel: "sms",
        });

      return verification.sid;

    } catch (error) {
      console.log("TWILIO ERROR:", error);  
      throw new AppError(500, "Failed to send OTP");
    }
  }
  
  // async sendOtp(email: string) {
  //   const otp = generateOTP();

  //   const verificationToken = jwt.sign(
  //     { email, otp, purpose: "EMAIL_VERIFICATION" },
  //     process.env.JWT_SECRET as string,
  //     { expiresIn: "5m" }
  //   );
  //   try {
  //   await sendEmail({
  //     to: email,
  //     subject: "Zeelcut Email Verification",
  //     text: `Your OTP is ${otp}`,
  //     html: emailVerificationTemplate(otp),
  //   });
  //   } catch (error) {
  //     logger.error("OTP email failed", error);

  //     throw new AppError(
  //       500,
  //       "Failed to send OTP email. Please try again."
  //     );
  //   }
  //   return verificationToken;
  // }

  async registerUser({
    name,
    email,
    phone,
    password,
    role, otp 
  }: RegisterUserParams): Promise<AuthResponse> {
    const existingUser = await this.authRepository.findUserByPhone(phone);

    if (existingUser) {
      throw new AppError(
        400,
        "This phone number is already registered, please log in instead."
      );
    }
    // let decoded: any;
    
    // try {
    //   decoded = jwt.verify(
    //     verificationToken,
    //     process.env.JWT_SECRET as string
    //   );
    // } catch (error) {
    //   throw new AppError(400, "Email not verified");
    // }

    // if (decoded.purpose !== "EMAIL_VERIFICATION") {
    //   throw new AppError(400, "Invalid verification token");
    // }
    // if (decoded.email !== email) {
    //   throw new AppError(400, "Email verification failed");
    // }
    // if (String(decoded.otp) !== String(otp)) {
    //   throw new AppError(400, "Invalid OTP");
    // }

    const verificationCheck = await twilioClient.verify
      .v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({
        to: phone,
        code: otp,
      });

    if (verificationCheck.status !== "approved") {
      throw new AppError(400, "Invalid or expired OTP");
    }
    
    const hashedPassword = await hashPassword(password);
    // Force new registrations to be USER role only for security
    const newUser = await this.authRepository.createUser({
      email,
      phone,
      name,
      password: hashedPassword,
      role: ROLE.USER, // Ignore any role passed from client for security
    });

    const accessToken = tokenUtils.generateAccessToken(newUser.id);
    const refreshToken = tokenUtils.generateRefreshToken(newUser.id);

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        avatar: null,
      },
      accessToken,
      refreshToken,
    };
  }

  async signin({ phone, password }: SignInParams): Promise<{
    user: {
      id: string;
      role: ROLE;
      name: string;
      email: string | null;
      phone: string;
      avatar: string | null;
    };
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.authRepository.findUserByPhoneWithPassword(phone);

    if (!user) {
      throw new BadRequestError("User not exist");
    }

    if (!user.password) {
      throw new AppError(400, "Phone number or password is incorrect.");
    }
    const isPasswordValid = await passwordUtils.comparePassword(
      password,
      user.password
    );
    if (!isPasswordValid) {
      throw new AppError(400, "Your password is incorrect.");
    }

    const accessToken = tokenUtils.generateAccessToken(user.id);
    const refreshToken = tokenUtils.generateRefreshToken(user.id);

    return { accessToken, refreshToken, user };
  }

  async signout(): Promise<{ message: string }> {
    return { message: "User logged out successfully" };
  }

  async forgotPassword(phone: string): Promise<{ message: string }> {
    const user = await this.authRepository.findUserByPhone(phone);

    if (!user) {
      throw new NotFoundError("Phone");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await this.authRepository.updateUserPasswordReset(phone, {
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const resetUrl = `${process.env.CLIENT_URL}/password-reset/${resetToken}`;
    const htmlTemplate = passwordResetTemplate(resetUrl);

    // await sendEmail({
    //   to: user.email,
    //   subject: "Reset your password",
    //   html: htmlTemplate,
    //   text: "Reset your password",
    // });

    return { message: "Password reset phone sent successfully" };
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await this.authRepository.findUserByResetToken(hashedToken);

    if (!user) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    await this.authRepository.updateUserPassword(user.id, newPassword);

    return { message: "Password reset successful. You can now log in." };
  }

  async refreshToken(oldRefreshToken: string): Promise<{
    user: {
      id: string;
      name: string;
      email: string | null;
      phone: string;
      role: string;
      avatar: string | null;
    };
    newAccessToken: string;
    newRefreshToken: string;
  }> {
    if (await tokenUtils.isTokenBlacklisted(oldRefreshToken)) {
      throw new NotFoundError("Refresh token");
    }

    const decoded = jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as { id: string; absExp: number };

    const absoluteExpiration = decoded.absExp;
    const now = Math.floor(Date.now() / 1000);
    if (now > absoluteExpiration) {
      throw new AppError(401, "Session expired. Please log in again.");
    }

    const user = await this.authRepository.findUserById(decoded.id);
    console.log("refreshed user: ", user);

    if (!user) {
      throw new NotFoundError("User");
    }

    const newAccessToken = tokenUtils.generateAccessToken(user.id);
    const newRefreshToken = tokenUtils.generateRefreshToken(
      user.id,
      absoluteExpiration
    );

    const oldTokenTTL = absoluteExpiration - now;
    if (oldTokenTTL > 0) {
      await tokenUtils.blacklistToken(oldRefreshToken, oldTokenTTL);
    } else {
      logger.warn("Refresh token is already expired. No need to blacklist.");
    }

    return { user, newAccessToken, newRefreshToken };
  }
}
