import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Eye, Calendar } from "lucide-react";
import { Link } from "wouter";
import { formatDate } from "@/lib/dateUtils";
import type { Employee } from "@shared/schema";

export default function Employees() {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {employees.map((employee) => (
                <Card key={employee.id} className="hover-elevate" data-testid={`card-employee-${employee.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span data-testid={`text-employee-name-${employee.id}`}>
                        {employee.firstName} {employee.lastName}
                      </span>
                      <Link href={`/employees/${employee.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-${employee.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {employee.dateOfBirth && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Born:</span>
                        <span className="font-mono">{formatDate(employee.dateOfBirth)}</span>
                      </div>
                    )}
                    {employee.notes && (
                      <div className="text-sm text-muted-foreground">
                        <p className="line-clamp-2">{employee.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/checks/new?employeeId=${employee.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full" data-testid={`button-add-check-${employee.id}`}>
                          Add Check
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
