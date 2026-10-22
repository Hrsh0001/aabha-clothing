// Luxury Email Notification Service for AABHA CLOTHING
// Supports Resend API (Zero-dependency REST), SendGrid, and custom SMTP webhooks

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: SendEmailOptions): Promise<{ success: boolean; error?: string; messageId?: string }> {
  let senderEmail =
    from ||
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    'AABHA CLOTHING <orders@aabhaclothing.in>';

  // Since aabhaclothing.in domain is verified in Resend, automatically upgrade from testing sandbox
  if (senderEmail.includes('onboarding@resend.dev')) {
    senderEmail = 'AABHA CLOTHING <orders@aabhaclothing.in>';
  }

  const fromHeader = senderEmail.includes('<') ? senderEmail : `AABHA CLOTHING <${senderEmail}>`;

  // Test / Local Mock Simulation Mode:
  // When executing tests or using a placeholder API key, simulate delivery cleanly
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const isTestOrPlaceholder =
    process.env.NODE_ENV === 'test' ||
    process.env.TEST_EMAIL_SIMULATE === 'true' ||
    !resendApiKey ||
    resendApiKey === 're_your_api_key_here' ||
    resendApiKey.startsWith('re_test_');

  if (isTestOrPlaceholder && !resendApiKey?.startsWith('re_live_')) {
    console.log(`[EMAIL SIMULATION] Mock delivery to "${to}" (Subject: "${subject}")`);
    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  let resendErrorMsg: string | null = null;

  // 1. Resend REST API
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [to],
          subject,
          html,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) {
        console.log(`[Resend OK] Email dispatched to ${to} (Message ID: ${data.id})`);
        return { success: true, messageId: data.id };
      }

      resendErrorMsg = data.message || `Resend HTTP error ${res.status}`;
      console.error(`[Resend Error] Failed sending email to ${to}: Status ${res.status} — ${resendErrorMsg}`);

      // Clear diagnostic when Resend free sandbox or unverified domain blocks external customers ("same vara ne")
      if (
        res.status === 403 ||
        resendErrorMsg.includes('testing emails to your own email address') ||
        resendErrorMsg.includes('verify a domain')
      ) {
        console.error(
          `[RESEND DOMAIN VERIFICATION NEEDED] Customer recipient "${to}" was blocked by Resend because the sender domain is not verified. To send order confirmation emails to customers ("same vara ne"): 1) Verify "aabhaclothing.in" at resend.com/domains 2) Set EMAIL_FROM="AABHA CLOTHING <orders@aabhaclothing.in>" in your hosting environment variables.`
        );
      }
    } catch (err: any) {
      console.error('Email sending exception via Resend:', err);
      resendErrorMsg = err.message || 'Network exception reaching Resend';
    }
  }

  // 2. SendGrid REST API fallback (if configured)
  const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim();
  if (sendgridApiKey) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: senderEmail.replace(/.*<([^>]+)>.*/, '$1').trim() },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });

      if (res.ok || res.status === 202) {
        console.log(`[SendGrid OK] Fallback email dispatched to ${to}`);
        return { success: true, messageId: `sg_${Date.now()}` };
      }
      const sgErr = `SendGrid error status: ${res.status}`;
      console.error(`[SendGrid Error] Failed sending fallback email to ${to}:`, sgErr);
      return { success: false, error: sgErr };
    } catch (err: any) {
      console.error('Email sending error via SendGrid:', err);
      return { success: false, error: err.message };
    }
  }

  // If a live key was provided and it failed without backup
  if (resendErrorMsg) {
    return { success: false, error: resendErrorMsg };
  }

  // Fallback: If no mail provider key configured in production, log details cleanly
  console.log(`[EMAIL NOTICE] No active mail provider key configured. Simulated email to: ${to} | Subject: "${subject}"`);
  return {
    success: true,
    messageId: `sim_${Date.now()}`,
  };
}

// -----------------------------------------------------------------------------
// Luxury Email HTML Templates
// -----------------------------------------------------------------------------

export function generateOrderConfirmationHtml(order: {
  orderNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: any;
  total: number;
}): string {
  const rawItems = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
    ? (() => {
        try {
          return JSON.parse(order.items);
        } catch {
          return [];
        }
      })()
    : [];

  const itemsHtml = (Array.isArray(rawItems) ? rawItems : [])
    .map(
      (item: any) => {
        const itemName = item?.name || item?.product?.name || 'Handcrafted Silhouette';
        const itemSize = item?.size || 'Free Size';
        const itemQty = Number(item?.quantity) || 1;
        const itemPrice = Number(item?.price || item?.product?.price) || 0;
        return `
      <tr style="border-bottom: 1px solid #ECE6DD;">
        <td style="padding: 12px 0; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 13px; color: #1E1B18;">
          <strong>${itemName}</strong><br>
          <span style="font-size: 11px; color: #7C736A;">Size: ${itemSize} · Qty: ${itemQty}</span>
        </td>
        <td style="padding: 12px 0; text-align: right; font-family: 'JetBrains Mono', Courier, monospace; font-size: 13px; color: #1E1B18;">
          ₹${(itemPrice * itemQty).toLocaleString('en-IN')}
        </td>
      </tr>`;
      }
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AABHA CLOTHING — Order Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #1E1B18;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF8F5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #ECE6DD; max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 35px 40px; background-color: #1E1B18; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 26px; letter-spacing: 4px; color: #FAF8F5; text-transform: uppercase;">
                AABHA
              </h1>
              <p style="margin: 4px 0 0; font-size: 9px; letter-spacing: 3px; color: #D5CCC0; text-transform: uppercase;">
                Haute Atelier · Handcrafted Indian Luxury
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 35px 40px;">
              <span style="display: inline-block; padding: 3px 8px; background-color: #E8F5E9; color: #2E7D32; font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; border: 1px solid #C8E6C9;">
                Order Confirmed · Cash on Delivery
              </span>
              
              <h2 style="font-family: Georgia, serif; font-size: 24px; color: #1E1B18; margin: 16px 0 8px; font-weight: normal;">
                Namaste ${order.customerName},
              </h2>
              
              <p style="font-size: 13px; line-height: 1.6; color: #5C544D; margin: 0 0 24px;">
                Thank you for selecting AABHA CLOTHING. Your artisanal order <strong>#${order.orderNumber}</strong> has been received by our atelier. Our master tailors are inspecting and steam-finishing your handwoven garments.
              </p>

              <!-- Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <thead>
                  <tr style="border-bottom: 2px solid #1E1B18;">
                    <th style="padding: 8px 0; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7C736A;">Garment</th>
                    <th style="padding: 8px 0; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7C736A;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 16px 0 4px; font-size: 13px; font-weight: bold; color: #1E1B18;">Doorstep COD Collect Amount:</td>
                    <td style="padding: 16px 0 4px; text-align: right; font-family: 'JetBrains Mono', Courier, monospace; font-size: 16px; font-weight: bold; color: #1E1B18;">
                      ₹${order.total.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <!-- Delivery Destination -->
              <div style="background-color: #FAF8F5; border: 1px solid #ECE6DD; padding: 18px 20px; margin-bottom: 25px;">
                <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7C736A; font-weight: bold;">
                  Doorstep Delivery Destination:
                </p>
                <p style="margin: 0; font-size: 13px; color: #1E1B18; line-height: 1.5;">
                  ${order.address}, ${order.city}, ${order.state} — <strong>${order.pincode}</strong><br>
                  Contact: ${order.phone}
                </p>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #7C736A; margin: 0;">
                ✓ Complimentary insured express delivery<br>
                ✓ Packaged in breathable, reusable handloom muslin garment bag<br>
                ✓ Pay cash or scan UPI upon doorstep handover
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 40px; background-color: #FAF8F5; border-top: 1px solid #ECE6DD; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #7C736A;">
                Questions about your bespoke order? Contact our Client Care Atelier via WhatsApp or phone at +${(process.env.NEXT_PUBLIC_STORE_WHATSAPP || '919876543210').replace(/[^0-9]/g, '')}.
              </p>
              <p style="margin: 0; font-size: 10px; color: #9E948A; text-transform: uppercase; letter-spacing: 1.5px;">
                © 2026 AABHA CLOTHING · Made in India
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateDispatchNoticeHtml(order: {
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string;
  total: number;
  riderNavUrl?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AABHA CLOTHING — Order Dispatched</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1E1B18;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #ECE6DD; max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 30px 40px; background-color: #1E1B18; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 4px; color: #FAF8F5;">AABHA</h1>
              <p style="margin: 4px 0 0; font-size: 9px; letter-spacing: 2px; color: #D5CCC0; text-transform: uppercase;">Courier Dispatch Notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 40px;">
              <span style="display: inline-block; padding: 3px 8px; background-color: #E3F2FD; color: #1565C0; font-size: 10px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
                Out for Delivery
              </span>
              <h2 style="font-family: Georgia, serif; font-size: 22px; color: #1E1B18; margin: 14px 0 8px;">
                Your Order #${order.orderNumber} is on the way!
              </h2>
              <p style="font-size: 13px; line-height: 1.6; color: #5C544D; margin: 0 0 20px;">
                Namaste ${order.customerName}, your handcrafted garments have cleared quality inspection and have been handed to express courier dispatch for delivery to ${order.city}.
              </p>
              <div style="background-color: #FAF8F5; border: 1px solid #ECE6DD; padding: 15px 18px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #1E1B18;">
                  <strong>Doorstep COD Collect Amount:</strong> ₹${order.total.toLocaleString('en-IN')}<br>
                  <span style="font-size: 12px; color: #7C736A;">Cash or UPI accepted at doorstep.</span>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
