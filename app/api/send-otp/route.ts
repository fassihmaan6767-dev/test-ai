import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const ADMIN_EMAIL = 'talkwithfasih@gmail.com';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    // CYBERSECURITY ENFORCEMENT: Only allow the authorized admin email
    if (email.toLowerCase() !== ADMIN_EMAIL) {
      console.warn(`SECURITY ALERT: Unauthorized login attempt with email: ${email}`);
      return NextResponse.json(
        { error: 'Unauthorized Access. This incident has been logged.' }, 
        { status: 403 }
      );
    }

    if (!process.env.GMAIL_APP_PASSWORD) {
       return NextResponse.json({ error: 'Mail server configuration is missing.' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: ADMIN_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Maison AI Admin" <${ADMIN_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: 'Admin Dashboard - 6-Digit Verification Code',
      text: `Your admin verification code is: ${otp}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2d5c3; border-radius: 12px; background: #faf7f2; color: #1A1A1A;">
          <h2 style="margin-top: 0; color: #4A3E33; font-weight: normal;">Admin Verification</h2>
          <p>Your 6-digit OTP code to access the Maison AI Admin Panel is:</p>
          <h1 style="font-size: 32px; letter-spacing: 6px; color: #1A1A1A; background: #ebe1d3; padding: 12px 24px; border-radius: 8px; text-align: center; width: max-content; margin: 24px auto;">${otp}</h1>
          <p style="font-size: 12px; color: #6B5E52; border-top: 1px solid #e2d5c3; padding-top: 12px; margin-top: 32px;">This code is valid for your current login session. Do not share this code with anyone.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Nodemailer Error:', error);
    return NextResponse.json({ error: 'Failed to send OTP.' }, { status: 500 });
  }
}

