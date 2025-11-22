import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { employeeFormSchema } from "@shared/schema";
import type { z } from "zod";
import type { EmployeeWithChecks } from "@shared/schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

export default function EmployeeEdit() {
  const [, params] = useRoute("/employees/:id/edit");
  const employeeId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: employee, isLoading } = useQuery<EmployeeWithChecks>({
    queryKey: ["/api/employees", employeeId],
    enabled: !!employeeId,
  });

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        dateOfBirth: employee.dateOfBirth || "",
        notes: employee.notes || "",
      });
    }
  }, [employee, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      // Convert empty strings to undefined for optional fields
      const payload = {
        ...data,
        dateOfBirth: data.dateOfBirth || undefined,
      };
      return await apiRequest("PUT", `/api/employees/${employeeId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      setLocation(`/employees/${employeeId}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
    } catch (error) {
      console.error("Error updating employee:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Employee not found</p>
          <Link href="/employees">
            <Button variant="outline" className="mt-4">
              Back to Employees
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href={`/employees/${employeeId}`}>
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">
              Edit Employee
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      placeholder="John"
                      data-testid="input-first-name"
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      placeholder="Doe"
                      data-testid="input-last-name"
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...form.register("dateOfBirth")}
                    data-testid="input-date-of-birth"
                  />
                  {form.formState.errors.dateOfBirth && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.dateOfBirth.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder="Additional information about the employee..."
                    rows={4}
                    data-testid="input-notes"
                  />
                  {form.formState.errors.notes && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.notes.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-4 justify-end">
                  <Link href={`/employees/${employeeId}`}>
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
