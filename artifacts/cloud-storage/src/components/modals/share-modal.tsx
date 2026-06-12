import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useCreateShare } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Share2, Copy, Check } from "lucide-react";
import type { FileItem } from "@workspace/api-client-react/src/generated/api.schemas";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem;
}

export function ShareModal({ open, onOpenChange, file }: ShareModalProps) {
  const [expiresInDays, setExpiresInDays] = useState<string>("7");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const createShare = useCreateShare();
  const { toast } = useToast();

  // Reset state when opening
  if (open && shareUrl && !createShare.isSuccess) {
    setShareUrl(null);
    setCopied(false);
  }

  const handleCreate = () => {
    let expiresAt = null;
    const days = parseInt(expiresInDays, 10);
    if (!isNaN(days) && days > 0) {
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }

    createShare.mutate({ data: { path: file.path, expiresAt } }, {
      onSuccess: (data) => {
        // Construct full URL including origin
        const fullUrl = new URL(data.url, window.location.origin).toString();
        setShareUrl(fullUrl);
      },
      onError: (err) => {
        toast({ 
          title: "Failed to create share link", 
          description: err.error?.error || "Unknown error",
          variant: "destructive"
        });
      }
    });
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied to clipboard" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Link
          </DialogTitle>
          <DialogDescription>
            Create a publicly accessible link for <strong>{file.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {!shareUrl ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expires">Expires in (days)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="0"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  placeholder="Leave 0 for no expiration"
                />
                <p className="text-xs text-muted-foreground">0 means the link never expires.</p>
              </div>
              <Button 
                onClick={handleCreate} 
                className="w-full"
                disabled={createShare.isPending}
              >
                {createShare.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly />
                <Button size="icon" onClick={handleCopy} variant={copied ? "default" : "secondary"}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Anyone with this link can view and download the file.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
