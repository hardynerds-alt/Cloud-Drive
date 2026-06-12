import { Progress } from "@/components/ui/progress";
import { UploadTask } from "@/pages/files";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadProgressProps {
  uploads: UploadTask[];
  onClear: () => void;
}

export function UploadProgress({ uploads, onClear }: UploadProgressProps) {
  if (uploads.length === 0) return null;

  const allDone = uploads.every((u) => u.status !== "uploading");

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-card border border-border shadow-xl rounded-lg overflow-hidden flex flex-col max-h-[50vh] z-50">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
        <h3 className="font-medium text-sm">
          {allDone ? "Uploads complete" : `Uploading ${uploads.filter(u => u.status === "uploading").length} files`}
        </h3>
        {allDone && (
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onClear}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="overflow-y-auto p-2 space-y-1">
        {uploads.map((task) => (
          <div key={task.id} className="p-2 rounded-md hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium truncate pr-4 max-w-[200px]" title={task.file.name}>
                {task.file.name}
              </span>
              <span className="shrink-0">
                {task.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {task.status === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
                {task.status === "uploading" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              </span>
            </div>
            {task.status === "uploading" && (
              <Progress value={task.progress} className="h-1.5" />
            )}
            {task.status === "error" && (
              <p className="text-[10px] text-destructive mt-1">Upload failed</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
