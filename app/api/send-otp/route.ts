import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const ADMIN_EMAIL = 'talkwithfasih@gmail.com';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    // CYBERSECURITY ENFORCEMENT: Strictly only allow the authorized admin email
    if (email?.toLowerCase() !== ADMIN_EMAIL) {
      console.warn(`SECURITY ALERT: Unauthorized login attempt with email: ${email}`);
      return NextResponse.json(
        { error: 'Unauthorized Access. This incident has been logged.' }, 
        { status: 403 }
      );
    }

    if (!otp) {
      return NextResponse.json({ error: 'OTP code is missing.' }, { status: 400 });
    }

    let emailSent = false;
    let lastErrorMessage = '';

    // STRATEGY 1: Direct FormSubmit.co API (Sends real email to inbox without requiring password)
    try {
      const origin = req.headers.get('origin') || 'https://ais-dev-4fvvvjeq5orwggkfrnjjwf-55827531331.asia-southeast1.run.app';
      const response = await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': origin,
          'Referer': `${origin}/`
        },
        body: JSON.stringify({
          _subject: `Maison AI Admin Verification Code: ${otp}`,
          _template: 'box',
          _captcha: 'false',
          'Verification Code': otp,
          'Your OTP Is': `Your 6-Digit OTP Code is: ${otp}`,
          'Security Notice': 'Enter this OTP in your Maison AI Admin verification portal to login. Valid for this session.',
          message: `Hello Fasih,\n\nYour Admin verification OTP code is: ${otp}\n\nPlease enter this 6-digit code on the Maison AI Admin verification screen to access your dashboard.`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success === 'false' && data.message?.includes('Activation')) {
          return NextResponse.json({ error: 'ACTION REQUIRED: FormSubmit sent an "Activate Form" link to your email. Please check your inbox, click the Activate link, and then try again.' }, { status: 400 });
        }
        emailSent = true;
      } else {
        const text = await response.text();
        console.warn('FormSubmit response non-ok:', text);
      }
    } catch (fsErr: any) {
      console.warn('FormSubmit failed, trying SMTP if available:', fsErr?.message);
      lastErrorMessage = fsErr?.message;
    }

    // STRATEGY 2: Nodemailer (if GMAIL_APP_PASSWORD is provided in environment)
    if (!emailSent && process.env.GMAIL_APP_PASSWORD) {
      try {
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
          subject: `Admin Verification Code: ${otp}`,
          text: `Your Maison AI Admin verification code is: ${otp}`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2d5c3; border-radius: 12px; background: #faf7f2; color: #1A1A1A;">
              <h2 style="margin-top: 0; color: #4A3E33; font-weight: normal;">Admin Verification</h2>
              <p>Your 6-digit OTP code to access the Maison AI Admin Panel is:</p>
              <h1 style="font-size: 34px; letter-spacing: 6px; color: #1A1A1A; background: #ebe1d3; padding: 14px 24px; border-radius: 8px; text-align: center; width: max-content; margin: 24px auto;">${otp}</h1>
              <p style="font-size: 12px; color: #6B5E52; border-top: 1px solid #e2d5c3; padding-top: 12px; margin-top: 32px;">This code is valid for your current login session. Do not share this code with anyone.</p>
            </div>
          `,
        });

        emailSent = true;
      } catch (smtpErr: any) {
        console.error('Nodemailer Error:', smtpErr);
        lastErrorMessage = smtpErr?.message;
      }
    }

    if (emailSent) {
      return NextResponse.json({ success: true, message: `OTP sent to ${ADMIN_EMAIL}` });
    }

    return NextResponse.json({ 
      error: lastErrorMessage || 'Unable to deliver OTP email. Please try again.' 
    }, { status: 500 });

  } catch (error: any) {
    console.error('Send OTP Error:', error);
    return NextResponse.json({ error: 'Failed to process OTP request.' }, { status: 500 });
  }
}


