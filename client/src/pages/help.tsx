import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

export default function Help() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-8">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">Help & FAQ</h1>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>What RTW-DE Does</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  RTW-DE (Right-to-Work Germany) helps HR teams manage employee work eligibility screening for German residence documents.
                </p>
                <p>
                  Upload German residence documents like EU Blue Cards, elektronischer Aufenthaltstitel (eAT), or Fiktionsbescheinigung, and get:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Automated document scanning with OCR to extract key fields</li>
                  <li>Eligibility status based on document type and expiry</li>
                  <li>Clear explanations of what information is clear and what needs manual review</li>
                  <li>Complete audit trail of all checks and decisions</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What RTW-DE Does NOT Do</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p className="font-medium">
                  This tool is not legal advice and does not replace official verification.
                </p>
                <p>
                  RTW-DE provides an initial screening to help HR teams organize and track right-to-work documentation. 
                  It does not:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Replace official checks with the Ausländerbehörde (immigration office)</li>
                  <li>Provide legal advice on employment law or immigration matters</li>
                  <li>Make final hiring decisions (these remain with your HR/legal team)</li>
                  <li>Guarantee the accuracy of OCR-extracted information</li>
                </ul>
                <p className="text-sm mt-3">
                  Always confirm right-to-work status using official documents and, where appropriate, legal counsel or competent authorities.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Which Documents Work Best</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  RTW-DE is optimized for German residence documents, particularly:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>EU Blue Card (Blaue Karte EU)</strong> – for highly qualified workers</li>
                  <li><strong>Elektronischer Aufenthaltstitel (eAT)</strong> – electronic residence titles</li>
                  <li><strong>Aufenthaltserlaubnis</strong> – general residence permits for employment</li>
                  <li><strong>Fiktionsbescheinigung</strong> – temporary permits during application processing</li>
                </ul>
                <p className="text-sm mt-3">
                  For best OCR results, upload clear, high-resolution scans or photos of the document. PDF files work well.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How OCR & Auto-Fill Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  When you upload a document, RTW-DE uses optical character recognition (OCR) to scan the text and automatically extract:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Document type (EU Blue Card, eAT, etc.)</li>
                  <li>Document number</li>
                  <li>Expiry date</li>
                  <li>Possible employer name (if visible on the document)</li>
                  <li>Employment permission hints (e.g., unrestricted vs. employer-specific)</li>
                </ul>
                <p className="font-medium mt-3">
                  Important: OCR can make mistakes.
                </p>
                <p>
                  Always review all auto-filled fields carefully before saving a check. Fields with a ✨ sparkle icon were auto-filled from the scan and should be verified for accuracy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Storage & Deletion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  All right-to-work checks and OCR scan data are stored as part of your organization's audit trail. This includes:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Original raw text extracted from documents</li>
                  <li>Extracted field values (document type, number, dates, etc.)</li>
                  <li>Eligibility decisions and reasoning</li>
                  <li>Timestamps for when checks were created</li>
                </ul>
                <p className="font-medium mt-3">
                  You can delete checks at any time.
                </p>
                <p>
                  On the check detail page, use the "Delete Check" button to permanently remove a check and all associated OCR scan data. 
                  This action cannot be undone.
                </p>
                <p className="text-sm mt-3">
                  Deleting a standalone check removes only that check. Deleting an employee removes the employee and all their associated checks.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Understanding Eligibility Statuses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  Every check results in one of three statuses:
                </p>
                <div className="space-y-3 mt-3">
                  <div>
                    <p className="font-medium text-foreground">✓ ELIGIBLE</p>
                    <p className="text-sm">
                      Based on the information provided, the person appears eligible to work in Germany. 
                      This typically means valid documents with no obvious restrictions.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">✗ NOT ELIGIBLE</p>
                    <p className="text-sm">
                      Based on the current information, the person does not appear eligible to work. 
                      Common reasons include expired documents or residence status that doesn't permit employment.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">? NEEDS REVIEW</p>
                    <p className="text-sm">
                      The system detected potential restrictions, missing information, or uncertainties. 
                      Manual review by HR or legal counsel is recommended. This is the conservative default when information is incomplete.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
