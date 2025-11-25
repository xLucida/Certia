import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Shield, Bell, FileCheck, Users, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { CertiaLogo } from "@/components/CertiaLogo";
import { useRef } from "react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const howItWorksRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation */}
      <header className="border-b bg-gradient-to-r from-primary/5 via-background to-background backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CertiaLogo size="default" />
            <h1 className="text-xl font-bold tracking-wide">Certia</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection(howItWorksRef)}
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              data-testid="nav-how-it-works"
            >
              How it works
            </button>
            <button 
              onClick={() => scrollToSection(pricingRef)}
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              data-testid="nav-pricing"
            >
              Pricing
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogin}
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
              data-testid="button-login-text"
            >
              Log in
            </button>
            <Button 
              onClick={handleLogin} 
              size="sm"
              className="button-transition" 
              data-testid="button-get-started-nav"
            >
              Get started
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-background">
          <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left Column */}
              <div className="space-y-8 max-w-xl">
                <div className="space-y-5">
                  <h2 className="text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
                    Right-to-Work Checks for German HR Teams, Documented and Audit-Ready
                  </h2>
                  <p className="text-xl text-foreground/80 leading-relaxed">
                    Certia helps you standardize right-to-work checks, log every decision, and stay audit-ready in minutes — without turning your team into immigration experts.
                  </p>
                </div>

                {/* Trust Line */}
                <p className="text-sm text-foreground/60 font-medium">
                  Built for German HR, works with EU Blue Cards, eAT permits, Fiktionsbescheinigungen.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={handleLogin} 
                    size="lg" 
                    className="button-transition text-base" 
                    data-testid="button-get-started-hero"
                  >
                    Get Started with Certia
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    onClick={() => scrollToSection(howItWorksRef)}
                    variant="outline" 
                    size="lg" 
                    className="button-transition text-base"
                    data-testid="button-view-demo"
                  >
                    View Demo
                  </Button>
                </div>
              </div>

              {/* Right Column - Product Preview Card */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl opacity-30" />
                <Card className="relative shadow-2xl border-2 rounded-2xl overflow-hidden bg-gradient-to-br from-card to-background">
                  <CardHeader className="border-b bg-gradient-to-r from-muted/40 to-background/50 backdrop-blur-sm p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400/80 shadow-sm" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400/80 shadow-sm" />
                        <div className="w-3 h-3 rounded-full bg-green-400/80 shadow-sm" />
                      </div>
                      <span className="text-sm text-muted-foreground ml-2 font-medium">Dashboard Preview</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5 bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3.5 border shadow-sm hover-elevate">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mb-1">Total</div>
                        <div className="text-2xl font-bold">24</div>
                      </div>
                      <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3.5 border shadow-sm hover-elevate">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-accent" />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mb-1">Eligible</div>
                        <div className="text-2xl font-bold text-accent">21</div>
                      </div>
                      <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3.5 border shadow-sm hover-elevate">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mb-1">Expiring</div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">3</div>
                      </div>
                    </div>
                    <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl p-4 shadow-sm backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Cases requiring review</p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">5 open · 2 resolved</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Why Certia - Feature Cards (3 columns) */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why Certia</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built from the ground up for German HR compliance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-hover border-2">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <FileCheck className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">Standardized Process</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every check follows the same documented workflow — reduce variability and compliance risk.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover border-2">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                    <CheckCircle className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="font-bold text-lg">Conservative Defaults</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    AI + rules engine defaults to "Needs Review" when uncertain — prioritizing safety and compliance.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover border-2">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                    <Shield className="h-7 w-7 text-amber-600 dark:text-amber-500" />
                  </div>
                  <h3 className="font-bold text-lg">Audit-Ready Reports</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Complete logs, attachments, and notes — everything you need for compliance audits.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How Certia Works Section */}
        <section ref={howItWorksRef} className="max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How Certia Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to compliance clarity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Add Employee & Document</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload work permits, visas, or residence titles. Certia reads them automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-accent">2</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Certia Analyzes Eligibility</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI + rules engine evaluate work authorization based on German visa law.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-500">3</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Track Renewals & Export</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Monitor expiry dates, get alerts, and export audit-ready records anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Compliance for German HR Band */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <Card className="bg-gradient-to-br from-primary/5 to-background border-2 shadow-lg">
            <CardContent className="p-10 lg:p-12">
              <div className="max-w-3xl mx-auto">
                <h3 className="text-3xl lg:text-4xl font-bold mb-6 text-center">
                  Compliance for German HR
                </h3>
                <p className="text-lg text-muted-foreground text-center mb-8 leading-relaxed">
                  Certia helps HR teams manage right-to-work compliance for employees in Germany. Track EU Blue Cards, EAT permits, Fiktionsbescheinigungen, and other residence titles with automated eligibility checks, audit-friendly history, and expiry monitoring.
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Documented Decisions</p>
                      <p className="text-sm text-muted-foreground">Printable reports and CSV exports for every check</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">AI + Rules Engine</p>
                      <p className="text-sm text-muted-foreground">Defaults to "Needs Review" when unsure — conservative and safe</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Complete Audit Trail</p>
                      <p className="text-sm text-muted-foreground">Notes, attachments, and case workflow for every check</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Final CTA Section */}
        <section ref={pricingRef} className="max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold">Get Started Today</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Start with one team, expand as you grow. Only pay for what you use.
              </p>
            </div>
            <Button 
              onClick={handleLogin} 
              size="lg" 
              className="button-transition text-base mx-auto" 
              data-testid="button-get-started-cta"
            >
              Get Started with Certia
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              No credit card required. 14-day free trial included.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">© 2024 Certia. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Certia – right-to-work clarity for German HR.</p>
        </div>
      </footer>
    </div>
  );
}
