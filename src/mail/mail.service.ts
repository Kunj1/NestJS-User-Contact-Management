import { Injectable, Logger } from '@nestjs/common';
import * as formData from 'form-data';
import Mailgun from 'mailgun.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private mailgun;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const mailgun = new Mailgun(formData);
    this.mailgun = mailgun.client({
      username: 'api',
      key: this.configService.get<string>('MAILGUN_API_KEY'),
      url: 'https://api.mailgun.net',
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationLink = `${this.configService.get<string>('APP_URL')}/user/verify?token=${token}`;

    const data = {
      from: `YourApp <mailgun@${this.configService.get<string>('MAILGUN_DOMAIN')}>`,
      to: email,
      subject: 'Please verify your email address',
      text: `Please click on the following link to verify your email: ${verificationLink}`,
    };

    try {
      const result = await this.mailgun.messages.create(this.configService.get<string>('MAILGUN_DOMAIN'), data);
      this.logger.log(`Email sent to ${email}: ${result.id}`);
    } catch (error) {
      this.logger.error(`Error sending email to ${email}: ${error.message}`);
      throw new Error('Failed to send verification email');
    }
  }
}