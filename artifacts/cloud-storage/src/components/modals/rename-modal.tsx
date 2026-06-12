import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useMoveFile, getListFilesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit2 } from "lucide-react";
import type { FileItem } from "@workspace/api-client-react/src/generated/api.schemas";

interface RenameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem;
  currentPath: string;
}

export function RenameModal({ open, onOpenChange, file, currentPath }: RenameModalProps) {
  const [name, setName] = useState(file.name);
  const moveFile = useMoveFile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(file.name);
    }
  }, [open, file]);

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === file.name) return;

    // Use move endpoint for rename within the same folder
    const basePath = file.path.substring(0, file.path.lastIndexOf("/"));
    const newPath = basePath ? `${basePath}/${name}` : `/${name}`;

    moveFile.mutate({ data: { from: file.path, to: newPath } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey({ path: currentPath }) });
        toast({ title: "Renamed successfully" });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({ 
          title: "Failed to rename", 
          description: err.error?.error || "Unknown error",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleRename}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Rename
            </DialogTitle>
            <DialogDescription>
              Enter a new name for {file.type === "folder" ? "this folder" : "this file"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New name"
              autoFocus
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || name === file.name || moveFile.isPending}>
              {moveFile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
