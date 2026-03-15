import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, ExternalLink, Loader2 } from "lucide-react";
import type { UploadedDoc } from "@/hooks/useProjectDocuments";

interface StepFileUploadProps {
  stepNumber: number;
  uploadedDocs: UploadedDoc[];
  uploading: boolean;
  onUpload: (file: File, stepNumber: number) => Promise<void>;
  onDelete: (doc: UploadedDoc) => Promise<void>;
  getPublicUrl: (filePath: string) => string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const StepFileUpload = ({
  stepNumber, uploadedDocs, uploading, onUpload, onDelete, getPublicUrl,
}: StepFileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    await onUpload(file, stepNumber);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Upload className="h-3.5 w-3.5" /> Uploaded Documents
      </h5>

      {/* Uploaded files list */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {uploadedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30 text-sm"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate text-foreground">{doc.file_name}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatSize(doc.file_size)}
              </span>
              <a
                href={getPublicUrl(doc.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => onDelete(doc)}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
        ) : (
          <><Upload className="h-3.5 w-3.5" /> Upload File</>
        )}
      </Button>
      <p className="text-[10px] text-muted-foreground mt-1">
        PDF, images, Office docs · Max 10 MB
      </p>
    </div>
  );
};

export default StepFileUpload;
