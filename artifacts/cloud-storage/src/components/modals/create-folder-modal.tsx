import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useCreateFolder, getListFilesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FolderPlus } from "lucide-react";

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
}

export function CreateFolderModal({ open, onOpenChange, currentPath }: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const createFolder = useCreateFolder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;

    createFolder.mutate({ data: { path: newPath } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey({ path: currentPath }) });
        toast({ title: "Folder created successfully" });
        onOpenChange(false);
        setName("");
      },
      onError: (err) => {
        toast({ 
          title: "Failed to create folder", 
          description: err.error?.error || "Unknown error",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setName(""); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Create Folder
            </DialogTitle>
            <DialogDescription>
              Enter a name for the new folder in {currentPath === "/" ? "Vault root" : currentPath}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Invoices 2024"
              autoFocus
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createFolder.isPending}>
              {createFolder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
