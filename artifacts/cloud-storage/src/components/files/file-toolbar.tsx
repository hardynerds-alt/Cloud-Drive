import { Breadcrumb as BreadcrumbType } from "@workspace/api-client-react/src/generated/api.schemas";
import { Link } from "wouter";
import { ViewMode } from "@/pages/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Search, FolderPlus, Upload, Grid, List, ChevronRight, Home, ArrowUpDown, UploadCloud } from "lucide-react";
import { useRef } from "react";

interface FileToolbarProps {
  currentPath: string;
  breadcrumbs: BreadcrumbType[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  search?: string;
  sort: string;
  order: string;
  onUpdateParams: (params: Record<string, string | null>) => void;
  onCreateFolder: () => void;
  onUploadSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileToolbar({
  currentPath,
  breadcrumbs,
  viewMode,
  setViewMode,
  search,
  sort,
  order,
  onUpdateParams,
  onCreateFolder,
  onUploadSelect
}: FileToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center text-sm overflow-x-auto max-w-full pb-2 sm:pb-0 scrollbar-hide">
        <Link href="/?path=/" className="flex items-center text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors p-1 rounded-md hover:bg-accent">
          <Home className="w-4 h-4 mr-1" />
          Vault
        </Link>
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.path} className="flex items-center whitespace-nowrap">
            <ChevronRight className="w-4 h-4 text-muted-foreground mx-1 flex-shrink-0" />
            <Link 
              href={`/?path=${encodeURIComponent(crumb.path)}`}
              className={`hover:underline p-1 rounded-md hover:bg-accent transition-colors ${idx === breadcrumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {crumb.name}
            </Link>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search files..."
            className="pl-9 bg-background w-full"
            value={search || ""}
            onChange={(e) => onUpdateParams({ search: e.target.value || null })}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(val) => onUpdateParams({ sort: val })}>
              <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="date">Date Modified</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={order} onValueChange={(val) => onUpdateParams({ order: val })}>
              <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex border border-border rounded-md bg-background shrink-0">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-none rounded-l-sm border-r border-transparent hover:bg-accent"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-none rounded-r-sm hover:bg-accent"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="shrink-0 gap-2">
              <FolderPlus className="w-4 h-4 hidden sm:block" />
              <span>New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreateFolder}>
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload Files
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          onChange={(e) => {
            onUploadSelect(e);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }} 
        />
      </div>
    </div>
  );
}
