/**
 * Envoi d'e-mails de service (avertissement avant suppression d'un compte inactif).
 * Prestataire : Brevo (société française, données dans l'UE), via son API HTTP.
 * Secrets : BREVO_API_KEY, EMAIL_FROM (adresse validée chez Brevo), EMAIL_FROM_NAME (facultatif).
 */
export function emailConfigured(): boolean {
  return Boolean(Deno.env.get('BREVO_API_KEY') && Deno.env.get('EMAIL_FROM'));
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const response = await fetch(Deno.env.get('BREVO_API_URL') ?? 'https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': Deno.env.get('BREVO_API_KEY')!,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: Deno.env.get('EMAIL_FROM'), name: Deno.env.get('EMAIL_FROM_NAME') ?? 'Côte à Côte' },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });
  if (!response.ok) throw new Error(`Envoi de l'e-mail refusé (${response.status})`);
}
