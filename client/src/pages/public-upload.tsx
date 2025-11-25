import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Upload, AlertCircle, Loader2, FileText } from "lucide-react";
import { CertiaLogo } from "@/components/CertiaLogo";

export default function PublicUploadPage() {
  const [, navigate] = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const { data: validationData, isLoading: validatingToken, error: validationError } = useQuery({
    queryKey: [`/api/public-upload/validate?token=${token}`],
    enabled: !!token,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append("documents", file);
      });
      formData.append("token", token || "");

      const response = await fetch("/api/public-upload/submit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setUploadedFileNames(selectedFiles.map(f => f.name));
      setUploadSuccess(true);
      setUploadResult(data);
      setSelectedFiles([]);
    },
  });

  useEffect(() => {
    if (!token) {
      navigate("/");
    }
  }, [token, navigate]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => isValidFile(file)).slice(0, 5);
    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter(file => isValidFile(file)).slice(0, 5);
      if (validFiles.length > 0) {
        setSelectedFiles(validFiles);
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      setValidationMessage("Please upload a PDF, JPG, or PNG file.");
      return false;
    }

    if (file.size > maxSize) {
      setValidationMessage("File size must be less than 10MB.");
      return false;
    }

    setValidationMessage(null);
    return true;
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    uploadMutation.mutate(selectedFiles);
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
    setValidationMessage(null);
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
        <div className="max-w-lg mx-auto px-4 py-10">
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <CertiaLogo size="default" />
            <p className="text-sm text-muted-foreground">Upload your documents securely for right-to-work review</p>
          </div>
          <Card className="w-full shadow-sm">
            <CardContent className="pt-12 pb-12 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="spinner-validating" />
              <CardTitle>Checking your upload link</CardTitle>
              <CardDescription>Please hold on while we validate your secure upload link.</CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!validationData || validationError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
        <div className="max-w-lg mx-auto px-4 py-10">
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <CertiaLogo size="default" />
            <p className="text-sm text-muted-foreground">Upload your documents securely for right-to-work review</p>
          </div>
          <Card className="w-full shadow-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" data-testid="icon-error" />
                </div>
              </div>
              <CardTitle>Invalid upload link</CardTitle>
              <CardDescription>
                This upload link is invalid or has expired. Please contact your HR team for a new link.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (uploadSuccess && uploadResult) {
    const referenceCode = uploadResult.checkId
      ? `CERTIA-${uploadResult.checkId.substring(0, 8).toUpperCase()}`
      : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
        <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <CertiaLogo size="default" />
            <p className="text-sm text-muted-foreground">Upload your documents securely for right-to-work review</p>
          </div>
          <Card className="shadow-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-success" data-testid="icon-success" />
                </div>
              </div>
              <CardTitle>Documents received</CardTitle>
              <CardDescription className="text-base mt-2">
                Your prospective employer will review them and contact you if anything else is needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {referenceCode && (
                <div className="bg-muted/50 rounded-lg p-4 border" data-testid="section-reference">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Reference code
                  </p>
                  <p className="text-lg font-mono font-semibold" data-testid="text-reference-code">
                    {referenceCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Keep this code for your records.</p>
                </div>
              )}

              {uploadedFileNames.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">
                    Uploaded documents ({uploadedFileNames.length}):
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    {uploadedFileNames.map((fileName, index) => (
                      <li key={index} className="flex items-center gap-2" data-testid={`text-uploaded-file-${index}`}>
                        <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResult.workStatus && (
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Status:</strong> {uploadResult.workStatus.replace(/_/g, " ")}
                    {uploadResult.decisionSummary && (
                      <span className="block mt-1 text-muted-foreground">{uploadResult.decisionSummary}</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Alert className="bg-success/10 border-success/30">
                <AlertDescription className="text-sm">
                  You can now close this window or return to your HR contact.
                </AlertDescription>
              </Alert>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground text-center">
                  Powered by <span className="font-semibold">Certia</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <CertiaLogo size="default" />
          <p className="text-sm text-muted-foreground">Upload your documents securely for right-to-work review</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Upload right-to-work documents</CardTitle>
            <CardDescription className="text-base mt-2">
              Send your documents to your prospective employer through a secure Certia link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(uploadMutation.error || validationMessage) && (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationMessage || uploadMutation.error?.message || "Upload failed. Please try again."}
                </AlertDescription>
              </Alert>
            )}

            {uploadMutation.isPending && (
              <Alert className="bg-muted/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription className="text-sm">Processing your upload…</AlertDescription>
              </Alert>
            )}

            <div className="bg-muted/40 rounded-lg p-4 border border-muted" data-testid="section-data-usage">
              <h4 className="text-sm font-semibold mb-2">How your data is used</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Your documents are securely sent to your prospective employer via Certia.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>They are only used to perform a right-to-work check for Germany</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Documents are transmitted over an encrypted connection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>This upload link is time-limited and cannot be reused once expired</span>
                </li>
              </ul>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                ${isDragging ? "border-primary bg-primary/10 shadow-md" : "border-muted-foreground/30 bg-muted/40"}
                ${selectedFiles.length > 0 ? "bg-muted/60 shadow-sm" : "hover:border-primary/60"}
              `}
              data-testid="dropzone-upload"
            >
              {selectedFiles.length === 0 ? (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Drag and drop your document(s)</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse your files (up to 5 documents)
                  </p>
                  <input
                    type="file"
                    id="file-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    data-testid="input-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("file-input")?.click();
                    }}
                    className="w-full sm:w-auto"
                    data-testid="button-browse"
                  >
                    Browse files
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supported formats: PDF, JPG, PNG (max 10MB)
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                      <FileText className="h-7 w-7 text-success" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">
                      {selectedFiles.length === 1
                        ? "Selected document:"
                        : `Selected documents (${selectedFiles.length}):`}
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-1.5 max-w-md mx-auto text-left">
                      {selectedFiles.map((file, index) => (
                        <li key={`${file.name}-${index}`} className="flex items-center gap-2" data-testid={`text-filename-${index}`}>
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground/70 flex-shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearFiles();
                      }}
                      disabled={uploadMutation.isPending}
                      className="w-full sm:w-auto"
                      data-testid="button-clear"
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmit();
                      }}
                      disabled={uploadMutation.isPending}
                      className="w-full sm:w-auto"
                      data-testid="button-submit"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        selectedFiles.length === 1 ? "Upload document" : "Upload documents"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">What to upload</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• A clear photo or PDF of your residence permit (front and back if applicable)</li>
                <li>• If you have multiple valid documents, you can upload them all in a single submission</li>
                <li>• Maximum 5 documents per upload</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-muted">
                <strong>Your privacy matters:</strong> Certia only uses this information to help your employer perform a right-to-work check.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">Powered by Certia</p>
      </div>
    </div>
  );
}
