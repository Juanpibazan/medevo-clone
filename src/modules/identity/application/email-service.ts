export interface EmailService {
  sendPasswordReset(input: {
    recipient: string;
    resetUrl: string;
  }): Promise<void>;
  sendVerificationEmail(input: {
    recipient: string;
    verificationUrl: string;
    locale: "pt-BR" | "es";
  }): Promise<void>;
}

export class DisabledEmailService implements EmailService {
  async sendPasswordReset(): Promise<void> {
    return Promise.resolve();
  }
  async sendVerificationEmail(): Promise<void> {
    return Promise.resolve();
  }
}

export class ResendEmailService implements EmailService {
  private sentCount = 0;

  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
  ) { }

  async sendPasswordReset(): Promise<void> {
    return Promise.resolve();
  }

  async sendVerificationEmail(input: {
    recipient: string;
    verificationUrl: string;
    locale: "pt-BR" | "es";
  }): Promise<void> {
    const isTest = process.env.NODE_ENV === "test";
    const isDev = process.env.NODE_ENV === "development";

    if (isTest || isDev) {
      if (isTest) {
        if (this.sentCount >= 2) {
          throw new Error(
            "Test email limit reached (max 2 emails per test session)",
          );
        }
        this.sentCount++;
      }

      if (
        !this.apiKey ||
        this.apiKey.includes("dummy") ||
        this.apiKey.includes("your_api_key") ||
        this.apiKey === process.env.RESEND_API_KEY
      ) {
        console.log(
          `[TEST MOCK EMAIL] Sent verification email to ${input.recipient}: ${input.verificationUrl}`,
        );
        return;
      }
    }

    const subject =
      input.locale === "es"
        ? "Verifica tu correo electrónico - MedCiclo"
        : "Verifique seu e-mail - MedCiclo";

    const html =
      input.locale === "es"
        ? `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #102a43;">Bienvenido a MedCiclo</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">Gracias por registrarte. Para completar tu registro y verificar tu correo electrónico, haz clic en el siguiente botón:</p>
            <a href="${input.verificationUrl}" style="display: inline-block; background-color: #13a89e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Verificar correo electrónico</a>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Si no has solicitado esto, puedes ignorar este correo de forma segura.</p>
          </div>
        `
        : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #102a43;">Bem-vindo ao MedCiclo</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">Obrigado por se cadastrar. Para concluir seu cadastro e verificar seu e-mail, clique no botão abaixo:</p>
            <a href="${input.verificationUrl}" style="display: inline-block; background-color: #13a89e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Verificar e-mail</a>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Se você não solicitou este e-mail, pode ignorá-lo com segurança.</p>
          </div>
        `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: input.recipient,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Resend email delivery failed: ${response.statusText} - ${errorText}`,
      );
    }
  }
}

export async function requestPasswordRecovery(): Promise<{ accepted: true }> {
  return { accepted: true };
}
