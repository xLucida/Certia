import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Shield, Bell, FileCheck, Users, AlertTriangle, ArrowRight } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">RTW-DE</h1>
          <Button onClick={handleLogin} variant="outline" className="button-transition" data-testid="button-login">
            Log In
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                    Right-to-Work Compliance for Germany
                  </h2>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Upload German residence documents → structured eligibility screening, document tracking, and expiry alerts in one place.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={handleLogin} size="lg" className="button-transition text-base" data-testid="button-get-started">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button onClick={handleLogin} variant="outline" size="lg" className="button-transition text-base">
                    View Demo
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Card className="shadow-2xl border-2 rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-br from-primary/10 to-background p-1">
                    <Card className="border-0">
                      <CardHeader className="border-b bg-card/50 p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                          </div>
                          <span className="text-sm text-muted-foreground ml-2">Dashboard</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-background rounded-lg p-3 border">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-4 w-4 text-primary" />
                              <span className="text-xs text-muted-foreground">Total</span>
                            </div>
                            <div className="text-2xl font-bold">24</div>
                          </div>
                          <div className="bg-background rounded-lg p-3 border">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="h-4 w-4 text-accent" />
                              <span className="text-xs text-muted-foreground">Eligible</span>
                            </div>
                            <div className="text-2xl font-bold text-accent">21</div>
                          </div>
                          <div className="bg-background rounded-lg p-3 border">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <span className="text-xs text-muted-foreground">Expiring</span>
                            </div>
                            <div className="text-2xl font-bold text-amber-600">3</div>
                          </div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Cases requiring review</p>
                              <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">5 open · 2 resolved</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-20">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-hover border-2">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <FileCheck className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">Document Management</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Store and track all employee visa documents in one secure location
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
                  <h3 className="font-bold text-lg">Automated Checks</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Automatically evaluate work eligibility based on German visa rules
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover border-2">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                    <Bell className="h-7 w-7 text-amber-600" />
                  </div>
                  <h3 className="font-bold text-lg">Expiry Alerts</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Get notified about documents expiring within 60 days
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover border-2">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">Stay Compliant</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ensure all employees have valid work authorization at all times
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-20">
          <Card className="bg-gradient-to-br from-primary/5 to-background border-2 shadow-lg">
            <CardContent className="p-10 lg:p-12">
              <div className="max-w-3xl mx-auto">
                <h3 className="text-3xl lg:text-4xl font-bold mb-6 text-center">
                  Simplified HR Compliance
                </h3>
                <p className="text-lg text-muted-foreground text-center mb-8 leading-relaxed">
                  RTW-DE helps HR teams manage right-to-work compliance for employees in Germany with confidence and ease.
                </p>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Track Multiple Visa Types</p>
                      <p className="text-sm text-muted-foreground">EU Blue Cards, EAT permits, Fiktionsbescheinigung</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Automated Eligibility</p>
                      <p className="text-sm text-muted-foreground">Conservative compliance checks based on German law</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Expiry Monitoring</p>
                      <p className="text-sm text-muted-foreground">60-day advance alerts keep you ahead of deadlines</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button onClick={handleLogin} size="lg" variant="default" className="button-transition" data-testid="button-sign-up">
                    Get Started Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t mt-16 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2024 RTW-DE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
