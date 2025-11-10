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
    /* Reset styles */
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
    
    /* Base styles */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    .email-header {
      background-color: ${primaryColor};
      padding: 30px 20px;
      text-align: center;
    }
    
    .email-logo {
      max-width: 200px;
      height: auto;
    }
    
    .email-content {
      padding: 40px 30px;
      color: #333333;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
    }
    
    .email-footer {
      background-color: #f8f9fa;
      padding: 30px 20px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
    
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    
    .button:hover {
      opacity: 0.9;
    }
    
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid ${primaryColor};
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .success-box {
      background-color: #d1e7dd;
      border-left: 4px solid #198754;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .divider {
      border-top: 1px solid #e9ecef;
      margin: 30px 0;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-content {
        padding: 20px 15px !important;
      }
      
      .button {
        display: block;
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    {{preheader}}
  </div>
  
  <!-- Email Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Email Container -->
        <table class="email-container" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header -->
          <tr>
            <td class="email-header">
              <img src="${brandLogo}" alt="${brandName}" class="email-logo" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="email-content">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <p style="margin: 0 0 10px 0;">
                ${footerText}
              </p>
              ${supportEmail ? `
              <p style="margin: 10px 0;">
                <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
                  ${supportEmail}
                </a>
              </p>
              ` : ''}
              ${supportPhone ? `
              <p style="margin: 10px 0;">
                <a href="tel:${supportPhone}" style="color: ${primaryColor}; text-decoration: none;">
                  ${supportPhone}
                </a>
              </p>
              ` : ''}
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #999;">
                This email was sent to you by ${brandName}. 
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

