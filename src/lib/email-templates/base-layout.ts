/**
 * Base Email Template Layout
 * 
 * Responsive email template with white-label support
 */

export interface EmailLayoutOptions {
  brandName?: string;
  brandLogo?: string;
  primaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  footerText?: string;
}

export function getBaseEmailLayout(content: string, options: EmailLayoutOptions = {}): string {
  const {
    brandName = '{{brandName}}',
    brandLogo = '{{brandLogo}}',
    primaryColor = '{{primaryColor}}',
    supportEmail = '{{supportEmail}}',
    supportPhone = '{{supportPhone}}',
    footerText = `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${brandName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles for email clients */
    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    table {
      border-collapse: collapse;
      border-spacing: 0;
    }
    
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-content {
        padding: 30px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
    {{preheader}}
  </div>
  
  <!-- Email Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F3F4F6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Email Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with Gradient -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, ${primaryColor} 0%, #0891B2 100%); padding: 40px 30px; position: relative;">
              <!-- Decorative Pattern -->
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.1; background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
              
              <!-- Logo -->
              <img src="${brandLogo}" alt="${brandName}" style="max-width: 180px; height: auto; display: block; margin: 0 auto; position: relative; z-index: 1;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="email-content" style="padding: 48px 40px; color: #1F2937; font-size: 16px; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 32px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 14px; font-weight: 500;">
                ${footerText}
              </p>
              
              <!-- Contact Info -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 16px auto;">
                <tr>
                  ${supportEmail ? `
                  <td style="padding: 0 12px;">
                    <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none; font-size: 14px; font-weight: 500;">
                      📧 ${supportEmail}
                    </a>
                  </td>
                  ` : ''}
                  ${supportPhone ? `
                  <td style="padding: 0 12px; border-left: 1px solid #E5E7EB;">
                    <a href="tel:${supportPhone}" style="color: ${primaryColor}; text-decoration: none; font-size: 14px; font-weight: 500;">
                      📞 ${supportPhone}
                    </a>
                  </td>
                  ` : ''}
                </tr>
              </table>
              
              <!-- Legal Text -->
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
                This email was sent to you by ${brandName}.<br>
                If you have any questions, please contact our support team.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Minimal layout for simple emails
export function getMinimalEmailLayout(content: string, options: EmailLayoutOptions = {}): string {
  const {
    brandName = '{{brandName}}',
    primaryColor = '{{primaryColor}}',
    supportEmail = '{{supportEmail}}',
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
      text-align: center;
      font-size: 14px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div style="display: none;">{{preheader}}</div>
  <div class="container">
    ${content}
    <div class="footer">
      <p>${brandName} ${supportEmail ? `• <a href="mailto:${supportEmail}">${supportEmail}</a>` : ''}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

