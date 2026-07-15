import nodemailer from "nodemailer";

const createTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  console.log("📧 Cuenta de prueba creada:", testAccount.user);
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
};

export const enviarCorreoReset = async (destinatario, token) => {
  const transporter = await createTransporter();
  const resetLink = `https://horarios.gokulab.mx/reset-password?token=${token}`;

  const mailOptions = {
    from: '"Goku Lab" <sistema@gokulab.mx>',
    to: destinatario,
    subject: "Recuperación de contraseña - Goku Lab",
    html: `
      <h1>Recuperación de contraseña</h1>
      <p>Has solicitado restablecer tu contraseña en Goku Lab.</p>
      <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#0078D7;color:#fff;text-decoration:none;border-radius:5px;">Restablecer contraseña</a>
      <p>Este enlace expirará en 1 hora.</p>
      <p>Si no solicitaste este cambio, ignora este mensaje.</p>
      <p>Saludos,<br/>Equipo Goku Lab</p>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("📧 Correo enviado:", info.messageId);
  if (info.messageId.includes("ethereal")) {
    console.log("🔗 Vista previa:", nodemailer.getTestMessageUrl(info));
  }
  return info;
};