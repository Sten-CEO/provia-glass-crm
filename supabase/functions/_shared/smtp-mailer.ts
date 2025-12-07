/**
 * SMTP Mailer Module
 *
 * Provides SMTP email sending functionality for Edge Functions
 * Supports Gmail, Outlook, OVH, IONOS, and any custom SMTP server
 */

import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean; // true = SSL/TLS, false = STARTTLS
}

export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Uint8Array;
  }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via SMTP
 */
export async function sendEmailViaSMTP(
  config: SmtpConfig,
  message: EmailMessage
): Promise<SendEmailResult> {
  let client: SmtpClient | null = null;

  try {
    // Create SMTP client
    client = new SmtpClient();

    console.log(`Connecting to SMTP server: ${config.host}:${config.port}`);

    // Connect to SMTP server
    const connectConfig: any = {
      hostname: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    };

    // Set connection mode based on secure flag
    if (config.secure) {
      // SSL/TLS connection (port 465)
      connectConfig.tls = true;
    } else {
      // STARTTLS connection (port 587)
      connectConfig.tls = false;
    }

    await client.connect(connectConfig);
    console.log('SMTP connection established');

    // Prepare recipients
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    // Prepare email content
    const emailContent: any = {
      from: message.from,
      to: recipients.join(', '),
      subject: message.subject,
    };

    // Add reply-to if specified
    if (message.replyTo) {
      emailContent.replyTo = message.replyTo;
    }

    // Add content (HTML or text)
    if (message.html) {
      emailContent.content = message.html;
      emailContent.mimeType = 'text/html';
    } else if (message.text) {
      emailContent.content = message.text;
      emailContent.mimeType = 'text/plain';
    }

    // Handle attachments
    if (message.attachments && message.attachments.length > 0) {
      // Convert attachments to base64 for SMTP
      const attachmentsList = message.attachments.map((att) => ({
        filename: att.filename,
        content: btoa(String.fromCharCode(...att.content)),
        encoding: 'base64',
      }));

      emailContent.attachments = attachmentsList;
    }

    // Send email
    console.log(`Sending email to: ${recipients.join(', ')}`);
    await client.send(emailContent);
    console.log('Email sent successfully via SMTP');

    // Close connection
    await client.close();

    return {
      success: true,
      messageId: `smtp-${Date.now()}`,
    };
  } catch (error: any) {
    console.error('SMTP Error:', error);

    // Close connection if open
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing SMTP connection:', closeError);
      }
    }

    // Parse common SMTP errors
    let errorMessage = error.message || 'Unknown SMTP error';

    if (errorMessage.includes('authentication')) {
      errorMessage = 'Authentification SMTP échouée. Vérifiez votre nom d\'utilisateur et mot de passe.';
    } else if (errorMessage.includes('connection')) {
      errorMessage = 'Impossible de se connecter au serveur SMTP. Vérifiez l\'hôte et le port.';
    } else if (errorMessage.includes('timeout')) {
      errorMessage = 'Délai d\'attente dépassé lors de la connexion SMTP.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Test SMTP configuration by sending a test email
 */
export async function testSmtpConfiguration(
  config: SmtpConfig
): Promise<SendEmailResult> {
  return sendEmailViaSMTP(config, {
    from: config.username,
    to: config.username,
    subject: 'Test SMTP – Provia BASE',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4A90E2;">✓ Configuration SMTP réussie</h2>
        <p>Votre configuration SMTP fonctionne correctement.</p>
        <p>Vous pouvez maintenant envoyer vos devis et factures depuis votre propre adresse email.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">
          Serveur: ${config.host}:${config.port}<br>
          Email: ${config.username}<br>
          Sécurité: ${config.secure ? 'SSL/TLS' : 'STARTTLS'}
        </p>
      </div>
    `,
    text: 'Votre configuration SMTP fonctionne correctement.',
  });
}
