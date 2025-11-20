import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Shield, Bell, FileCheck } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold">RTW-DE</h1>
          <Button onClick={handleLogin} data-testid="button-login">
            Log In
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold text-foreground mb-4">
            Right-to-Work Compliance for Germany
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Manage employee work eligibility, track visa documentation, and stay compliant with German labor regulations.
          </p>
          <Button onClick={handleLogin} size="lg" data-testid="button-get-started">
            Get Started
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Document Management</h3>
                <p className="text-sm text-muted-foreground">
                  Store and track all employee visa documents in one secure location
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Automated Checks</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically evaluate work eligibility based on German visa rules
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Expiry Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Get notified about documents expiring within 60 days
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Stay Compliant</h3>
                <p className="text-sm text-muted-foreground">
                  Ensure all employees have valid work authorization at all times
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card">
          <CardContent className="p-8">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-2xl font-semibold mb-4 text-center">
                Simplified HR Compliance
              </h3>
              <p className="text-muted-foreground text-center mb-6">
                RTW-DE helps HR teams manage right-to-work compliance for employees in Germany. 
                Track EU Blue Cards, EAT permits, Fiktionsbescheinigung, and other visa documentation 
                with automated eligibility checks and expiry monitoring.
              </p>
              <div className="flex justify-center">
                <Button onClick={handleLogin} variant="outline" data-testid="button-sign-up">
                  Sign Up Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t mt-16 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2024 RTW-DE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
