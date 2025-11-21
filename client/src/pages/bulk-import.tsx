import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

export default function BulkImport() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest<ImportResult>("/api/employees/import", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.successful} of ${data.total} employees`,
        variant: data.failed > 0 ? "destructive" : "default",
      });
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "An error occurred during import. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    importMutation.mutate(formData);
  };

  const downloadTemplate = () => {
    const csvContent = "first_name,last_name,date_of_birth,email,notes\nJohn,Doe,1990-01-15,john.doe@example.com,New hire\nJane,Smith,1985-03-22,jane.smith@example.com,";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee_import_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Bulk Employee Import</h1>
            <p className="text-muted-foreground">
              Import multiple employees at once using a CSV file
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Download Template</CardTitle>
              <CardDescription>
                Start by downloading our CSV template with the correct format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline" data-testid="button-download-template">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
              <div className="mt-4 p-4 bg-muted/30 rounded-md">
                <p className="text-sm font-medium mb-2">Template Format:</p>
                <code className="text-xs font-mono block">
                  first_name, last_name, date_of_birth, email, notes
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  • date_of_birth format: YYYY-MM-DD (e.g., 1990-01-15)
                  <br />
                  • All fields except notes are required
                  <br />
                  • Email must be unique per employee
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select your completed CSV file to import employees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                  data-testid="input-file-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {file ? (
                        <FileSpreadsheet className="h-6 w-6 text-primary" />
                      ) : (
                        <Upload className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {file ? file.name : "Click to upload CSV file"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : "or drag and drop"}
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
                className="w-full"
                data-testid="button-import"
              >
                {importMutation.isPending ? "Importing..." : "Import Employees"}
              </Button>
            </CardContent>
          </Card>

          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="text-2xl font-bold">{importResult.total}</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/10 text-center border-l-4 border-l-accent">
                    <p className="text-2xl font-bold text-accent">{importResult.successful}</p>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 text-center border-l-4 border-l-destructive">
                    <p className="text-2xl font-bold text-destructive">{importResult.failed}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Import Errors:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <span className="font-semibold">Row {error.row}:</span> {error.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {importResult.successful > 0 && (
                  <Alert className="border-accent bg-accent/5">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    <AlertDescription className="text-accent-foreground">
                      {importResult.successful} employee{importResult.successful !== 1 ? "s" : ""} imported successfully
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
