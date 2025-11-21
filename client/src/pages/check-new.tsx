import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { checkFormSchema, documentTypes } from "@shared/schema";
import { formatDocumentType } from "@/lib/workEligibilityUtils";
import type { z } from "zod";
import type { Employee } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import { ArrowLeft, FileText, Upload, UserPlus, Users, Sparkles, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";

type CheckFormData = z.infer<typeof checkFormSchema>;

interface OcrExtractionResult {
  rawText: string;
  documentTypeGuess?: 'EU_BLUE_CARD' | 'EAT' | 'FIKTIONSBESCHEINIGUNG' | 'OTHER';
  documentNumberGuess?: string;
  expiryDateGuessIso?: string;
  error?: string;
}

export default function CheckNew() {
  const [, setLocationPath] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [checkType, setCheckType] = useState<"new" | "existing">("new");
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrAutofilled, setOcrAutofilled] = useState(false);
  const [ocrError, setOcrError] = useState<string>("");
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
      setCheckType("existing");
    }
  }, [preselectedEmployeeId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: CheckFormData) => {
      // Validate based on check type
      if (checkType === "new" && (!data.firstName || !data.lastName)) {
        throw new Error("First name and last name are required for new candidates");
      }
      if (checkType === "existing" && !data.employeeId) {
        throw new Error("Please select an employee");
      }

      const payload = {
        ...data,
        // Convert empty strings to undefined for optional fields
        dateOfIssue: data.dateOfIssue || undefined,
        documentNumber: data.documentNumber || undefined,
        countryOfIssue: data.countryOfIssue || undefined,
        fileUrl: uploadedFileUrl || undefined,
        // Only include fields relevant to the check type
        employeeId: checkType === "existing" ? data.employeeId : undefined,
        firstName: checkType === "new" ? data.firstName : undefined,
        lastName: checkType === "new" ? data.lastName : undefined,
      };
      return await apiRequest("POST", "/api/checks", payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      if (variables.employeeId) {
        queryClient.invalidateQueries({ queryKey: ["/api/employees", variables.employeeId] });
      } else {
        // Invalidate standalone checks when creating a new candidate check
        queryClient.invalidateQueries({ queryKey: ["/api/checks/standalone"] });
      }
      toast({
        title: "Success",
        description: "Right-to-work check created successfully",
      });
      // Redirect to dashboard for standalone checks, employee page for linked checks
      if (variables.employeeId) {
        setLocationPath(`/employees/${variables.employeeId}`);
      } else {
        setLocationPath("/");
      }
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
        description: error.message || "Failed to create check. Please try again.",
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

  const handleOcrFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    setOcrError("");
    setOcrAutofilled(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result: OcrExtractionResult = await response.json();

      if (result.error) {
        setOcrError(result.error);
        toast({
          title: "OCR unavailable",
          description: result.error,
          variant: "default",
        });
      } else {
        if (result.documentTypeGuess) {
          form.setValue('documentType', result.documentTypeGuess);
        }
        if (result.documentNumberGuess) {
          form.setValue('documentNumber', result.documentNumberGuess);
        }
        if (result.expiryDateGuessIso) {
          form.setValue('expiryDate', result.expiryDateGuessIso);
        }

        const fieldsFound = [
          result.documentTypeGuess && 'document type',
          result.documentNumberGuess && 'document number',
          result.expiryDateGuessIso && 'expiry date',
        ].filter(Boolean);

        if (fieldsFound.length > 0) {
          setOcrAutofilled(true);
          toast({
            title: "Fields auto-filled",
            description: `Found: ${fieldsFound.join(', ')}. Please review and correct if needed.`,
          });
        } else {
          toast({
            title: "OCR completed",
            description: "No fields could be extracted. Please enter details manually.",
          });
        }
      }
    } catch (error) {
      console.error('OCR extraction error:', error);
      setOcrError("OCR extraction failed. Please enter details manually.");
      toast({
        title: "Error",
        description: "Failed to process document. Please enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsOcrProcessing(false);
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
              <CardDescription>
                Perform a right-to-work check for a new candidate or existing employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 border-2 border-dashed rounded-lg bg-muted/30">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-medium">Smart Document Scan (Optional)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload your visa document to auto-fill form fields using OCR. You can review and edit the results before submitting.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleOcrFileUpload}
                        disabled={isOcrProcessing}
                        className="max-w-xs"
                        data-testid="input-ocr-file"
                      />
                      {isOcrProcessing && (
                        <p className="text-xs text-muted-foreground">Processing...</p>
                      )}
                    </div>

                    {ocrAutofilled && (
                      <Alert className="bg-primary/5 border-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-xs">
                          Fields auto-filled from document scan. Please review and correct if needed.
                        </AlertDescription>
                      </Alert>
                    )}

                    {ocrError && (
                      <Alert className="bg-muted border-muted-foreground/20">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {ocrError}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs value={checkType} onValueChange={(value) => setCheckType(value as "new" | "existing")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="new" data-testid="tab-new-candidate">
                      <UserPlus className="h-4 w-4 mr-2" />
                      New Candidate
                    </TabsTrigger>
                    <TabsTrigger value="existing" data-testid="tab-existing-employee">
                      <Users className="h-4 w-4 mr-2" />
                      Existing Employee
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="new" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">
                          First Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="firstName"
                          {...form.register("firstName")}
                          placeholder="e.g., John"
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
                          placeholder="e.g., Doe"
                          data-testid="input-last-name"
                        />
                        {form.formState.errors.lastName && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="existing" className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">
                        Select Employee <span className="text-destructive">*</span>
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
                  </TabsContent>
                </Tabs>

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
