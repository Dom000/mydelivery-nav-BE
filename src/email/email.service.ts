import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import prisma from '../prisma/client';

let resendClient: any = null;
try {
  // lazy require to avoid hard crash if package missing at static time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY || '');
} catch (e) {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize Resend client', e);
}

@Injectable()
export class EmailService {
  async sendOtpToEmail(email: string) {
    if (!email || typeof email !== 'string')
      throw new BadRequestException('email is required');

    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: 'user',
          permissions: [],
          name: email.split('@')[0],
        },
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otp: code, otpExpires: expires },
    });

    if (!resendClient) {
      throw new InternalServerErrorException('Resend client not configured');
    }

    try {
      const from =
        process.env.RESEND_FROM ||
        `MyDelivery <onboarding@${process.env.RESEND_DOMAIN || 'example.com'}>`;
      await resendClient.emails.send({
        from,
        to: [email],
        subject: 'Your MyDelivery OTP',
        html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
      } as any);
    } catch (err) {
      throw new InternalServerErrorException('Failed to send OTP email');
    }

    return { ok: true, sentTo: email };
  }
}
