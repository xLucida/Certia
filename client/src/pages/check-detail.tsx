import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckDecisionPanel, CheckAuditTrail } from "@/components/check-components";
import { ArrowLeft, User } from "lucide-react";
import type { RightToWorkCheck } from "@shared/schema";

export default function CheckDetail() {
  const [, params] = useRoute("/checks/:id");
  const checkId = params?.id;

  const { data: check, isLoading } = useQuery<RightToWorkCheck>({
    queryKey: ["/api/checks", checkId],
    enabled: !!checkId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-96" />
          </div>
        </main>
      </div>
    );
  }

  if (!check) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">Check not found</p>
              <Link href="/">
                <Button className="mt-4" variant="outline">
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-2xl" data-testid="text-candidate-name">
                      {check.firstName} {check.lastName}
                    </CardTitle>
                    <Badge variant="secondary">Candidate</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Right-to-Work Check (Pre-Employment)
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Check Details</h2>
            <CheckDecisionPanel check={check} />
            <CheckAuditTrail check={check} />
          </div>
        </div>
      </main>
    </div>
  );
}
