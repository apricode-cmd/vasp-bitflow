/**
 * Footer Component
 * 
 * Application footer with links and information.
 */

import Link from 'next/link';

export function Footer(): React.ReactElement {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Apricode Exchange</h3>
            <p className="text-sm text-gray-600">
              Secure platform for buying cryptocurrency with fiat currency. 
              KYC verified and fully compliant.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-600 hover:text-blue-600">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-gray-600 hover:text-blue-600">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-gray-600 hover:text-blue-600">
                  Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Platform Fee: 1.5%</li>
              <li>Supported: BTC, ETH, USDT, SOL</li>
              <li>Payment: EUR, PLN Bank Transfer</li>
              <li>KYC Required</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} Apricode Exchange. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

