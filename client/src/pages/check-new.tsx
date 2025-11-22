import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { checkFormSchema, documentTypes } from "@shared/schema";
import { formatDocumentType } from "@/lib/workEligibilityUtils";
import type { z } from "zod";
import type { Employee } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import { ArrowLeft, FileText, Upload, UserPlus, Users, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";

type CheckFormData = z.infer<typeof checkFormSchema>;

interface OcrExtractionResult {
  rawText: string;
  documentTypeGuess?: 'EU_BLUE_CARD' | 'EAT' | 'FIKTIONSBESCHEINIGUNG' | 'OTHER';
  documentNumberGuess?: string;
  expiryDateGuessIso?: string;
  employerNameGuess?: string;
  employmentPermissionGuess?: 'ANY_EMPLOYMENT_ALLOWED' | 'RESTRICTED' | 'UNKNOWN';
  error?: string;
  message?: string;
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
  const [ocrUsed, setOcrUsed] = useState(false);
  const [ocrConfirmed, setOcrConfirmed] = useState(false);
  const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);
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
        // Include OCR audit trail if OCR was used
        ocrRawText: ocrResult?.rawText,
        ocrExtractedFields: ocrResult ? {
          documentTypeGuess: ocrResult.documentTypeGuess,
          documentNumberGuess: ocrResult.documentNumberGuess,
          expiryDateGuessIso: ocrResult.expiryDateGuessIso,
          employerNameGuess: ocrResult.employerNameGuess,
          employmentPermissionGuess: ocrResult.employmentPermissionGuess,
        } : undefined,
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

      // Handle error responses (4xx, 5xx)
      if (!response.ok || result.error) {
        const errorMessage = result.message || result.error || "Failed to process document";
        setOcrError(errorMessage);
        toast({
          title: "OCR failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Success: check if any fields were extracted
      const autofilled = new Set<string>();
      if (result.documentTypeGuess) {
        form.setValue('documentType', result.documentTypeGuess);
        autofilled.add('documentType');
      }
      if (result.documentNumberGuess) {
        form.setValue('documentNumber', result.documentNumberGuess);
        autofilled.add('documentNumber');
      }
      if (result.expiryDateGuessIso) {
        form.setValue('expiryDate', result.expiryDateGuessIso);
        autofilled.add('expiryDate');
      }

      const fieldsFound = [
        result.documentTypeGuess && 'document type',
        result.documentNumberGuess && 'document number',
        result.expiryDateGuessIso && 'expiry date',
      ].filter(Boolean);

      if (fieldsFound.length > 0) {
        setOcrAutofilled(true);
        setOcrUsed(true); // Only set to true when fields were actually extracted
        setAutofilledFields(autofilled);
        setOcrResult(result);
        toast({
          title: "Fields auto-filled",
          description: `Found: ${fieldsFound.join(', ')}. Please review and correct if needed.`,
        });
      } else {
        // Don't set ocrUsed to true if no fields were extracted
        setOcrResult(result);
        toast({
          title: "OCR completed",
          description: "No fields could be extracted. Please enter details manually.",
        });
      }
    } catch (error) {
      console.error('OCR extraction error:', error);
      const errorMessage = "Network error. Please check your connection and try again.";
      setOcrError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsOcrProcessing(false);
      // Clear the file input so the same file can be uploaded again
      event.target.value = '';
    }
  };

  const onSubmit = async (data: CheckFormData) => {
    setIsSubmitting(true);
    await createMutation.mutateAsync(data);
    setIsSubmitting(false);
  };

  const currentStep = !uploadedFileUrl ? 1 : !ocrConfirmed && ocrAutofilled ? 2 : 2;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/employees">
              <Button variant="ghost" size="sm" className="button-transition" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">New Right-to-Work Check</h1>
          </div>

          <div className="flex items-center justify-between max-w-2xl mx-auto py-4">
            <div className="flex flex-col items-center gap-2.5 flex-1">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep >= 1 ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/25' : 'bg-muted border-muted-foreground/20 text-muted-foreground'}`}>
                <Upload className="h-6 w-6" />
              </div>
              <span className={`text-sm font-semibold transition-colors ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>Upload</span>
            </div>
            <div className={`h-1 flex-1 mx-4 rounded-full transition-all duration-500 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className="flex flex-col items-center gap-2.5 flex-1">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep >= 2 ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/25' : 'bg-muted border-muted-foreground/20 text-muted-foreground'}`}>
                <FileText className="h-6 w-6" />
              </div>
              <span className={`text-sm font-semibold transition-colors ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>Review</span>
            </div>
            <div className={`h-1 flex-1 mx-4 rounded-full transition-all duration-500 ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className="flex flex-col items-center gap-2.5 flex-1">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep >= 3 ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/25' : 'bg-muted border-muted-foreground/20 text-muted-foreground'}`}>
                <CheckCircle className="h-6 w-6" />
              </div>
              <span className={`text-sm font-semibold transition-colors ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>Confirm</span>
            </div>
          </div>

          <Card className="border-2 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-xl">Check Details</CardTitle>
              <CardDescription>
                Perform a right-to-work check for a new candidate or existing employee
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-8 p-6 border-2 border-primary/20 rounded-xl bg-gradient-to-br from-primary/5 to-background shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-base font-bold">Step 1: Upload Document</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Upload your visa document to automatically extract key fields. We'll analyze it and pre-fill the form below.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleOcrFileUpload}
                        disabled={isOcrProcessing}
                        className="max-w-sm"
                        data-testid="input-ocr-file"
                      />
                      {isOcrProcessing && (
                        <p className="text-sm text-muted-foreground">Processing...</p>
                      )}
                    </div>

                    {ocrAutofilled && (
                      <Alert className="bg-primary/5 border-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-sm">
                          Fields auto-filled from document scan. Please review and correct if needed.
                        </AlertDescription>
                      </Alert>
                    )}

                    {ocrError && (
                      <Alert className="bg-muted border-muted-foreground/20">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {ocrError}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                <h3 className="text-base font-bold mb-2">Step 2: Review & Corrections</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Review the auto-filled fields below and make corrections as needed. Fields marked with ✨ were extracted from your document.
                </p>
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
                  <div className="flex items-center gap-2">
                    <Label>
                      Document Type <span className="text-destructive">*</span>
                    </Label>
                    {autofilledFields.has('documentType') && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Auto-filled from scan
                      </span>
                    )}
                  </div>
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
                  <div className="flex items-center gap-2">
                    <Label htmlFor="documentNumber">Document Number</Label>
                    {autofilledFields.has('documentNumber') && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Auto-filled from scan
                      </span>
                    )}
                  </div>
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
                    <div className="flex items-center gap-2">
                      <Label htmlFor="expiryDate">
                        Expiry Date <span className="text-destructive">*</span>
                      </Label>
                      {autofilledFields.has('expiryDate') && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Auto-filled from scan
                        </span>
                      )}
                    </div>
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

                {ocrUsed && (
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                    <Checkbox
                      id="ocrConfirmation"
                      checked={ocrConfirmed}
                      onCheckedChange={(checked) => setOcrConfirmed(checked as boolean)}
                      data-testid="checkbox-ocr-confirmation"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="ocrConfirmation" className="cursor-pointer font-normal">
                        I've reviewed the auto-filled values against the document <span className="text-destructive">*</span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Please verify that the extracted information matches your document before submitting.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 justify-end pt-4">
                  <Link href="/employees">
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || (ocrUsed && !ocrConfirmed)}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? "Creating..." : "Create Check"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
