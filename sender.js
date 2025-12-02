import 'dotenv/config';
import logger from './lib/logger.js';
import nodemailer from 'nodemailer';
import mjml2html from 'mjml';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'node:path';
import crypto from 'node:crypto';
// import recipients from './sources/recipients.json' with { type: 'json' };

const recipients = JSON.parse(fs.readFileSync('./sources/recipients.json'));


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


/**
 * Get all MJML template files from the templates directory
 * @returns {Promise<Array<{filename: string, content: string}>>} - Array of template objects
 */
async function getAllMjmlTemplates() {
    const templatesDir = './templates';

    try {
        logger.info('Reading templates directory...');
        const files = await fsPromises.readdir(templatesDir);

        // Filter only .mjml files
        const mjmlFiles = files.filter(file => path.extname(file).toLowerCase() === '.mjml');

        logger.info(`Found ${mjmlFiles.length} MJML template(s): ${mjmlFiles.join(', ')}`);

        // Read all MJML files asynchronously
        const templates = await Promise.all(
            mjmlFiles.map(async (filename) => {
                const filePath = path.join(templatesDir, filename);
                logger.debug(`Reading template: ${filename}`);
                const content = await fsPromises.readFile(filePath, 'utf8');
                return { filename, content };
            })
        );

        return templates;
    } catch (err) {
        logger.error('Error reading templates directory:', err);
        throw err;
    }
}


/**
 * Send email template to a specific recipient
 * @param {string} recipient - Email address
 * @param {string} html - HTML content
 * @param {Array} attachments - Email attachments
 * @param {string} templateName - Name of the template being sent
 */
const sendEmailTemplate = async (recipient, html, attachments, templateName) => {
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.SENDER_FROM_NAME}" <${process.env.SENDER_FROM_EMAIL}>`,
            to: recipient,
            subject: `Test email template - ${templateName}`,
            html: html,
            attachments: attachments
        });

        logger.info(`Email sent to ${recipient} (template: ${templateName}): ${info.messageId}`);

    } catch (err) {
        logger.error(`Error sending mail to ${recipient} (template: ${templateName}):`, err);
    }
};


/**
 * Process all MJML templates and send emails to all recipients
 */
const sendAllEmails = async () => {
    try {
        logger.info('Starting email sending process...');

        // Get all MJML templates
        const templates = await getAllMjmlTemplates();

        if (templates.length === 0) {
            logger.warn('No MJML templates found in templates directory');
            return;
        }

        // Process each template
        for (const template of templates) {
            logger.info(`Processing template: ${template.filename}`);

            // Convert MJML to HTML and prepare attachments
            const { html: finalHtmlContent, attachments: finalAttachments } = prepareEmailContent(
                template.content,
                './templates'
            );

            logger.debug(`Template ${template.filename} converted to HTML successfully`);

            // Send email to all recipients asynchronously (non-blocking)
            const emailPromises = recipients.recipients.map(recipient => {
                logger.trace(`Queueing email for ${recipient} with template ${template.filename}`);
                return sendEmailTemplate(recipient, finalHtmlContent, finalAttachments, template.filename);
            });

            // Wait for all emails for this template to be sent
            await Promise.all(emailPromises);

            logger.info(`All emails sent for template: ${template.filename}`);
        }

        logger.info('All email templates processed and sent successfully');

    } catch (err) {
        logger.error('Error in sendAllEmails:', err);
        throw err;
    }
};


sendAllEmails();