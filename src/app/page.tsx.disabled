/**
 * Landing Page
 * 
 * Main landing page with call-to-action for registration.
 */

import Link from 'next/link';
import { ArrowRight, Shield, Clock, Wallet, Zap, Lock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-gradient">
            Apricode Exchange
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button className="gradient-primary">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="secondary" className="mb-4">
            <Zap className="w-3 h-3 mr-1" />
            Secure Cryptocurrency Exchange
          </Badge>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
            Buy Cryptocurrency
            <span className="block text-gradient">Securely & Simply</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Purchase Bitcoin, Ethereum, Tether, and Solana with EUR or PLN.
            Fully verified, transparent, and compliant with regulations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 gradient-primary hover-lift">
                Start Trading
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Choose Apricode</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience the safest and most efficient way to buy cryptocurrency
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="hover-lift">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Secure & Verified</CardTitle>
              <CardDescription>
                Mandatory KYC verification ensures a safe and compliant trading environment for all users.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-lift">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Fast Processing</CardTitle>
              <CardDescription>
                Quick order processing and crypto delivery once payment is confirmed by our team.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-lift">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Multiple Currencies</CardTitle>
              <CardDescription>
                Buy BTC, ETH, USDT, and SOL with EUR or PLN through secure bank transfer.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="glass-card rounded-3xl p-8 lg:p-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Get started in 4 simple steps</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Register',
                description: 'Create your account with email and password',
                icon: Lock
              },
              {
                step: '2',
                title: 'Verify KYC',
                description: 'Complete identity verification for security',
                icon: Shield
              },
              {
                step: '3',
                title: 'Place Order',
                description: 'Choose crypto, amount, and enter your wallet',
                icon: TrendingUp
              },
              {
                step: '4',
                title: 'Receive Crypto',
                description: 'Get crypto in your wallet after payment',
                icon: Wallet
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center group">
                  <div className="relative mx-auto mb-6">
                    <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto group-hover:scale-110 transition-transform">
                      {item.step}
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 mt-20 border-t">
        <div className="text-center text-muted-foreground space-y-2">
          <p className="font-medium">&copy; 2024 Apricode Exchange. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Badge variant="outline">1.5% Fee</Badge>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Secure Trading
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              KYC Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

