import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckDecisionPanel, CheckAuditTrail } from "@/components/check-components";
import { ArrowLeft, User, Printer, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { RightToWorkCheck } from "@shared/schema";

export default function CheckDetail() {
  const [, params] = useRoute("/checks/:id");
  const [, setLocation] = useLocation();
  const checkId = params?.id;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const { data: check, isLoading } = useQuery<RightToWorkCheck>({
    queryKey: ["/api/checks", checkId],
    enabled: !!checkId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/checks/${checkId}`);
    },
    onSuccess: () => {
      toast({
        title: "Check deleted",
        description: "The right-to-work check has been successfully deleted.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete check. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!check) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
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
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-8">
          <div className="flex items-center gap-4 print:hidden">
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
                <div className="print:hidden">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.print()}
                    data-testid="button-print-summary"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Summary
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold print:hidden">Check Details</h2>
            <CheckDecisionPanel check={check} />
            <div className="print:hidden">
              <CheckAuditTrail check={check} />
            </div>
          </div>

          <div className="flex justify-end print:hidden pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete-check"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Check
            </Button>
          </div>
        </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Right-to-Work Check</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this check? This will also remove the stored OCR scan data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
