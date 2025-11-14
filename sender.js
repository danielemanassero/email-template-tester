import 'dotenv/config';
import logger from './lib/logger.js';
import nodemailer from 'nodemailer';
import recipients from './sources/recipients.json' with { type: 'json' };


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // Use 587 port with STARTTLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});


const sendEmailTemplate = async (recipient) => {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.SENDER_FROM_NAME}" <${process.env.SENDER_FROM_EMAIL}>`,
        to: recipient,
        subject: `Test email template`,
        text: `Hi,\n\n
          This is a test email.\n\n
          Thank you.\n
          Daniele`,
        html: `Hi,<br /><br />
          This is a test email.<br /><br />
          Thank you.<br />
          Daniele`,
      });

      logger.info(`Email sent to ${recipient}: ${info.messageId}`);

    } catch (err) {
      logger.error(`Error while sending mail to ${recipient}`, err);
    }
};


const sendAllEmails = async () => {
    const promises = recipients.recipients.map(recipient => {
        logger.trace(`Start process for ${recipient}`);
        return sendEmailTemplate(recipient);
    });
    await Promise.all(promises);
};


sendAllEmails();