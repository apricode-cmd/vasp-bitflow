/**
 * Reusable Email Template Components
 * 
 * Modern, professional email components with inline styles
 */

export interface ButtonProps {
  text: string;
  url: string;
  color?: string;
  textColor?: string;
  fullWidth?: boolean;
}

export function Button({ text, url, color = '{{primaryColor}}', textColor = '#ffffff', fullWidth = false }: ButtonProps): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" ${fullWidth ? 'width="100%"' : ''}>
      <tr>
        <td style="border-radius: 8px; background: ${color}; text-align: center;">
          <a href="${url}" style="
            background: ${color};
            border: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            font-weight: 600;
            line-height: 1.5;
            text-decoration: none;
            text-transform: none;
            color: ${textColor};
            display: inline-block;
            padding: 14px 32px;
            border-radius: 8px;
          ">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

export interface InfoBoxProps {
  title?: string;
  content: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function InfoBox({ title, content, type = 'info' }: InfoBoxProps): string {
  const colors = {
    info: { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
    success: { bg: '#F0FDF4', border: '#10B981', text: '#065F46' },
    warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' },
    error: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },
  };

  const color = colors[type];

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="
      background-color: ${color.bg};
      border-left: 4px solid ${color.border};
      border-radius: 8px;
      margin: 20px 0;
    ">
      <tr>
        <td style="padding: 20px;">
          ${title ? `<p style="margin: 0 0 10px 0; font-weight: 600; color: ${color.text}; font-size: 16px;">${title}</p>` : ''}
          <div style="margin: 0; color: ${color.text}; font-size: 14px; line-height: 1.6;">
            ${content}
          </div>
        </td>
      </tr>
    </table>
  `.trim();
}

export interface OrderDetailsProps {
  items: Array<{ label: string; value: string; highlight?: boolean }>;
}

export function OrderDetails({ items }: OrderDetailsProps): string {
  const rows = items.map(item => `
    <tr style="${item.highlight ? 'border-top: 2px solid #E5E7EB;' : ''}">
      <td style="padding: ${item.highlight ? '16px 0 8px 0' : '8px 0'}; font-weight: ${item.highlight ? '600' : '400'}; color: #374151;">
        ${item.label}
      </td>
      <td style="padding: ${item.highlight ? '16px 0 8px 0' : '8px 0'}; text-align: right; font-weight: ${item.highlight ? '700' : '500'}; color: #111827; font-size: ${item.highlight ? '18px' : '16px'};">
        ${item.value}
      </td>
    </tr>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="
      background-color: #F9FAFB;
      border-radius: 12px;
      margin: 24px 0;
    ">
      <tr>
        <td style="padding: 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${rows}
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

export interface StepsProps {
  steps: Array<{ number: number; title: string; description: string }>;
}

export function Steps({ steps }: StepsProps): string {
  const stepItems = steps.map(step => `
    <tr>
      <td style="padding: 16px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="width: 40px; vertical-align: top;">
              <div style="
                width: 32px;
                height: 32px;
                background: {{primaryColor}};
                color: #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 16px;
                text-align: center;
                line-height: 32px;
              ">
                ${step.number}
              </div>
            </td>
            <td style="padding-left: 16px;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #111827; font-size: 16px;">
                ${step.title}
              </p>
              <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.5;">
                ${step.description}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      ${stepItems}
    </table>
  `.trim();
}

export interface BadgeProps {
  text: string;
  type?: 'default' | 'success' | 'warning' | 'error';
}

export function Badge({ text, type = 'default' }: BadgeProps): string {
  const colors = {
    default: { bg: '#F3F4F6', text: '#374151' },
    success: { bg: '#D1FAE5', text: '#065F46' },
    warning: { bg: '#FEF3C7', text: '#92400E' },
    error: { bg: '#FEE2E2', text: '#991B1B' },
  };

  const color = colors[type];

  return `
    <span style="
      display: inline-block;
      padding: 4px 12px;
      background-color: ${color.bg};
      color: ${color.text};
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    ">
      ${text}
    </span>
  `.trim();
}

export interface DividerProps {
  spacing?: 'sm' | 'md' | 'lg';
}

export function Divider({ spacing = 'md' }: DividerProps): string {
  const spacingMap = {
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: ${spacingMap[spacing]} 0;">
          <div style="border-top: 1px solid #E5E7EB;"></div>
        </td>
      </tr>
    </table>
  `.trim();
}

export interface IconProps {
  type: 'success' | 'warning' | 'error' | 'info';
  size?: number;
}

export function Icon({ type, size = 48 }: IconProps): string {
  const icons = {
    success: {
      bg: '#10B981',
      svg: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    },
    warning: {
      bg: '#F59E0B',
      svg: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    },
    error: {
      bg: '#EF4444',
      svg: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    },
    info: {
      bg: '#3B82F6',
      svg: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    },
  };

  const icon = icons[type];

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="
          width: ${size}px;
          height: ${size}px;
          background: ${icon.bg};
          border-radius: 50%;
          text-align: center;
          line-height: ${size}px;
        ">
          ${icon.svg}
        </td>
      </tr>
    </table>
  `.trim();
}

export interface SocialLinksProps {
  links: Array<{ platform: string; url: string }>;
}

export function SocialLinks({ links }: SocialLinksProps): string {
  const linkItems = links.map(link => `
    <td style="padding: 0 8px;">
      <a href="${link.url}" style="text-decoration: none; color: #6B7280;">
        ${link.platform}
      </a>
    </td>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
      <tr>
        ${linkItems}
      </tr>
    </table>
  `.trim();
}

