import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusInterpretation } from "@/components/StatusInterpretation";
import { ArrowLeft, User, Printer, Trash2, FileText, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RightToWorkCheck, RightToWorkCheckNote } from "@shared/schema";
import { formatDate } from "@/lib/dateUtils";

export default function CheckDetail() {
  const [, params] = useRoute("/checks/:id");
  const [, setLocation] = useLocation();
  const checkId = params?.id;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const { data: check, isLoading } = useQuery<RightToWorkCheck>({
    queryKey: ["/api/checks", checkId],
    enabled: !!checkId,
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery<RightToWorkCheckNote[]>({
    queryKey: ["/api/checks", checkId, "notes"],
    enabled: !!checkId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/checks/${checkId}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checks", checkId, "notes"] });
      setNewNote("");
      toast({
        title: "Note added",
        description: "Case file note has been successfully added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note. Please try again.",
        variant: "destructive",
      });
    },
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

  const updateCaseStatusMutation = useMutation({
    mutationFn: async (caseStatus: string) => {
      return await apiRequest("PATCH", `/api/checks/${checkId}/case-status`, { caseStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checks", checkId] });
      toast({
        title: "Case status updated",
        description: "The case workflow status has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update case status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };

  const getCaseStatusBadge = (caseStatus: string) => {
    switch (caseStatus) {
      case "OPEN":
        return { variant: "secondary" as const, label: "Open", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" };
      case "UNDER_REVIEW":
        return { variant: "secondary" as const, label: "Under Review", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" };
      case "CLEARED":
        return { variant: "secondary" as const, label: "Cleared", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" };
      default:
        return { variant: "secondary" as const, label: "Unknown", className: "" };
    }
  };

  const getCaseStatusLabel = (caseStatus: string) => {
    switch (caseStatus) {
      case "OPEN":
        return "Open";
      case "UNDER_REVIEW":
        return "Under Review";
      case "CLEARED":
        return "Cleared";
      default:
        return "Unknown";
    }
  };

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

  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const missingInfo = check.decisionDetails?.filter((detail: string) =>
    detail.startsWith('We could not determine from the information provided')
  ) || [];
  const regularDetails = check.decisionDetails?.filter((detail: string) =>
    !detail.startsWith('We could not determine from the information provided')
  ) || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-8">
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Certia</h1>
          <h2 className="text-xl font-semibold text-gray-700 mt-2">Right-to-Work Check Audit Report</h2>
          <p className="text-sm text-gray-600 mt-1">Report Date: {reportDate}</p>
        </div>
      </div>

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
                    <User className="h-5 w-5 text-muted-foreground print:hidden" />
                    <CardTitle className="text-2xl" data-testid="text-candidate-name">
                      {check.firstName} {check.lastName}
                    </CardTitle>
                    <Badge variant="secondary" className="print:hidden">Candidate</Badge>
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
            
            {/* Case Workflow Status - Interactive on screen, static in print */}
            <Card data-testid="card-case-status">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Case Workflow Status</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Print view - static text */}
                <div className="hidden print:block">
                  <p className="text-sm">
                    <span className="font-medium">Case status: </span>
                    <span>{getCaseStatusLabel(check.caseStatus)}</span>
                  </p>
                </div>
                
                {/* Screen view - interactive select */}
                <div className="flex items-center gap-3 print:hidden">
                  <div className="flex-1">
                    <Select 
                      value={check.caseStatus} 
                      onValueChange={(value) => updateCaseStatusMutation.mutate(value)}
                      disabled={updateCaseStatusMutation.isPending}
                      data-testid="select-case-status"
                    >
                      <SelectTrigger aria-labelledby="case-status-label">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN" data-testid="option-case-status-open">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>Open</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="UNDER_REVIEW" data-testid="option-case-status-under-review">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Under Review</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="CLEARED" data-testid="option-case-status-cleared">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span>Cleared</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge 
                    variant={getCaseStatusBadge(check.caseStatus).variant}
                    className={getCaseStatusBadge(check.caseStatus).className}
                    data-testid="badge-case-status"
                  >
                    {getCaseStatusBadge(check.caseStatus).label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <CheckDecisionPanel check={check} />
            
            {/* Status Interpretation - shows in both screen and print */}
            <StatusInterpretation status={check.workStatus} />
            
            {/* How this decision was made - shows in both screen and print */}
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900" data-testid="how-decision-made">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <FileText className="h-4 w-4" />
                  How this decision was made
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/90">
                  Certia combines a rules engine based on German right-to-work guidelines with an AI review of the scanned document. When the AI and rules engine disagree, or key information is missing, the status is set to 'Needs review' for safety.
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span>Document was scanned and parsed using OCR.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span>AI reviewed the OCR text and extracted fields.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span>A rules engine checked document type and expiry.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span>Any conflicts or uncertainties automatically downgrade the status to 'Needs review'.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <div className="print:hidden">
              <CheckAuditTrail check={check} />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 print:hidden" />
              Case File Notes
            </h2>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Internal Notes & Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Note Form - Hide in print */}
                <div className="space-y-3 print:hidden">
                  <label className="text-sm font-medium">Add Note</label>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add internal notes about this check, follow-up actions, or additional context..."
                    className="min-h-[100px] resize-none"
                    data-testid="textarea-new-note"
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                    size="sm"
                    data-testid="button-add-note"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                  </Button>
                </div>

                {/* Notes List - Visible in print */}
                {notesLoading ? (
                  <div className="space-y-3 print:hidden">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground print:hidden">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No notes yet. Add the first note above.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Note History ({notes.length})
                    </h3>
                    <div className="space-y-3">
                      {notes
                        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                        .map((note, index) => (
                          <div
                            key={note.id}
                            className="p-4 rounded-lg border bg-card/50 space-y-2 print:bg-white print:border-gray-300"
                            data-testid={`note-${index}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className="text-xs print:bg-gray-100 print:border-gray-300">
                                Note #{notes.length - index}
                              </Badge>
                              <span className="text-xs text-muted-foreground print:text-gray-600" data-testid={`note-timestamp-${index}`}>
                                {formatDate(note.createdAt as unknown as string)}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap print:text-gray-900" data-testid={`note-content-${index}`}>
                              {note.content}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
