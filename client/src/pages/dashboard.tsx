import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  Plus,
  Eye,
  Search,
  X,
  Database,
  Download,
  HelpCircle,
  Rocket,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { formatDate } from "@/lib/dateUtils";
import { isExpiringSoon } from "@/lib/workEligibilityUtils";
import type { EmployeeWithChecks } from "@shared/schema";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [documentType, setDocumentType] = useState<string>("");
  const [expiryFrom, setExpiryFrom] = useState<string>("");
  const [expiryTo, setExpiryTo] = useState<string>("");

  const [resolvedCaseIds, setResolvedCaseIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("rtwde_resolved_case_ids");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("rtwde_resolved_case_ids", JSON.stringify(resolvedCaseIds));
    } catch {
      // ignore
    }
  }, [resolvedCaseIds]);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    if (documentType) params.append("documentType", documentType);
    if (expiryFrom) params.append("expiryFrom", expiryFrom);
    if (expiryTo) params.append("expiryTo", expiryTo);
    return params.toString();
  };

  const { data: employees, isLoading, error } = useQuery<EmployeeWithChecks[]>({
    queryKey: ["/api/employees", search, status, documentType, expiryFrom, expiryTo],
    queryFn: async () => {
      const queryString = buildQueryString();
      const url = `/api/employees${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: standaloneChecks } = useQuery<any[]>({
    queryKey: ["/api/checks/standalone"],
    enabled: isAuthenticated,
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/demo/seed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checks/standalone"] });
      toast({
        title: "Demo data seeded",
        description: "Sample employees and checks have been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed demo data. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Card>
            <CardHeader className="border-b">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="divide-y">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="flex items-center justify-between py-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error && isUnauthorizedError(error as Error)) {
    return null;
  }

  const employeesWithLatestCheck =
    employees?.map((emp) => ({
      ...emp,
      latestCheck:
        emp.checks?.sort(
          (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        )[0],
      isStandalone: false,
    })) || [];

  const standaloneCheckRows =
    standaloneChecks?.map((check) => ({
      id: check.id,
      firstName: check.firstName || "",
      lastName: check.lastName || "",
      email: null,
      nationality: null,
      dateOfBirth: null,
      userId: check.userId,
      createdAt: check.createdAt,
      updatedAt: check.updatedAt,
      checks: [check],
      latestCheck: check,
      isStandalone: true,
    })) || [];

  const allRows = [...employeesWithLatestCheck, ...standaloneCheckRows];

  const totalEmployees = employees?.length || 0;
  const eligibleCount = allRows.filter((row) => row.latestCheck?.workStatus === "ELIGIBLE").length;

  const expiringSoon = allRows.filter(
    (row) => row.latestCheck?.expiryDate && isExpiringSoon(row.latestCheck.expiryDate)
  );

  const casesRequiringReview = allRows.filter(
    (row) =>
      row.latestCheck &&
      (row.latestCheck.workStatus === "NEEDS_REVIEW" || row.latestCheck.workStatus === "NOT_ELIGIBLE")
  );

  const openCases = casesRequiringReview.filter((row) => {
    const checkId = row.latestCheck?.id;
    return checkId && !resolvedCaseIds.includes(checkId);
  });

  const resolvedCases = casesRequiringReview.filter((row) => {
    const checkId = row.latestCheck?.id;
    return checkId && resolvedCaseIds.includes(checkId);
  });

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: "Overdue", variant: "destructive" as const, days: Math.abs(diffDays) };
    } else if (diffDays <= 60) {
      return { label: "Expiring soon", variant: "default" as const, days: diffDays };
    } else if (diffDays <= 90) {
      return { label: "Upcoming", variant: "secondary" as const, days: diffDays };
    }
    return null;
  };

  const allExpiringDocs = allRows
    .filter((row) => {
      if (!row.latestCheck?.expiryDate) return false;
      const status = getExpiryStatus(row.latestCheck.expiryDate);
      return status !== null;
    })
    .sort((a, b) => {
      const dateA = new Date(a.latestCheck!.expiryDate!);
      const dateB = new Date(b.latestCheck!.expiryDate!);
      return dateA.getTime() - dateB.getTime();
    });

  const handleViewExpiringDocs = () => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);

    setExpiryFrom(today.toISOString().split("T")[0]);
    setExpiryTo(futureDate.toISOString().split("T")[0]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
          <h1 className="text-3xl font-bold">Right-to-work cockpit</h1>
          <p className="text-muted-foreground mt-1">
            Monitor expiring documents, review flagged checks, and keep your German workforce compliant.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {import.meta.env.MODE !== "production" && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-demo"
            >
              <Database className="h-4 w-4 mr-2" />
              {seedMutation.isPending ? "Seeding..." : "Seed Demo Data"}
            </Button>
          )}
          <Link href="/help">
            <Button variant="outline" data-testid="button-help">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help & FAQ
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/api/audit/checks.csv";
            }}
            data-testid="button-export-checks"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Checks (CSV)
          </Button>
          <Link href="/employees/new">
            <Button data-testid="button-add-employee">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {totalEmployees === 0 && (!standaloneChecks || standaloneChecks.length === 0) && (
        <Card
          className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-background"
          data-testid="card-getting-started"
        >
          <CardHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Getting started with Certia</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Follow these steps to create your first right-to-work check
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Add an employee</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Start by adding employee details to your system
                  </p>
                  <Link href="/employees/new">
                    <Button size="sm" data-testid="button-getting-started-add-employee">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Employee
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Send them an upload link</h4>
                  <p className="text-sm text-muted-foreground">
                    After adding an employee, generate a secure upload link from their detail page. They can use this to submit their work authorization documents.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Review the check</h4>
                  <p className="text-sm text-muted-foreground">
                    Once documents are uploaded, Certia will automatically analyze them and display the results on your dashboard and employee pages.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all bg-gradient-to-br from-card to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Employees
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight" data-testid="text-total-employees">
              {totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active employee records</p>
          </CardContent>
        </Card>

        <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all bg-gradient-to-br from-card to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Eligible Workers
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight text-accent" data-testid="text-eligible-count">
              {eligibleCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Approved for work</p>
          </CardContent>
        </Card>

        <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all bg-gradient-to-br from-card to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Expiring Soon
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="text-4xl font-bold tracking-tight text-amber-600 dark:text-amber-500"
              data-testid="text-expiring-count"
            >
              {expiringSoon.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Documents expiring in 60 days</p>
          </CardContent>
        </Card>
      </div>

      <Card
        className={
          openCases.length > 0
            ? "border border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50 to-background shadow-md dark:from-amber-950/40 dark:via-amber-950/20"
            : "border border-border bg-gradient-to-br from-card to-background"
        }
      >
        <CardHeader className={openCases.length > 0 ? "border-b bg-amber-50/60 dark:bg-amber-950/20" : "border-b"}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div
                className={
                  openCases.length > 0
                    ? "h-10 w-10 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center"
                    : "h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center"
                }
              >
                {openCases.length > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Cases requiring review</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {openCases.length} open · {resolvedCases.length} resolved
                </p>
              </div>
            </div>
            {openCases.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleViewExpiringDocs} data-testid="button-view-expiring-docs">
                <Eye className="h-4 w-4 mr-2" />
                View expiring documents
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {casesRequiringReview.length === 0 && (
            <div className="flex items-center gap-3 text-muted-foreground p-4 bg-muted/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-accent" />
              <p className="text-sm">No checks currently require manual review. You&apos;re all caught up.</p>
            </div>
          )}

          {openCases.length > 0 && (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Person</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Expiry</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openCases.map((row) => {
                    const check = row.latestCheck;
                    if (!check) return null;
                    const name = `${row.firstName} ${row.lastName}`.trim() || "Unnamed";
                    return (
                      <TableRow
                        key={check.id}
                        className="hover:bg-muted/50 transition-colors"
                        data-testid={`row-case-${check.id}`}
                      >
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>
                          <StatusBadge status={check.workStatus} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {check.expiryDate ? formatDate(check.expiryDate) : "—"}
                        </TableCell>
                        <TableCell className="flex flex-wrap gap-2">
                          <Link href={row.isStandalone ? `/checks/${check.id}` : `/employees/${row.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="button-transition"
                              data-testid={`button-view-case-${check.id}`}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="button-transition"
                            onClick={() => {
                              const checkId = check.id;
                              setResolvedCaseIds((prev) =>
                                prev.includes(checkId) ? prev : [...prev, checkId]
                              );
                            }}
                            data-testid={`button-mark-reviewed-${check.id}`}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            Mark reviewed
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {allExpiringDocs.length > 0 && (
            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-900 dark:text-amber-100">
                <p className="font-semibold mb-1">Attention Required</p>
                <p className="text-sm mb-2">
                  {allExpiringDocs.length} document{allExpiringDocs.length !== 1 ? "s" : ""} expiring within the next 90 days.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewExpiringDocs}
                  className="bg-white dark:bg-background"
                  data-testid="button-view-expiring-docs"
                >
                  View expiring documents
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card className="shadow-sm bg-gradient-to-br from-card to-background">
            <CardHeader className="border-b bg-muted/40">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-xl font-bold">Employees & Work Status</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage employee data and right-to-work checks
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-full"
                    data-testid="input-search"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-[150px]" data-testid="select-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="ELIGIBLE">Eligible</SelectItem>
                      <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
                      <SelectItem value="NOT_ELIGIBLE">Not Eligible</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="w-[180px]" data-testid="select-document-type">
                      <SelectValue placeholder="Document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All documents</SelectItem>
                      <SelectItem value="EU_BLUE_CARD">EU Blue Card</SelectItem>
                      <SelectItem value="EAT">Employment Authorization</SelectItem>
                      <SelectItem value="FIKTIONSBESCHEINIGUNG">Fiktionsbescheinigung</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={expiryFrom}
                      onChange={(e) => setExpiryFrom(e.target.value)}
                      className="w-[150px]"
                      placeholder="Expiry from"
                      data-testid="input-expiry-from"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={expiryTo}
                      onChange={(e) => setExpiryTo(e.target.value)}
                      className="w-[150px]"
                      placeholder="Expiry to"
                      data-testid="input-expiry-to"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearch("");
                      setStatus("");
                      setDocumentType("");
                      setExpiryFrom("");
                      setExpiryTo("");
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear filters
                  </Button>
                </div>
              </div>

              {allRows.length === 0 ? (
                <div className="text-center py-16 px-4 border rounded-lg">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">No checks found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Try adjusting your filters or adding a new employee.
                  </p>
                  <div className="flex justify-center">
                    <Link href="/employees/new">
                      <Button size="lg" data-testid="button-add-first-employee">
                        <Plus className="h-4 w-4 mr-2" />
                        Add employee
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full" data-testid="table-employees">
                    <thead className="border-b bg-muted/40">
                      <tr className="text-left">
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Document Type</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Expiry Date</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allRows.map((row) => {
                        const initials = `${row.firstName[0]}${row.lastName[0]}`.toUpperCase();
                        return (
                          <tr
                            key={row.id}
                            className="hover:bg-muted/40 transition-colors duration-150"
                            data-testid={`row-${row.isStandalone ? "candidate" : "employee"}-${row.id}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm" data-testid={`text-name-${row.id}`}>
                                      {row.firstName} {row.lastName}
                                    </span>
                                    {row.isStandalone && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">
                                        Candidate
                                      </span>
                                    )}
                                  </div>
                                  {row.dateOfBirth && (
                                    <div className="text-xs text-muted-foreground">
                                      Born {formatDate(row.dateOfBirth)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-mono text-foreground">
                                {row.latestCheck?.documentType.replace(/_/g, " ") || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {row.latestCheck ? (
                                <div className="flex items-center">
                                  <StatusBadge status={row.latestCheck.workStatus} />
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No check</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-mono tabular-nums">
                                {formatDate(row.latestCheck?.expiryDate)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Link href={row.isStandalone ? `/checks/${row.id}` : `/employees/${row.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="button-transition"
                                    data-testid={`button-view-${row.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {allExpiringDocs.length > 0 && (
          <div className="xl:col-span-1">
            <Card className="shadow-sm bg-gradient-to-br from-card to-background">
              <CardHeader className="border-b bg-amber-50/20 dark:bg-amber-950/5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Expiring Documents</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {allExpiringDocs.length} document{allExpiringDocs.length !== 1 ? "s" : ""} within 90 days
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {allExpiringDocs.slice(0, 5).map((row) => {
                    const check = row.latestCheck;
                    if (!check) return null;
                    const name = `${row.firstName} ${row.lastName}`.trim() || "Unnamed";
                    const expiryStatus = getExpiryStatus(check.expiryDate!);
                    if (!expiryStatus) return null;

                    const documentTypeLabels: Record<string, string> = {
                      EU_BLUE_CARD: "EU Blue Card",
                      EAT: "Employment Authorization",
                      FIKTIONSBESCHEINIGUNG: "Fiktionsbescheinigung",
                      OTHER: "Other",
                    };

                    return (
                      <div
                        key={check.id}
                        className="p-3 rounded-lg border hover:shadow-sm transition-all"
                        data-testid={`row-expiring-${check.id}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {documentTypeLabels[check.documentType] || check.documentType}
                            </p>
                          </div>
                          <Badge
                            variant={expiryStatus.variant}
                            className={
                              expiryStatus.variant === "destructive"
                                ? "bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-800 text-xs"
                                : expiryStatus.variant === "default"
                                ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800 text-xs"
                                : "bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 text-xs"
                            }
                            data-testid={`badge-expiry-status-${check.id}`}
                          >
                            {expiryStatus.days}d
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">{formatDate(check.expiryDate!)}</p>
                          <Link href={row.isStandalone ? `/checks/${check.id}` : `/employees/${row.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" data-testid={`button-view-expiring-${check.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {allExpiringDocs.length > 5 && (
                  <div className="mt-3 pt-3 border-t text-center">
                    <p className="text-xs text-muted-foreground">Showing 5 of {allExpiringDocs.length}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
