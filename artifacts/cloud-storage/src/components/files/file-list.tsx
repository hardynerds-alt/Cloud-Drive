import type { FileItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { formatBytes, formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileIcon, Folder, MoreHorizontal, Download, Edit2, Move, Trash2, Share2, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface FileListProps {
  items: FileItem[];
  onNavigate: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (file: FileItem) => void;
  onMove: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
}

export function FileList({ items, onNavigate, onDelete, onRename, onMove, onShare, onPreview }: FileListProps) {
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

  const handleRowClick = (file: FileItem) => {
    if (file.type === "folder") {
      onNavigate(file.path);
    } else if (isPreviewable(file)) {
      onPreview(file);
    }
  };

  return (
    <div className="bg-card rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-auto">Name</TableHead>
            <TableHead className="hidden md:table-cell w-32">Date modified</TableHead>
            <TableHead className="hidden sm:table-cell w-24 text-right">Size</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((file) => (
            <TableRow 
              key={file.path} 
              className="cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => handleRowClick(file)}
            >
              <TableCell className="font-medium flex items-center gap-3">
                {file.type === "folder" ? (
                  <Folder className="w-5 h-5 text-blue-400 flex-shrink-0 fill-blue-400/20" />
                ) : (
                  <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">{file.name}</span>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground whitespace-nowrap">
                {formatDate(file.modifiedAt)}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-right text-muted-foreground whitespace-nowrap">
                {file.type === "folder" ? "—" : formatBytes(file.size)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
