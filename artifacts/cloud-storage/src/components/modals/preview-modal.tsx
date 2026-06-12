import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { FileItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { FileIcon, Maximize2 } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
}

export function PreviewModal({ open, onOpenChange, file }: PreviewModalProps) {
  if (!file) return null;

  const url = `/api/preview?path=${encodeURIComponent(file.path)}`;
  const mime = file.mimeType || "";
  const ext = file.name.split('.').pop()?.toLowerCase() || "";

  const isImage = mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isVideo = mime.startsWith("video/") || ["mp4", "webm", "mkv"].includes(ext);
  const isPdf = mime === "application/pdf" || ext === "pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full flex flex-col p-0 overflow-hidden bg-black/95 border-none shadow-2xl">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Preview: {file.name}</DialogTitle>
            <DialogDescription>Viewing file content</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <div className="p-4 border-b border-white/10 flex items-center justify-between text-white bg-black/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3 truncate pr-4">
            <FileIcon className="w-5 h-5 text-white/70" />
            <h2 className="font-medium truncate">{file.name}</h2>
          </div>
          <a 
            href={`/api/download?path=${encodeURIComponent(file.path)}`} 
            download 
            className="text-white/70 hover:text-white transition-colors"
          >
            Download
          </a>
        </div>
        <div className="flex-1 flex items-center justify-center relative overflow-hidden p-4">
          {isImage ? (
            <img 
              src={url} 
              alt={file.name} 
              className="max-w-full max-h-full object-contain"
            />
          ) : isVideo ? (
            <video 
              src={url} 
              controls 
              autoPlay
              className="max-w-full max-h-full"
            />
          ) : isPdf ? (
            <iframe 
              src={url} 
              className="w-full h-full bg-white rounded-md"
              title={file.name}
            />
          ) : (
            <div className="text-white/50 flex flex-col items-center">
              <FileIcon className="w-16 h-16 mb-4" />
              <p>Preview not available for this file type</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
