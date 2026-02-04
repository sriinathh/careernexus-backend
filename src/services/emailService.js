// backend/src/services/emailService.js
import nodemailer from "nodemailer";

function createTransporter() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) {
    throw new Error('Email credentials not configured. Please check EMAIL_USER and EMAIL_PASS in .env');
  }

  // nodemailer v6/v7 may expose functions differently depending on module system.
  // Normalize the import to obtain the transport creation function.
  const nm = nodemailer && nodemailer.default ? nodemailer.default : nodemailer;
  const createFn = nm.createTransport || nm.createTransporter;
  if (typeof createFn !== 'function') {
    throw new Error('nodemailer transport creation function not found');
  }

  return createFn.call(nm, {
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
  });
}

export async function sendOtpEmail(to, otp, type = 'verification') {
  try {
    const transporter = createTransporter();
    
    const subject = type === 'reset' 
      ? "Reset Your Password - CareerNexus AI" 
      : "Verify Your Email - CareerNexus AI";
    
    const title = type === 'reset' 
      ? "Password Reset" 
      : "Email Verification";
    
    const message = type === 'reset'
      ? "You requested a password reset. Use the OTP below to reset your password."
      : "Thank you for registering! Use the OTP below to verify your email address.";
    
    const mailOptions = {
      from: `"CareerNexus AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 10px;">
        <div style="background: white; border-radius: 8px; padding: 30px; text-align: center;">
          <h1 style="color: #667eea; margin-bottom: 20px;">CareerNexus AI</h1>
          <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
            ${message}
          </p>
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 30px 0;">
            ${otp}
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This OTP is valid for <strong>15 minutes</strong>.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
}
