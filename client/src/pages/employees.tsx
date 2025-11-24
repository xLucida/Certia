import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Eye, Calendar, ArrowUpDown, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "wouter";
import { formatDate } from "@/lib/dateUtils";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import type { EmployeeWithChecks } from "@shared/schema";
import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SortField = 'name' | 'status' | 'expiry';
type SortDirection = 'asc' | 'desc';

export default function Employees() {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const { data: employees, isLoading } = useQuery<EmployeeWithChecks[]>({
    queryKey: ["/api/employees"],
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getLatestCheck = (employee: EmployeeWithChecks) => {
    if (!employee.checks || employee.checks.length === 0) return null;
    return employee.checks.sort((a: any, b: any) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    )[0];
  };

  const sortedEmployees = useMemo(() => {
    if (!employees) return [];
    
    const sorted = [...employees].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case 'status': {
          const aCheck = getLatestCheck(a);
          const bCheck = getLatestCheck(b);
          const aStatus = aCheck?.workStatus || 'ZZZZZ';
          const bStatus = bCheck?.workStatus || 'ZZZZZ';
          comparison = aStatus.localeCompare(bStatus);
          break;
        }
        case 'expiry': {
          const aCheck = getLatestCheck(a);
          const bCheck = getLatestCheck(b);
          const aExpiry = aCheck?.expiryDate || '9999-12-31';
          const bExpiry = bCheck?.expiryDate || '9999-12-31';
          comparison = aExpiry.localeCompare(bExpiry);
          break;
        }
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [employees, sortField, sortDirection]);

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 60 && daysUntilExpiry > 0;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Employees</h1>
            <Link href="/employees/new">
              <Button data-testid="button-add-employee">
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </Link>
          </div>

          {!employees || employees.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Employees Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Get started by adding your first employee to the system
                  </p>
                  <Link href="/employees/new">
                    <Button data-testid="button-add-first-employee">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Employee
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-2 hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2"
                          data-testid="button-sort-name"
                        >
                          <span className="font-semibold">Name</span>
                          {sortField === 'name' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-40" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-2 hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2"
                          data-testid="button-sort-status"
                        >
                          <span className="font-semibold">Status</span>
                          {sortField === 'status' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-40" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('expiry')}
                          className="flex items-center gap-2 hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2"
                          data-testid="button-sort-expiry"
                        >
                          <span className="font-semibold">Expiry</span>
                          {sortField === 'expiry' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-40" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEmployees.map((employee) => {
                      const latestCheck = getLatestCheck(employee);
                      const expiryWarning = latestCheck?.expiryDate && isExpiringSoon(latestCheck.expiryDate);
                      
                      return (
                        <TableRow 
                          key={employee.id} 
                          className="hover-elevate"
                          data-testid={`row-employee-${employee.id}`}
                        >
                          <TableCell className="font-medium">
                            <div>
                              <Link href={`/employees/${employee.id}`}>
                                <span className="hover:underline cursor-pointer" data-testid={`text-employee-name-${employee.id}`}>
                                  {employee.firstName} {employee.lastName}
                                </span>
                              </Link>
                              {latestCheck ? (
                                <div className="text-xs text-muted-foreground mt-1" data-testid={`text-employee-summary-${employee.id}`}>
                                  Last check: {latestCheck.workStatus.replace(/_/g, " ")}
                                  {latestCheck.documentType && ` — ${
                                    latestCheck.documentType === "EU_BLUE_CARD" ? "EU Blue Card" :
                                    latestCheck.documentType === "EAT" ? "Employment Authorization" :
                                    latestCheck.documentType === "FIKTIONSBESCHEINIGUNG" ? "Fiktionsbescheinigung" :
                                    latestCheck.documentType
                                  }`}
                                  {latestCheck.expiryDate && `, expires ${formatDate(latestCheck.expiryDate)}`}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mt-1" data-testid={`text-employee-summary-${employee.id}`}>
                                  No right-to-work checks yet
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {'email' in employee ? employee.email : '—'}
                          </TableCell>
                          <TableCell>
                            {latestCheck ? (
                              <StatusBadge status={latestCheck.workStatus} />
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                No Check
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {latestCheck?.expiryDate ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {formatDate(latestCheck.expiryDate)}
                                </span>
                                {expiryWarning && (
                                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/employees/${employee.id}`}>
                                <Button variant="ghost" size="sm" data-testid={`button-view-${employee.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <Link href={`/checks/new?employeeId=${employee.id}`}>
                                <Button variant="outline" size="sm" data-testid={`button-add-check-${employee.id}`}>
                                  Add Check
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
    </div>
  );
}
