import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!process.env.GMAIL_APP_PASSWORD) {
       console.log('No GMAIL_APP_PASSWORD found. Emulated success. OTP:', otp);
       return NextResponse.json({ error: 'GMAIL_APP_PASSWORD is not set in Vercel Environment Variables. Please add it to send emails.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'talkwithfasih@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: '"Maison AI Admin" <talkwithfasih@gmail.com>',
      to: email,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
