import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Upload, AlertCircle, Loader2, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PublicUploadPage() {
  const [, navigate] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const { data: validationData, isLoading: validatingToken, error: validationError } = useQuery({
    queryKey: ["/api/public-upload/validate", token],
    enabled: !!token,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
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
      console.log("Upload successful:", data);
      setUploadSuccess(true);
      setUploadResult(data);
      setSelectedFile(null);
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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF, JPG, or PNG file.");
      return false;
    }

    if (file.size > maxSize) {
      alert("File size must be less than 10MB.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Card className="w-full max-w-lg mx-4">
          <CardContent className="pt-12 pb-12 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="spinner-validating" />
            <p className="text-muted-foreground">Validating upload link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validationData || validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" data-testid="icon-error" />
              </div>
            </div>
            <CardTitle>Invalid Upload Link</CardTitle>
            <CardDescription>
              This upload link is invalid or has expired. Please contact your HR team for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (uploadSuccess && uploadResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-success" data-testid="icon-success" />
              </div>
            </div>
            <CardTitle>Thank you — your documents have been received</CardTitle>
            <CardDescription className="text-base mt-2">
              Your prospective employer will review them and contact you if anything else is needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadResult.workStatus && (
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Status:</strong> {uploadResult.workStatus.replace(/_/g, " ")}
                  {uploadResult.decisionSummary && (
                    <span className="block mt-1 text-muted-foreground">
                      {uploadResult.decisionSummary}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground text-center">
              You can now close this window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Upload your right-to-work documents</CardTitle>
          <CardDescription className="text-base mt-2">
            Your documents will be securely sent to your prospective employer so they can check your right to work in Germany.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {uploadMutation.error && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {uploadMutation.error.message || "Upload failed. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover-elevate"}
              ${selectedFile ? "bg-muted/50" : ""}
            `}
            data-testid="dropzone-upload"
          >
            {!selectedFile ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-2">
                  Drag and drop your document here
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse your files
                </p>
                <input
                  type="file"
                  id="file-input"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file-input")?.click()}
                  data-testid="button-browse"
                >
                  Browse Files
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported formats: PDF, JPG, PNG (max 10MB)
                </p>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-success" />
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-2" data-testid="text-filename">
                  {selectedFile.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearFile}
                    disabled={uploadMutation.isPending}
                    data-testid="button-clear"
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={uploadMutation.isPending}
                    data-testid="button-submit"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Document"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">What to upload</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• A clear photo or PDF of your residence permit (front, and back if applicable)</li>
              <li>• If you have multiple valid documents, you can upload each one</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-muted">
              <strong>Your privacy matters:</strong> Certia only uses this information to help your employer perform a right-to-work check.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
