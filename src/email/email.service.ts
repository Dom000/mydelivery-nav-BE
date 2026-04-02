import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import prisma from '../prisma/client';
import logger from '../utils/logger';
import { orderCreatedTemplate } from './template/order-created.email';
import { orderInTransitTemplate } from './template/order-intransit.email';
import { orderInterruptedTemplate } from './template/order-interupted.email';
import { orderDeliveredTemplate } from './template/order-delivered.email';
import { Resend } from 'resend';

type DeliveryEmailStatus =
  | 'PENDING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'OBSTRUCTED'
  | 'CANCELLED';

type OrderStatusEmailPayload = {
  status: DeliveryEmailStatus;
  orderId: string;
  customerEmail: string;
  customerName?: string;
  destination: string;
  currentLocation?: string;
  deliveredAt?: string;
  recipientName?: string;
  reason?: string;
  items?: {
    name: string;
    quantity: number;
    imageurls?: string[];
  }[];
};

@Injectable()
export class EmailService {
  private resendClient: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'RESEND_API_KEY is not configured',
      );
    }

    this.resendClient = new Resend(apiKey);
  }

  private getFromAddress() {
    const domain = process.env.RESEND_DOMAIN?.trim();
    if (domain) {
      return `MyDelivery <no-reply@${domain}>`;
    }

    return 'MyDelivery <no-reply@mydeliverynav.com>';
  }

  private getReplyToAddress() {
    const domain = process.env.RESEND_DOMAIN?.trim();
    if (domain) {
      return `no-reply@${domain}`;
    }

    return 'no-reply@resend.dev';
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }) {
    const result = await this.resendClient.emails.send({
      from: this.getFromAddress(),
      reply_to: this.getReplyToAddress(),
      to: [params.to],
      subject: params.subject,
      html: params.html,
    } as any);

    if ((result as any)?.error) {
      throw new InternalServerErrorException(
        `Resend error: ${(result as any).error.message || 'Failed to send email'}`,
      );
    }

    return (result as any)?.data?.id as string | undefined;
  }

  async sendOrderStatusEmail(payload: OrderStatusEmailPayload) {
    if (!payload.customerEmail || typeof payload.customerEmail !== 'string') {
      throw new BadRequestException('customerEmail is required');
    }

    const customerName =
      payload.customerName?.trim() || payload.customerEmail.split('@')[0];

    let subject = 'Order Update';
    let html = '';

    if (payload.status === 'PENDING') {
      subject = `Order Created - #${payload.orderId}`;
      html = orderCreatedTemplate({
        orderId: payload.orderId,
        customerName,
        customerEmail: payload.customerEmail,
        destination: payload.destination,
        items:
          payload.items && payload.items.length > 0
            ? payload.items
            : [
                {
                  name: `Order #${payload.orderId}`,
                  quantity: 1,
                },
              ],
      });
    } else if (payload.status === 'IN_TRANSIT') {
      subject = `Order In Transit - #${payload.orderId}`;
      html = orderInTransitTemplate({
        orderId: payload.orderId,
        customerName,
        customerEmail: payload.customerEmail,
        currentLocation: payload.currentLocation || 'Dispatch Hub',
        destination: payload.destination,
        trackingCode: payload.orderId,
      });
    } else if (payload.status === 'DELIVERED') {
      subject = `Order Delivered - #${payload.orderId}`;
      html = orderDeliveredTemplate({
        orderId: payload.orderId,
        customerName,
        customerEmail: payload.customerEmail,
        deliveredAt: payload.deliveredAt || new Date().toISOString(),
        deliveredLocation: payload.destination,
        destination: payload.destination,
        recipientName: payload.recipientName || customerName,
        trackingCode: payload.orderId,
      });
    } else {
      subject = `Order Update - #${payload.orderId}`;
      html = orderInterruptedTemplate({
        orderId: payload.orderId,
        customerName,
        customerEmail: payload.customerEmail,
        currentLocation: payload.currentLocation || 'Transit Route',
        destination: payload.destination,
        reason:
          payload.reason ||
          (payload.status === 'CANCELLED'
            ? 'This shipment was cancelled. Contact support if this was unexpected.'
            : 'Unexpected logistics constraints affected your shipment progress.'),
        trackingCode: payload.orderId,
      });
    }

    try {
      const messageId = await this.sendEmail({
        to: payload.customerEmail,
        subject,
        html,
      });

      logger.info('Order status email sent', {
        orderId: payload.orderId,
        status: payload.status,
        to: payload.customerEmail,
        messageId,
      });
      return { ok: true };
    } catch (error) {
      logger.error('Failed to send order status email', {
        orderId: payload.orderId,
        status: payload.status,
        to: payload.customerEmail,
        error: (error as Error)?.message,
      });
      throw new InternalServerErrorException(
        'Failed to send order status email',
      );
    }
  }

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

    try {
      const messageId = await this.sendEmail({
        to: email,
        subject: 'Your MyDelivery OTP',
        html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
      });
      logger.info('OTP email sent', { to: email, messageId });
    } catch (err) {
      throw new InternalServerErrorException('Failed to send OTP email');
    }

    return { ok: true, sentTo: email };
  }
}
