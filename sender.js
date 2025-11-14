import 'dotenv/config';
import logger from './lib/logger.js';
import nodemailer from 'nodemailer';
import mjml2html from 'mjml';
import fs from 'fs';
import path from 'node:path';
import crypto from 'node:crypto';
// import recipients from './sources/recipients.json' with { type: 'json' };

const recipients = JSON.parse(fs.readFileSync('./sources/recipients.json'));
const mjmlTemplate = fs.readFileSync('./templates/fiat_1-3.mjml', 'utf8');


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // Use 587 port with STARTTLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});


/**
 * Prepare the HTML content and the attachments array for Nodemailer.
 * @param {string} mjmlSource - MJML source code.
 * @param {string} imageBaseDir - La directory base in cui risiedono le immagini (es. './').
 * @returns {{html: string, attachments: Array}} - Modified HTML and the attachments.
 */
function prepareEmailContent(mjmlSource, imageBaseDir) {
    // 1. Converti MJML in HTML
    let { html } = mjml2html(mjmlSource);
    
    const attachments = [];
    
    // Usiamo il parametro fornito per la directory base
    const baseDir = path.resolve(imageBaseDir); 

    // Espressione regolare per trovare tutti i riferimenti a file immagine locali (src=".../file.png")
    const imgRegex = /src=["'](.+?\.(jpg|jpeg|png|gif|svg))["']/gi;
    
    const processedFiles = new Map();

    html = html.replace(imgRegex, (match, filePath) => {
        // Se l'immagine è già stata elaborata, usa il CID esistente
        if (processedFiles.has(filePath)) {
            return `src="cid:${processedFiles.get(filePath)}"`;
        }

        // 2. Genera un Content-ID unico
        const cid = crypto.createHash('md5').update(filePath).digest('hex'); 
        
        // 3. Calcola il percorso assoluto usando la directory base
        const absolutePath = path.join(baseDir, filePath);
        
        attachments.push({
            cid: cid,
            path: absolutePath
        });

        // Tieni traccia del file processato
        processedFiles.set(filePath, cid);

        // 4. Sostituisci il percorso file con il Content-ID nell'HTML
        return `src="cid:${cid}"`;
    });

    return { html, attachments };
}


// const htmlOutput = mjml2html(mjmlTemplate);
// const { htmlOutput, attachments } = prepareEmailContent(mjmlTemplate, './templates');
const { html: finalHtmlContent, attachments: finalAttachments } = prepareEmailContent(
    mjmlTemplate, 
    './templates'
);


const sendEmailTemplate = async (recipient) => {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.SENDER_FROM_NAME}" <${process.env.SENDER_FROM_EMAIL}>`,
        to: recipient,
        subject: `Test email template`,
        // text: `Hi,\n\n
        //  This is a test email.\n\n
        //  Thank you.\n
        //  Daniele`,
        html: finalHtmlContent,
        attachments: finalAttachments
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