export interface EmailService {
  sendPasswordReset(input: {
    recipient: string;
    resetUrl: string;
  }): Promise<void>;
}
export class DisabledEmailService implements EmailService {
  async sendPasswordReset(): Promise<void> {
    return Promise.resolve();
  }
}
export async function requestPasswordRecovery(): Promise<{ accepted: true }> {
  return { accepted: true };
}
