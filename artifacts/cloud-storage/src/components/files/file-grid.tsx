import type { FileItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { formatBytes } from "@/lib/format";
import { FileIcon, Folder, MoreVertical, Download, Edit2, Move, Trash2, Share2, Eye, Image as ImageIcon, FileText, Film } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface FileGridProps {
  items: FileItem[];
  onNavigate: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (file: FileItem) => void;
  onMove: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
}

export function FileGrid({ items, onNavigate, onDelete, onRename, onMove, onShare, onPreview }: FileGridProps) {
  const isPreviewable = (file: FileItem) => {
    if (file.type === "folder") return false;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const mime = file.mimeType || "";
    return (
      mime.startsWith("image/") || 
      mime.startsWith("video/") || 
      mime === "application/pdf" ||
      ["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mkv", "pdf"].includes(ext || "")
    );
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === "folder") return <Folder className="w-12 h-12 text-blue-400 fill-blue-400/20" />;
    
    const mime = file.mimeType || "";
    const ext = file.name.split('.').pop()?.toLowerCase() || "";
    
    if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return <ImageIcon className="w-12 h-12 text-green-500/70" />;
    }
    if (mime.startsWith("video/") || ["mp4", "webm", "mkv"].includes(ext)) {
      return <Film className="w-12 h-12 text-purple-500/70" />;
    }
    if (mime === "application/pdf" || ext === "pdf") {
      return <FileText className="w-12 h-12 text-red-500/70" />;
    }
    
    return <FileIcon className="w-12 h-12 text-muted-foreground/50" />;
  };

  const handleItemClick = (file: FileItem) => {
    if (file.type === "folder") {
      onNavigate(file.path);
    } else if (isPreviewable(file)) {
      onPreview(file);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((file) => (
        <div 
          key={file.path}
          className="group relative flex flex-col items-center p-4 bg-card hover:bg-muted/50 border border-border rounded-lg cursor-pointer transition-all hover:shadow-md"
          onClick={() => handleItemClick(file)}
        >
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isPreviewable(file) && (
                  <DropdownMenuItem onClick={() => onPreview(file)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                )}
                {file.type === "file" && (
                  <DropdownMenuItem asChild>
                    <a href={`/api/download?path=${encodeURIComponent(file.path)}`} download>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onShare(file)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onRename(file)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove(file)}>
                  <Move className="w-4 h-4 mr-2" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive" 
                  onClick={() => onDelete(file.path)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-24 flex items-center justify-center w-full mb-3 relative">
            {getFileIcon(file)}
            {file.type === "file" && isPreviewable(file) && file.mimeType?.startsWith("image/") && (
              <img 
                src={`/api/preview?path=${encodeURIComponent(file.path)}`} 
                alt={file.name}
                className="absolute inset-0 w-full h-full object-cover rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
            )}
          </div>
          
          <div className="w-full text-center space-y-1">
            <h3 className="font-medium text-sm truncate w-full px-1" title={file.name}>
              {file.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {file.type === "folder" ? "Folder" : formatBytes(file.size)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
