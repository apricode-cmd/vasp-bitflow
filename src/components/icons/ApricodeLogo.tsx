/**
 * Apricode Logo Component
 * 
 * SVG logo for Apricode branding with theme-aware color
 */

interface ApricodeLogoProps {
  className?: string;
  size?: number;
}

export function ApricodeLogo({ className = '', size = 16 }: ApricodeLogoProps): React.ReactElement {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 96.38 96.2"
      width={size}
      height={size}
      className={className}
      aria-label="Apricode Logo"
    >
      <g>
        <path 
          className="fill-current" 
          d="M82.68,81.65A48.18,48.18,0,0,0,52.44,0Z"
        />
        <path 
          className="fill-current" 
          d="M40.73,9l3.35-9A48.17,48.17,0,0,0,13.72,81.66Z"
        />
        <path 
          className="fill-current" 
          d="M48.24,28.36l-23.07,62a48.22,48.22,0,0,0,46.06,0Z"
        />
      </g>
    </svg>
  );
}

