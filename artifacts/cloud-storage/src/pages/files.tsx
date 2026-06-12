import { Layout } from "@/components/layout";
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useListFiles, getListFilesQueryKey, useDeleteFile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileToolbar } from "@/components/files/file-toolbar";
import { FileGrid } from "@/components/files/file-grid";
import { FileList } from "@/components/files/file-list";
import { UploadProgress } from "@/components/files/upload-progress";
import { CreateFolderModal } from "@/components/modals/create-folder-modal";
import { RenameModal } from "@/components/modals/rename-modal";
import { MoveModal } from "@/components/modals/move-modal";
import { ShareModal } from "@/components/modals/share-modal";
import { PreviewModal } from "@/components/modals/preview-modal";
import { Loader2, UploadCloud } from "lucide-react";
import type { FileItem } from "@workspace/api-client-react/src/generated/api.schemas";

export type ViewMode = "grid" | "list";

export interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
}

export function FilesPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const path = searchParams.get("path") || "/";
  const search = searchParams.get("search") || undefined;
  const sort = (searchParams.get("sort") as any) || "name";
  const order = (searchParams.get("order") as any) || "asc";

  const { data: fileData, isLoading } = useListFiles({ path, search, sort, order });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteFile = useDeleteFile();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [uploads, setUploads] = useState<UploadTask[]>([]);

  // Modal States
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);
  const [moveFile, setMoveFile] = useState<FileItem | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const updateParams = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams(window.location.search);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });
    setLocation(`/?${current.toString()}`);
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const newUploads = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    newUploads.forEach((uploadTask) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("files", uploadTask.file);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploads((prev) =>
            prev.map((u) => (u.id === uploadTask.id ? { ...u, progress: percentComplete } : u))
          );
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploads((prev) =>
            prev.map((u) => (u.id === uploadTask.id ? { ...u, status: "success", progress: 100 } : u))
          );
          queryClient.invalidateQueries({ queryKey: getListFilesQueryKey({ path }) });
        } else {
          setUploads((prev) => prev.map((u) => (u.id === uploadTask.id ? { ...u, status: "error" } : u)));
          toast({
            title: "Upload failed",
            description: `Failed to upload ${uploadTask.file.name}`,
            variant: "destructive",
          });
        }
      });

      xhr.addEventListener("error", () => {
        setUploads((prev) => prev.map((u) => (u.id === uploadTask.id ? { ...u, status: "error" } : u)));
        toast({
          title: "Upload failed",
          description: `Network error while uploading ${uploadTask.file.name}`,
          variant: "destructive",
        });
      });

      const uploadUrl = `/api/upload?path=${encodeURIComponent(path)}`;
      xhr.open("POST", uploadUrl);
      xhr.withCredentials = true; // IMPORTANT for auth
      xhr.send(formData);
    });
  }, [path, queryClient, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  }, [uploadFiles]);

  const handleDelete = (itemPath: string) => {
    deleteFile.mutate(
      { params: { path: itemPath } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilesQueryKey({ path }) });
          toast({ title: "Deleted successfully" });
        },
        onError: (err) => {
          toast({ title: "Failed to delete", description: err.error?.error, variant: "destructive" });
        },
      }
    );
  };

  const handleClearUploads = () => {
    setUploads((prev) => prev.filter((u) => u.status === "uploading"));
  };

  return (
    <Layout>
      <div 
        className="flex-1 flex flex-col h-full relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary flex flex-col items-center justify-center rounded-lg m-4 backdrop-blur-sm">
            <UploadCloud className="w-16 h-16 text-primary mb-4" />
            <h2 className="text-2xl font-bold text-primary">Drop files to upload to {path === "/" ? "Server" : path}</h2>
          </div>
        )}

        <div className="p-4 lg:p-6 flex-1 flex flex-col">
          <FileToolbar 
            currentPath={path} 
            breadcrumbs={fileData?.breadcrumbs || []}
            viewMode={viewMode}
            setViewMode={setViewMode}
            search={search}
            sort={sort}
            order={order}
            onUpdateParams={updateParams}
            onCreateFolder={() => setCreateFolderOpen(true)}
            onUploadSelect={handleFileSelect}
          />

          <div className="flex-1 mt-6 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : fileData?.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">This folder is empty</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Drag and drop files here, or use the upload button to add content to your Server.
                </p>
              </div>
            ) : (
              viewMode === "grid" ? (
                <FileGrid 
                  items={fileData?.items || []} 
                  onNavigate={(newPath) => updateParams({ path: newPath, search: null })}
                  onDelete={handleDelete}
                  onRename={setRenameFile}
                  onMove={setMoveFile}
                  onShare={setShareFile}
                  onPreview={setPreviewFile}
                />
              ) : (
                <FileList 
                  items={fileData?.items || []} 
                  onNavigate={(newPath) => updateParams({ path: newPath, search: null })}
                  onDelete={handleDelete}
                  onRename={setRenameFile}
                  onMove={setMoveFile}
                  onShare={setShareFile}
                  onPreview={setPreviewFile}
                />
              )
            )}
          </div>
        </div>

        {uploads.length > 0 && (
          <UploadProgress uploads={uploads} onClear={handleClearUploads} />
        )}

        <CreateFolderModal 
          open={createFolderOpen} 
          onOpenChange={setCreateFolderOpen} 
          currentPath={path} 
        />
        
        {renameFile && (
          <RenameModal 
            open={!!renameFile} 
            onOpenChange={(open) => !open && setRenameFile(null)} 
            file={renameFile}
            currentPath={path}
          />
        )}

        {moveFile && (
          <MoveModal 
            open={!!moveFile} 
            onOpenChange={(open) => !open && setMoveFile(null)} 
            file={moveFile}
            currentPath={path}
          />
        )}

        {shareFile && (
          <ShareModal 
            open={!!shareFile} 
            onOpenChange={(open) => !open && setShareFile(null)} 
            file={shareFile}
          />
        )}

        {previewFile && (
          <PreviewModal 
            open={!!previewFile} 
            onOpenChange={(open) => !open && setPreviewFile(null)} 
            file={previewFile}
          />
        )}
      </div>
    </Layout>
  );
}
