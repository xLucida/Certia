import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { checkFormSchema, documentTypes } from "@shared/schema";
import { formatDocumentType } from "@/lib/workEligibilityUtils";
import type { z } from "zod";
import type { Employee } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import { Link } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";

type CheckFormData = z.infer<typeof checkFormSchema>;

export default function CheckNew() {
  const [, setLocationPath] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedEmployeeId = searchParams.get("employeeId");

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const form = useForm<CheckFormData>({
    resolver: zodResolver(checkFormSchema),
    defaultValues: {
      employeeId: preselectedEmployeeId || "",
      documentType: "EU_BLUE_CARD",
      documentNumber: "",
      countryOfIssue: "",
      dateOfIssue: "",
      expiryDate: "",
      fileUrl: "",
    },
  });

  useEffect(() => {
    if (preselectedEmployeeId) {
      form.setValue("employeeId", preselectedEmployeeId);
    }
  }, [preselectedEmployeeId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: CheckFormData) => {
      const payload = {
        ...data,
        fileUrl: uploadedFileUrl || undefined,
      };
      return await apiRequest("POST", "/api/checks", payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", variables.employeeId] });
      toast({
        title: "Success",
        description: "Right-to-work check created successfully",
      });
      setLocationPath(`/employees/${variables.employeeId}`);
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
        description: "Failed to create check. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest<{ uploadURL: string }>("POST", "/api/objects/upload", {});
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        try {
          const response = await apiRequest<{ objectPath: string }>("PUT", "/api/documents", {
            documentURL: uploadURL,
          });
          setUploadedFileUrl(response.objectPath);
          toast({
            title: "Upload successful",
            description: "Document uploaded successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to process uploaded document",
            variant: "destructive",
          });
        }
      }
    }
  };

  const onSubmit = async (data: CheckFormData) => {
    setIsSubmitting(true);
    await createMutation.mutateAsync(data);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/employees">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">New Right-to-Work Check</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Check Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">
                    Employee <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.watch("employeeId")}
                    onValueChange={(value) => form.setValue("employeeId", value)}
                  >
                    <SelectTrigger data-testid="select-employee">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((employee) => (
                        <SelectItem 
                          key={employee.id} 
                          value={employee.id}
                          data-testid={`option-employee-${employee.id}`}
                        >
                          {employee.firstName} {employee.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.employeeId && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.employeeId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>
                    Document Type <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup
                    value={form.watch("documentType")}
                    onValueChange={(value) => form.setValue("documentType", value as any)}
                    className="grid grid-cols-1 gap-3"
                  >
                    {documentTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value={type} 
                          id={type}
                          data-testid={`radio-${type.toLowerCase()}`}
                        />
                        <Label 
                          htmlFor={type} 
                          className="font-normal cursor-pointer flex-1"
                        >
                          {formatDocumentType(type)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {form.formState.errors.documentType && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.documentType.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentNumber">Document Number</Label>
                  <Input
                    id="documentNumber"
                    {...form.register("documentNumber")}
                    placeholder="e.g., AB123456"
                    className="font-mono"
                    data-testid="input-document-number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="countryOfIssue">Country of Issue</Label>
                  <Input
                    id="countryOfIssue"
                    {...form.register("countryOfIssue")}
                    placeholder="e.g., Germany"
                    data-testid="input-country"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfIssue">Date of Issue</Label>
                    <Input
                      id="dateOfIssue"
                      type="date"
                      {...form.register("dateOfIssue")}
                      data-testid="input-date-of-issue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">
                      Expiry Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      {...form.register("expiryDate")}
                      data-testid="input-expiry-date"
                    />
                    {form.formState.errors.expiryDate && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.expiryDate.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Upload Document</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {uploadedFileUrl ? "Document uploaded successfully" : "Upload visa or work permit document"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF or Image (JPG, PNG) up to 10MB
                      </p>
                    </div>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonVariant={uploadedFileUrl ? "secondary" : "outline"}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadedFileUrl ? "Replace Document" : "Choose File"}
                    </ObjectUploader>
                  </div>
                </div>

                <div className="flex gap-4 justify-end pt-4">
                  <Link href="/employees">
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? "Creating..." : "Create Check"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
