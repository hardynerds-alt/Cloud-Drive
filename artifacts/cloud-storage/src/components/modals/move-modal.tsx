import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useMoveFile, getListFilesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Move } from "lucide-react";
import type { FileItem } from "@workspace/api-client-react/src/generated/api.schemas";

interface MoveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem;
  currentPath: string;
}

export function MoveModal({ open, onOpenChange, file, currentPath }: MoveModalProps) {
  const [destination, setDestination] = useState("/");
  const moveFile = useMoveFile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const basePath = file.path.substring(0, file.path.lastIndexOf("/"));
      setDestination(basePath || "/");
    }
  }, [open, file]);

  const handleMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;

    let targetPath = destination.endsWith("/") && destination !== "/" 
      ? destination.slice(0, -1) 
      : destination;

    if (targetPath === "" || !targetPath.startsWith("/")) {
      targetPath = `/${targetPath}`;
    }

    const newPath = targetPath === "/" ? `/${file.name}` : `${targetPath}/${file.name}`;

    if (newPath === file.path) {
      onOpenChange(false);
      return;
    }

    moveFile.mutate({ data: { from: file.path, to: newPath } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey({ path: currentPath }) });
        toast({ title: "Moved successfully" });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({ 
          title: "Failed to move", 
          description: err.error?.error || "Unknown error",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleMove}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Move className="w-5 h-5 text-primary" />
              Move
            </DialogTitle>
            <DialogDescription>
              Move <strong>{file.name}</strong> to a new location.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. /Documents/Work"
              autoFocus
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!destination.trim() || moveFile.isPending}>
              {moveFile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Move
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
