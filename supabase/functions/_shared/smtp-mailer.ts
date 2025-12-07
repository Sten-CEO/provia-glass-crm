/**
 * SMTP Mailer Module
 *
 * Provides SMTP email sending functionality for Edge Functions
 * Supports Gmail, Outlook, OVH, IONOS, and any custom SMTP server
 *
 * Implementation using raw TCP/TLS connections for maximum compatibility
 */

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
 * Base64 encode a string
 */
function base64Encode(str: string): string {
  return btoa(str);
}

/**
 * Send a command to SMTP server and read response
 */
async function sendCommand(
  conn: Deno.Conn,
  command: string,
  expectedCode?: number
): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Send command
  await conn.write(encoder.encode(command + "\r\n"));

  // Read response
  const buffer = new Uint8Array(4096);
  const n = await conn.read(buffer);
  if (!n) {
    throw new Error("Connection closed by server");
  }

  const response = decoder.decode(buffer.subarray(0, n));
  console.log(`S: ${response.trim()}`);

  // Check response code if expected
  if (expectedCode) {
    const code = parseInt(response.substring(0, 3));
    if (code !== expectedCode) {
      throw new Error(`SMTP Error: Expected ${expectedCode}, got ${code}: ${response}`);
    }
  }

  return response;
}

/**
 * Read SMTP server response
 */
async function readResponse(conn: Deno.Conn, expectedCode?: number): Promise<string> {
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(4096);
  const n = await conn.read(buffer);

  if (!n) {
    throw new Error("Connection closed by server");
  }

  const response = decoder.decode(buffer.subarray(0, n));
  console.log(`S: ${response.trim()}`);

  if (expectedCode) {
    const code = parseInt(response.substring(0, 3));
    if (code !== expectedCode) {
      throw new Error(`SMTP Error: Expected ${expectedCode}, got ${code}: ${response}`);
    }
  }

  return response;
}

/**
 * Send email via SMTP using raw TCP/TLS connection
 */
export async function sendEmailViaSMTP(
  config: SmtpConfig,
  message: EmailMessage
): Promise<SendEmailResult> {
  let conn: Deno.Conn | null = null;

  try {
    console.log(`Connecting to ${config.host}:${config.port} (secure: ${config.secure})`);

    // Connect to SMTP server
    if (config.secure) {
      // SSL/TLS connection (port 465)
      conn = await Deno.connectTls({
        hostname: config.host,
        port: config.port,
      });
    } else {
      // Plain connection for STARTTLS (port 587)
      conn = await Deno.connect({
        hostname: config.host,
        port: config.port,
      });
    }

    // Read server greeting
    await readResponse(conn, 220);

    // Send EHLO
    await sendCommand(conn, `EHLO ${config.host}`, 250);

    // If not secure, upgrade to TLS via STARTTLS
    if (!config.secure) {
      await sendCommand(conn, "STARTTLS", 220);

      // Upgrade connection to TLS
      conn = await Deno.startTls(conn, { hostname: config.host });

      // Send EHLO again after STARTTLS
      await sendCommand(conn, `EHLO ${config.host}`, 250);
    }

    // Authenticate
    await sendCommand(conn, "AUTH LOGIN", 334);
    await sendCommand(conn, base64Encode(config.username), 334);
    await sendCommand(conn, base64Encode(config.password), 235);

    // Prepare recipients
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    // Send MAIL FROM
    await sendCommand(conn, `MAIL FROM:<${message.from}>`, 250);

    // Send RCPT TO for each recipient
    for (const recipient of recipients) {
      await sendCommand(conn, `RCPT TO:<${recipient}>`, 250);
    }

    // Start DATA
    await sendCommand(conn, "DATA", 354);

    // Build email content
    const boundary = `----=_Part_${Date.now()}`;
    let emailContent = "";

    // Headers
    emailContent += `From: ${message.from}\r\n`;
    emailContent += `To: ${recipients.join(", ")}\r\n`;
    if (message.replyTo) {
      emailContent += `Reply-To: ${message.replyTo}\r\n`;
    }
    emailContent += `Subject: ${message.subject}\r\n`;
    emailContent += `MIME-Version: 1.0\r\n`;

    if (message.attachments && message.attachments.length > 0) {
      // Multipart message with attachments
      emailContent += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
      emailContent += `\r\n`;

      // Body part
      emailContent += `--${boundary}\r\n`;
      if (message.html) {
        emailContent += `Content-Type: text/html; charset="UTF-8"\r\n`;
        emailContent += `Content-Transfer-Encoding: quoted-printable\r\n`;
        emailContent += `\r\n`;
        emailContent += message.html + `\r\n`;
      } else if (message.text) {
        emailContent += `Content-Type: text/plain; charset="UTF-8"\r\n`;
        emailContent += `Content-Transfer-Encoding: quoted-printable\r\n`;
        emailContent += `\r\n`;
        emailContent += message.text + `\r\n`;
      }

      // Attachments
      for (const attachment of message.attachments) {
        emailContent += `--${boundary}\r\n`;
        emailContent += `Content-Type: application/octet-stream; name="${attachment.filename}"\r\n`;
        emailContent += `Content-Transfer-Encoding: base64\r\n`;
        emailContent += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        emailContent += `\r\n`;

        // Convert Uint8Array to base64
        const base64Content = btoa(String.fromCharCode(...attachment.content));
        // Split into 76 character lines
        const lines = base64Content.match(/.{1,76}/g) || [];
        emailContent += lines.join('\r\n') + `\r\n`;
      }

      emailContent += `--${boundary}--\r\n`;
    } else {
      // Simple message without attachments
      if (message.html) {
        emailContent += `Content-Type: text/html; charset="UTF-8"\r\n`;
        emailContent += `\r\n`;
        emailContent += message.html + `\r\n`;
      } else if (message.text) {
        emailContent += `Content-Type: text/plain; charset="UTF-8"\r\n`;
        emailContent += `\r\n`;
        emailContent += message.text + `\r\n`;
      }
    }

    // End with CRLF.CRLF
    emailContent += `\r\n.\r\n`;

    // Send email content
    const encoder = new TextEncoder();
    await conn.write(encoder.encode(emailContent));

    // Read response after DATA
    await readResponse(conn, 250);

    // Send QUIT
    await sendCommand(conn, "QUIT", 221);

    // Close connection
    conn.close();

    console.log("Email sent successfully via SMTP");

    return {
      success: true,
      messageId: `smtp-${Date.now()}`,
    };

  } catch (error: any) {
    console.error("SMTP Error:", error);

    // Close connection if open
    if (conn) {
      try {
        conn.close();
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }

    // Parse error message
    let errorMessage = error.message || "Unknown SMTP error";

    if (errorMessage.includes("authentication") || errorMessage.includes("535")) {
      errorMessage = "Authentification SMTP échouée. Vérifiez votre nom d'utilisateur et mot de passe.";
    } else if (errorMessage.includes("Connection refused") || errorMessage.includes("ECONNREFUSED")) {
      errorMessage = "Impossible de se connecter au serveur SMTP. Vérifiez l'hôte et le port.";
    } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      errorMessage = "Délai d'attente dépassé lors de la connexion SMTP.";
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
