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
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { checkFormSchema, documentTypes } from "@shared/schema";
import { formatDocumentType } from "@/lib/workEligibilityUtils";
import type { z } from "zod";
import type { Employee } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import { ArrowLeft, FileText, Upload, UserPlus, Users, Sparkles, AlertCircle, CheckCircle, Lightbulb, ClipboardCheck, Star, Trash2, Plus, RotateCcw, File } from "lucide-react";
import { Link } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

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

interface UploadedDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: string;
  isPrimary: boolean;
  status: 'uploading' | 'uploaded' | 'error';
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
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedEmployeeId = searchParams.get("employeeId");

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  // Get the selected employee details when coming from Employee detail page
  const selectedEmployee = employees?.find(emp => emp.id === preselectedEmployeeId);

  const form = useForm<CheckFormData>({
    resolver: zodResolver(checkFormSchema),
    defaultValues: {
      employeeId: preselectedEmployeeId || "",
      documentType: "EU_BLUE_CARD",
      documentNumber: "",
      countryOfIssue: "",
      dateOfIssue: "",
      expiryDate: "",
      employerName: "",
      employmentPermission: undefined,
      fileUrl: "",
    },
  });

  useEffect(() => {
    if (preselectedEmployeeId) {
      form.setValue("employeeId", preselectedEmployeeId);
      setCheckType("existing");
    }
  }, [preselectedEmployeeId, form]);

  // Preview mutation for live decision evaluation (no DB write)
  const [previewResult, setPreviewResult] = useState<{
    workStatus: string;
    decisionSummary: string;
    decisionDetails: string[];
  } | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (data: {
      documentType: string;
      expiryDate: string;
      dateOfIssue?: string;
      ocrRawText?: string;
      ocrExtractedFields?: any;
    }) => {
      const response = await apiRequest("POST", "/api/checks/preview", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setPreviewResult(data);
    },
    onError: (error: Error) => {
      console.error("Preview error:", error);
      setPreviewResult(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CheckFormData) => {
      // Validate based on check type
      if (checkType === "new" && (!data.firstName || !data.lastName)) {
        throw new Error("First name and last name are required for new candidates");
      }
      if (checkType === "existing" && !data.employeeId) {
        throw new Error("Please select an employee");
      }

      // Get primary document URL
      const primaryDoc = documents.find(d => d.isPrimary && d.status === 'uploaded');

      const payload = {
        ...data,
        // Convert empty strings to undefined for optional fields
        dateOfIssue: data.dateOfIssue || undefined,
        documentNumber: data.documentNumber || undefined,
        countryOfIssue: data.countryOfIssue || undefined,
        fileUrl: primaryDoc?.fileUrl || undefined,
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
      
      // Create the check
      const response = await apiRequest("POST", "/api/checks", payload);
      const check = await response.json() as { id: string };
      
      // Save all documents to the check
      const uploadedDocs = documents.filter(d => d.status === 'uploaded');
      for (const doc of uploadedDocs) {
        try {
          await apiRequest("POST", `/api/checks/${check.id}/documents`, {
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            isPrimary: doc.isPrimary,
          });
        } catch (err) {
          console.error('Failed to save document:', doc.fileName, err);
        }
      }
      
      return { checkId: check.id, employeeId: data.employeeId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      if (result.employeeId) {
        queryClient.invalidateQueries({ queryKey: ["/api/employees", result.employeeId] });
      } else {
        // Invalidate standalone checks when creating a new candidate check
        queryClient.invalidateQueries({ queryKey: ["/api/checks/standalone"] });
      }
      const docCount = documents.filter(d => d.status === 'uploaded').length;
      toast({
        title: "Success",
        description: `Right-to-work check created with ${docCount} document${docCount !== 1 ? 's' : ''}.`,
      });
      // Redirect to dashboard for standalone checks, employee page for linked checks
      if (result.employeeId) {
        setLocationPath(`/employees/${result.employeeId}`);
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
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json() as { uploadURL: string };
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        try {
          const response = await apiRequest("PUT", "/api/documents", {
            documentURL: uploadURL,
          });
          const data = await response.json() as { objectPath: string };
          setUploadedFileUrl(data.objectPath);
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

    // Generate a temporary ID for this document
    const tempId = crypto.randomUUID();
    const isFirstDocument = documents.length === 0;
    
    // Add document to list immediately with 'uploading' status
    const newDoc: UploadedDocument = {
      id: tempId,
      fileName: file.name,
      fileUrl: '',
      mimeType: file.type,
      sizeBytes: file.size.toString(),
      isPrimary: isFirstDocument, // First document is automatically primary
      status: 'uploading',
    };
    setDocuments(prev => [...prev, newDoc]);

    // Only run OCR for primary document (first upload or when re-running)
    const shouldRunOcr = isFirstDocument;
    
    if (shouldRunOcr) {
      setIsOcrProcessing(true);
      setOcrError("");
      setOcrAutofilled(false);
    }

    try {
      // Step 1: Upload the document for storage
      let objectPath = '';
      try {
        const uploadParamsResponse = await apiRequest("POST", "/api/objects/upload", {});
        const uploadParams = await uploadParamsResponse.json() as { uploadURL: string };
        
        const uploadResponse = await fetch(uploadParams.uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (uploadResponse.ok) {
          const documentResponse = await apiRequest("PUT", "/api/documents", {
            documentURL: uploadParams.uploadURL,
          });
          const documentData = await documentResponse.json() as { objectPath: string };
          objectPath = documentData.objectPath;
          
          // Update document in list with uploaded URL
          setDocuments(prev => prev.map(d => 
            d.id === tempId 
              ? { ...d, fileUrl: objectPath, status: 'uploaded' as const }
              : d
          ));
          
          // Set form fileUrl for primary document
          if (isFirstDocument) {
            setUploadedFileUrl(objectPath);
            form.setValue('fileUrl', objectPath);
          }
          
          toast({
            title: "Document uploaded",
            description: `${file.name} uploaded successfully`,
          });
        } else {
          throw new Error('Upload failed');
        }
      } catch (uploadError) {
        console.error('Document upload failed:', uploadError);
        setDocuments(prev => prev.map(d => 
          d.id === tempId ? { ...d, status: 'error' as const } : d
        ));
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
        return;
      }

      // Step 2: Run OCR only on primary document
      if (shouldRunOcr) {
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
          // Don't block - document is still uploaded
        } else {
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
          if (result.employerNameGuess) {
            form.setValue('employerName', result.employerNameGuess);
            autofilled.add('employerName');
          }
          if (result.employmentPermissionGuess) {
            form.setValue('employmentPermission', result.employmentPermissionGuess);
            autofilled.add('employmentPermission');
          }

          const fieldsFound = [
            result.documentTypeGuess && 'document type',
            result.documentNumberGuess && 'document number',
            result.expiryDateGuessIso && 'expiry date',
            result.employerNameGuess && 'employer name',
            result.employmentPermissionGuess && 'employment permission',
          ].filter(Boolean);

          if (fieldsFound.length > 0) {
            setOcrAutofilled(true);
            setOcrUsed(true);
            setAutofilledFields(autofilled);
            setOcrResult(result);
            toast({
              title: "Fields auto-filled",
              description: `Found: ${fieldsFound.join(', ')}. Please review and correct if needed.`,
            });
          } else {
            setOcrResult(result);
          }
        }
      }
    } catch (error) {
      console.error('Document processing error:', error);
      setDocuments(prev => prev.map(d => 
        d.id === tempId ? { ...d, status: 'error' as const } : d
      ));
    } finally {
      if (shouldRunOcr) {
        setIsOcrProcessing(false);
      }
      event.target.value = '';
    }
  };

  // Handle removing a document from the list
  const handleRemoveDocument = (docId: string) => {
    setDocuments(prev => {
      const updated = prev.filter(d => d.id !== docId);
      // If we removed the primary, make the first remaining one primary
      if (updated.length > 0 && !updated.some(d => d.isPrimary)) {
        updated[0].isPrimary = true;
        setUploadedFileUrl(updated[0].fileUrl);
        form.setValue('fileUrl', updated[0].fileUrl);
      } else if (updated.length === 0) {
        setUploadedFileUrl('');
        form.setValue('fileUrl', '');
      }
      return updated;
    });
  };

  // Handle setting a document as primary
  const handleSetPrimary = async (docId: string) => {
    setDocuments(prev => {
      const updated = prev.map(d => ({
        ...d,
        isPrimary: d.id === docId,
      }));
      const primary = updated.find(d => d.isPrimary);
      if (primary) {
        setUploadedFileUrl(primary.fileUrl);
        form.setValue('fileUrl', primary.fileUrl);
      }
      return updated;
    });
    toast({
      title: "Primary document changed",
      description: "You can re-run OCR extraction on this document if needed.",
    });
  };

  // Handle re-running OCR on a specific document
  const handleRerunOcr = async (doc: UploadedDocument) => {
    if (!doc.fileUrl || doc.status !== 'uploaded') return;
    
    setIsOcrProcessing(true);
    setOcrError("");
    
    try {
      // Fetch the document and run OCR
      const fileResponse = await fetch(doc.fileUrl, { credentials: 'include' });
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch document');
      }
      
      const blob = await fileResponse.blob();
      
      const formData = new FormData();
      formData.append('file', blob, doc.fileName);

      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result: OcrExtractionResult = await response.json();

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

      // Apply extracted fields
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
      if (result.employerNameGuess) {
        form.setValue('employerName', result.employerNameGuess);
        autofilled.add('employerName');
      }
      if (result.employmentPermissionGuess) {
        form.setValue('employmentPermission', result.employmentPermissionGuess);
        autofilled.add('employmentPermission');
      }

      const fieldsFound = [
        result.documentTypeGuess && 'document type',
        result.documentNumberGuess && 'document number',
        result.expiryDateGuessIso && 'expiry date',
        result.employerNameGuess && 'employer name',
        result.employmentPermissionGuess && 'employment permission',
      ].filter(Boolean);

      if (fieldsFound.length > 0) {
        setOcrAutofilled(true);
        setOcrUsed(true);
        setAutofilledFields(autofilled);
        setOcrResult(result);
        toast({
          title: "Fields updated",
          description: `Found: ${fieldsFound.join(', ')}. Please review and correct if needed.`,
        });
      } else {
        toast({
          title: "OCR completed",
          description: "No fields could be extracted from this document.",
        });
      }
    } catch (error) {
      console.error('OCR re-run error:', error);
      toast({
        title: "Error",
        description: "Failed to process document. Please try again.",
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

  // Step logic: 1=Upload, 2=Review/Fill form, 3=Ready to confirm
  const documentType = form.watch("documentType");
  const expiryDate = form.watch("expiryDate");
  const firstName = form.watch("firstName");
  const lastName = form.watch("lastName");
  const employeeId = form.watch("employeeId");
  const dateOfIssue = form.watch("dateOfIssue");

  // Auto-trigger preview when required fields are filled
  useEffect(() => {
    if (documentType && expiryDate) {
      previewMutation.mutate({
        documentType,
        expiryDate,
        dateOfIssue: dateOfIssue || undefined,
        ocrRawText: ocrResult?.rawText,
        ocrExtractedFields: ocrResult ? {
          documentTypeGuess: ocrResult.documentTypeGuess,
          documentNumberGuess: ocrResult.documentNumberGuess,
          expiryDateGuessIso: ocrResult.expiryDateGuessIso,
          employerNameGuess: ocrResult.employerNameGuess,
          employmentPermissionGuess: ocrResult.employmentPermissionGuess,
        } : undefined,
      });
    } else {
      setPreviewResult(null);
    }
  }, [documentType, expiryDate, dateOfIssue, ocrResult]);
  
  // Check if user has started filling the form (beyond default values)
  const hasStartedFillingForm = (checkType === "new" && (firstName || lastName))
    || (checkType === "existing" && employeeId && employeeId !== preselectedEmployeeId)
    || expiryDate;
  
  // Step 3 is reached when required fields are filled
  const hasRequiredFields = checkType === "new" 
    ? firstName && lastName && documentType && expiryDate
    : employeeId && documentType && expiryDate;
  
  // Preview can show as soon as we have document details (regardless of employee info)
  const canShowPreview = documentType && expiryDate;
  
  // Step progression:
  // Step 1: Initial state - no upload and no form started
  // Step 2: File uploaded OR user has started filling form
  // Step 3: All required fields filled and ready to submit
  const hasDocuments = documents.some(d => d.status === 'uploaded');
  const currentStep = hasRequiredFields ? 3 
    : (ocrAutofilled || ocrUsed || hasDocuments || hasStartedFillingForm) ? 2 
    : 1;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <PageHeader
          kicker="New"
          title="Right-to-work check"
          description={
            selectedEmployee
              ? `Creating a new right-to-work check for ${selectedEmployee.firstName} ${selectedEmployee.lastName}`
              : "Upload a document, review extracted information, and create a compliance check"
          }
          icon={<ClipboardCheck className="h-5 w-5" />}
        />

        <div className="flex items-center justify-between py-4">
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

        <Card>
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
                      <p className="text-base font-bold">Step 1: Upload Documents</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Upload visa documents to automatically extract key fields. The first document will be used for OCR extraction.
                      </p>
                    </div>
                    
                    {/* Document list */}
                    {documents.length > 0 && (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div 
                            key={doc.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-background hover-elevate"
                            data-testid={`document-row-${doc.id}`}
                          >
                            <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.status === 'uploading' ? 'Uploading...' : 
                                 doc.status === 'error' ? 'Upload failed' : 
                                 `${(parseInt(doc.sizeBytes) / 1024).toFixed(1)} KB`}
                              </p>
                            </div>
                            {doc.isPrimary && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                                Primary
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              {!doc.isPrimary && doc.status === 'uploaded' && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSetPrimary(doc.id)}
                                  title="Set as primary document"
                                  data-testid={`button-set-primary-${doc.id}`}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              )}
                              {doc.status === 'uploaded' && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRerunOcr(doc)}
                                  disabled={isOcrProcessing}
                                  title="Re-run OCR extraction"
                                  data-testid={`button-rerun-ocr-${doc.id}`}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveDocument(doc.id)}
                                title="Remove document"
                                data-testid={`button-remove-doc-${doc.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add document button */}
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer">
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleOcrFileUpload}
                          disabled={isOcrProcessing}
                          className="hidden"
                          data-testid="input-ocr-file"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isOcrProcessing}
                          asChild
                        >
                          <span>
                            <Plus className="h-4 w-4 mr-2" />
                            {documents.length === 0 ? 'Upload Document' : 'Add Another Document'}
                          </span>
                        </Button>
                      </label>
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
                {preselectedEmployeeId ? (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Creating check for</p>
                        <p className="text-lg font-semibold">
                          {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : 'Employee'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="employerName">Employer Name</Label>
                      {autofilledFields.has('employerName') && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Auto-filled from scan
                        </span>
                      )}
                    </div>
                    <Input
                      id="employerName"
                      {...form.register("employerName")}
                      placeholder="e.g., ABC GmbH"
                      data-testid="input-employer-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="employmentPermission">Employment Permission</Label>
                      {autofilledFields.has('employmentPermission') && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Auto-filled from scan
                        </span>
                      )}
                    </div>
                    <Select
                      value={form.watch("employmentPermission") || ""}
                      onValueChange={(value) => form.setValue("employmentPermission", value as any)}
                    >
                      <SelectTrigger data-testid="select-employment-permission">
                        <SelectValue placeholder="Select permission type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANY_EMPLOYMENT_ALLOWED">Any Employment Allowed</SelectItem>
                        <SelectItem value="RESTRICTED">Restricted to Specific Employer</SelectItem>
                        <SelectItem value="UNKNOWN">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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

                {/* Preview Decision Panel */}
                {canShowPreview && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-border" />
                      <p className="text-sm font-medium text-muted-foreground">Decision Preview</p>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    
                    {previewMutation.isPending ? (
                      <Card className="border-2">
                        <CardContent className="pt-6 space-y-4">
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-16 w-full" />
                        </CardContent>
                      </Card>
                    ) : previewResult ? (
                      <Card className="border-2 bg-gradient-to-br from-card to-background" data-testid="card-preview-decision">
                        <CardContent className="pt-6 space-y-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Preliminary Assessment</p>
                            <StatusBadge status={previewResult.workStatus as any} />
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Summary</p>
                            <p className="text-sm leading-relaxed" data-testid="text-preview-summary">
                              {previewResult.decisionSummary}
                            </p>
                          </div>
                          
                          {previewResult.decisionDetails && previewResult.decisionDetails.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Details</p>
                              <ul className="space-y-1.5" data-testid="list-preview-details">
                                {previewResult.decisionDetails.map((detail, index) => (
                                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span className="flex-1">{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                              This is a preview. The final decision will be saved when you create the check.
                            </AlertDescription>
                          </Alert>
                        </CardContent>
                      </Card>
                    ) : null}
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
