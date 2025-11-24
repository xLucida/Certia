import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  buttonVariant = "outline",
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: [".pdf", ".jpg", ".jpeg", ".png"],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowModal(false);
      })
  );

  useEffect(() => {
    if (showModal && dashboardRef.current) {
      uppy.use(Dashboard, {
        target: dashboardRef.current,
        inline: false,
        trigger: null,
        proudlyDisplayPoweredByUppy: false,
      });
      const dashboardPlugin = uppy.getPlugin("Dashboard");
      if (dashboardPlugin && 'openModal' in dashboardPlugin) {
        (dashboardPlugin as any).openModal();
      }
    }

    return () => {
      try {
        const dashboardPlugin = uppy.getPlugin("Dashboard");
        if (dashboardPlugin) {
          if ('closeModal' in dashboardPlugin) {
            (dashboardPlugin as any).closeModal();
          }
          uppy.removePlugin(dashboardPlugin);
        }
      } catch (error) {
        // Plugin might already be removed, ignore the error
        console.debug("Dashboard plugin cleanup skipped:", error);
      }
    };
  }, [showModal, uppy]);

  return (
    <div>
      <Button 
        type="button"
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        variant={buttonVariant}
        data-testid="button-upload"
      >
        {children}
      </Button>

      {showModal && (
        <div ref={dashboardRef} className="uppy-modal-container" />
      )}
    </div>
  );
}
