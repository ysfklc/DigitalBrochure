import nodemailer from "nodemailer";
import crypto from "crypto";
import type { IStorage } from "./storage";

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  appUrl: string;
  isEnabled: boolean;
}

async function getEmailConfig(storage: IStorage): Promise<EmailConfig | null> {
  try {
    const config = await storage.getSystemConfig("email");
    if (config?.value) {
      return config.value as EmailConfig;
    }
  } catch (error) {
    console.error("Failed to get email config:", error);
  }
  return null;
}

function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

export function generateActivationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getActivationTokenExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export async function sendActivationEmail(
  email: string,
  firstName: string,
  activationToken: string,
  storage: IStorage
): Promise<boolean> {
  const config = await getEmailConfig(storage);
  
  if (!config || !config.isEnabled) {
    console.warn("Email not configured or disabled. Email not sent.");
    const fallbackUrl = process.env.APP_URL || "http://localhost:5000";
    console.log("Activation URL (for testing):", `${fallbackUrl}/verify-email?token=${activationToken}`);
    return true;
  }

  const activationUrl = `${config.appUrl}/verify-email?token=${activationToken}`;

  const mailOptions = {
    from: config.smtpFrom,
    to: email,
    subject: "Verify Your Email Address - eBrochure",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to eBrochure</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${firstName},</h2>
          <p>Thank you for registering with eBrochure. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>
          <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea; font-size: 14px;">${activationUrl}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #888; font-size: 12px;">This link will expire in 24 hours. If you didn't create an account with eBrochure, please ignore this email.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${firstName},

Thank you for registering with eBrochure. Please verify your email address by clicking the link below:

${activationUrl}

This link will expire in 24 hours.

If you didn't create an account with eBrochure, please ignore this email.
    `,
  };

  try {
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      console.warn("SMTP credentials not configured. Email not sent.");
      console.log("Activation URL (for testing):", activationUrl);
      return true;
    }

    const transporter = createTransporter(config);
    await transporter.sendMail(mailOptions);
    console.log(`Activation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send activation email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetToken: string,
  storage: IStorage
): Promise<boolean> {
  const config = await getEmailConfig(storage);
  
  if (!config || !config.isEnabled) {
    console.warn("Email not configured or disabled. Email not sent.");
    const fallbackUrl = process.env.APP_URL || "http://localhost:5000";
    console.log("Reset URL (for testing):", `${fallbackUrl}/reset-password?token=${resetToken}`);
    return true;
  }

  const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: config.smtpFrom,
    to: email,
    subject: "Reset Your Password - eBrochure",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">eBrochure</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${firstName},</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea; font-size: 14px;">${resetUrl}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #888; font-size: 12px;">This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${firstName},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.
    `,
  };

  try {
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      console.warn("SMTP credentials not configured. Email not sent.");
      console.log("Reset URL (for testing):", resetUrl);
      return true;
    }

    const transporter = createTransporter(config);
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}

export async function sendTestEmail(
  email: string,
  firstName: string,
  storage: IStorage
): Promise<boolean> {
  const config = await getEmailConfig(storage);
  
  if (!config || !config.isEnabled) {
    console.warn("Email not configured or disabled.");
    return false;
  }

  const mailOptions = {
    from: config.smtpFrom,
    to: email,
    subject: "Test Email - eBrochure",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">eBrochure</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${firstName},</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p style="color: #666;">If you received this email, your SMTP settings are configured correctly!</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #888; font-size: 12px;">This email was sent from eBrochure System Settings.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${firstName},

This is a test email to verify your email configuration is working correctly.

If you received this email, your SMTP settings are configured correctly!

This email was sent from eBrochure System Settings.
    `,
  };

  try {
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      console.warn("SMTP credentials not configured.");
      return false;
    }

    const transporter = createTransporter(config);
    await transporter.sendMail(mailOptions);
    console.log(`Test email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send test email:", error);
    return false;
  }
}
