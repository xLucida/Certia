import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, CheckCircle, AlertCircle, Check, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function Help() {
  const [ocrRawText, setOcrRawText] = useState("");
  const [ocrExtractedFields, setOcrExtractedFields] = useState("");
  const [currentRulesStatus, setCurrentRulesStatus] = useState("NEEDS_REVIEW");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunTest = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await apiRequest("POST", "/api/venice/test", {
        ocrRawText,
        ocrExtractedFields,
        currentRulesStatus,
      });

      const data = await response.json();
      setTestResult(data);
    } catch (err) {
      setError("Failed to run Venice test. Please check your connection.");
      console.error("Venice test error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <HelpCircle className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Help & FAQ</h1>
          </div>
          <p className="text-muted-foreground text-lg mb-8">
            Everything you need to know about using Certia for German work eligibility screening
          </p>

          <div className="space-y-6">
            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-background">
                <CardTitle className="text-xl">What Certia Does</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground pt-6">
                <p>
                  Certia helps HR teams manage employee work eligibility screening for German residence documents.
                </p>
                <p>
                  Upload German residence documents like EU Blue Cards, elektronischer Aufenthaltstitel (eAT), or Fiktionsbescheinigung, and get:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="leading-relaxed">Automated document scanning with OCR to extract key fields</li>
                  <li className="leading-relaxed">Eligibility status based on document type and expiry</li>
                  <li className="leading-relaxed">Clear explanations of what information is clear and what needs manual review</li>
                  <li className="leading-relaxed">Complete audit trail of all checks and decisions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm border-amber-200 dark:border-amber-800">
              <CardHeader className="border-b bg-amber-50/50 dark:bg-amber-950/10">
                <CardTitle className="text-xl">What Certia Does NOT Do</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground pt-6">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  This tool is not legal advice and does not replace official verification.
                </p>
                <p>
                  Certia provides an initial screening to help HR teams organize and track right-to-work documentation. 
                  It does not:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="leading-relaxed">Replace official checks with the Ausländerbehörde (immigration office)</li>
                  <li className="leading-relaxed">Provide legal advice on employment law or immigration matters</li>
                  <li className="leading-relaxed">Make final hiring decisions (these remain with your HR/legal team)</li>
                  <li className="leading-relaxed">Guarantee the accuracy of OCR-extracted information</li>
                </ul>
                <p className="text-sm mt-4 font-medium">
                  Always confirm right-to-work status using official documents and, where appropriate, legal counsel or competent authorities.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-xl">Which Documents Work Best</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground pt-6">
                <p>
                  Certia is optimized for German residence documents, particularly:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="leading-relaxed"><strong>EU Blue Card (Blaue Karte EU)</strong> – for highly qualified workers</li>
                  <li className="leading-relaxed"><strong>Elektronischer Aufenthaltstitel (eAT)</strong> – electronic residence titles</li>
                  <li className="leading-relaxed"><strong>Aufenthaltserlaubnis</strong> – general residence permits for employment</li>
                  <li className="leading-relaxed"><strong>Fiktionsbescheinigung</strong> – temporary permits during application processing</li>
                </ul>
                <p className="text-sm mt-4 font-medium">
                  For best OCR results, upload clear, high-resolution scans or photos of the document. PDF files work well.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-xl">How OCR & Auto-Fill Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground pt-6">
                <p>
                  When you upload a document, Certia uses optical character recognition (OCR) to scan the text and automatically extract:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="leading-relaxed">Document type (EU Blue Card, eAT, etc.)</li>
                  <li className="leading-relaxed">Document number</li>
                  <li className="leading-relaxed">Expiry date</li>
                  <li className="leading-relaxed">Possible employer name (if visible on the document)</li>
                  <li className="leading-relaxed">Employment permission hints (e.g., unrestricted vs. employer-specific)</li>
                </ul>
                <p className="font-bold mt-4 text-foreground">
                  Important: OCR can make mistakes.
                </p>
                <p>
                  Always review all auto-filled fields carefully before saving a check. Fields with a ✨ sparkle icon were auto-filled from the scan and should be verified for accuracy.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-xl">Data Storage & Deletion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground pt-6">
                <p>
                  All right-to-work checks and OCR scan data are stored as part of your organization's audit trail. This includes:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="leading-relaxed">Original raw text extracted from documents</li>
                  <li className="leading-relaxed">Extracted field values (document type, number, dates, etc.)</li>
                  <li className="leading-relaxed">Eligibility decisions and reasoning</li>
                  <li className="leading-relaxed">Timestamps for when checks were created</li>
                </ul>
                <p className="font-bold mt-4 text-foreground">
                  You can delete checks at any time.
                </p>
                <p>
                  On the check detail page, use the "Delete Check" button to permanently remove a check and all associated OCR scan data. 
                  This action cannot be undone.
                </p>
                <p className="text-sm mt-4 font-medium">
                  Deleting a standalone check removes only that check. Deleting an employee removes the employee and all their associated checks.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-xl">Understanding Eligibility Statuses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground pt-6">
                <p>
                  Every check results in one of three statuses:
                </p>
                <div className="space-y-4 mt-4">
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <p className="font-bold text-accent mb-2 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      ELIGIBLE
                    </p>
                    <p className="text-sm leading-relaxed">
                      Based on the information provided, the person appears eligible to work in Germany. 
                      This typically means valid documents with no obvious restrictions.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="font-bold text-destructive mb-2 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      NOT ELIGIBLE
                    </p>
                    <p className="text-sm leading-relaxed">
                      Based on the current information, the person does not appear eligible to work. 
                      Common reasons include expired documents or residence status that doesn't permit employment.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800">
                    <p className="font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                      <HelpCircle className="h-5 w-5" />
                      NEEDS REVIEW
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                      The system detected potential restrictions, missing information, or uncertainties. 
                      Manual review by HR or legal counsel is recommended. This is the conservative default when information is incomplete.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm border-muted">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-xl">Advanced: Technical Diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  This area is intended for admins or technical users to test OCR and AI configuration. 
                  HR users can ignore this section in normal use.
                </p>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="diagnostics">
                    <AccordionTrigger className="text-sm font-medium" data-testid="accordion-diagnostics-trigger">
                      AI Decision Engine Test (Venice.ai)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Use this tool to verify that Certia's AI decision engine (Venice.ai) is configured correctly and to run quick test decisions.
                        </p>

                {testResult && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">Configuration Status:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          {testResult.config?.hasApiKey ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          <span>API Key {testResult.config?.hasApiKey ? "configured" : "missing"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {testResult.config?.hasModelId ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          <span>Model ID {testResult.config?.hasModelId ? "configured" : "missing"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {testResult.config?.hasBaseUrl ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>Base URL {testResult.config?.hasBaseUrl ? "configured" : "default"}</span>
                        </div>
                      </div>
                    </div>

                    {testResult.aiReview && (
                      <div className="space-y-3 pt-4 border-t">
                        <p className="font-semibold text-sm">AI Decision:</p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              testResult.aiReview.status === "ELIGIBLE"
                                ? "default"
                                : testResult.aiReview.status === "NOT_ELIGIBLE"
                                ? "destructive"
                                : "secondary"
                            }
                            data-testid={`badge-ai-status-${testResult.aiReview.status.toLowerCase()}`}
                          >
                            {testResult.aiReview.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold text-sm">Explanation:</p>
                          <p className="text-sm text-muted-foreground">{testResult.aiReview.explanation}</p>
                        </div>
                        {testResult.aiReview.missingInformation && testResult.aiReview.missingInformation.length > 0 && (
                          <div className="space-y-2">
                            <p className="font-semibold text-sm">Missing Information:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {testResult.aiReview.missingInformation.map((item: string, idx: number) => (
                                <li key={idx} className="text-sm text-muted-foreground">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label htmlFor="ocr-raw-text" className="text-sm font-medium">
                      OCR Raw Text
                    </label>
                    <Textarea
                      id="ocr-raw-text"
                      placeholder="Paste OCR text from a German residence document here..."
                      value={ocrRawText}
                      onChange={(e) => setOcrRawText(e.target.value)}
                      rows={4}
                      data-testid="textarea-ocr-raw-text"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="ocr-extracted-fields" className="text-sm font-medium">
                      Extracted Fields JSON (optional)
                    </label>
                    <Textarea
                      id="ocr-extracted-fields"
                      placeholder='{"documentType": "EU_BLUE_CARD", "expiryDate": "2026-12-31"}'
                      value={ocrExtractedFields}
                      onChange={(e) => setOcrExtractedFields(e.target.value)}
                      rows={3}
                      data-testid="textarea-extracted-fields"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="rules-status" className="text-sm font-medium">
                      Current Rules Status
                    </label>
                    <Select value={currentRulesStatus} onValueChange={setCurrentRulesStatus}>
                      <SelectTrigger id="rules-status" data-testid="select-rules-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ELIGIBLE">ELIGIBLE</SelectItem>
                        <SelectItem value="NOT_ELIGIBLE">NOT_ELIGIBLE</SelectItem>
                        <SelectItem value="NEEDS_REVIEW">NEEDS_REVIEW</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleRunTest}
                    disabled={isLoading}
                    className="w-full"
                    data-testid="button-run-ai-test"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running test...
                      </>
                    ) : (
                      "Run AI Test"
                    )}
                  </Button>
                </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
