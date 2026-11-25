import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { categoryToSlug, sortCategories } from "@/lib/categories";

interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  product_count: number;
  created_at: string;
}

interface CategoriesManagerProps {
  adminToken: string;
}

export function CategoriesManager({ adminToken }: CategoriesManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [blockedDeleteMsg, setBlockedDeleteMsg] = useState<string | null>(null);

  const extractInvokeError = async (error: any, data: any, fallback: string) => {
    if (data?.error) return String(data.error);
    try {
      const parsed = await error?.context?.json?.();
      if (parsed?.error) return String(parsed.error);
    } catch {}
    return error?.message || fallback;
  };

  const broadcastUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    window.dispatchEvent(new CustomEvent("azka-categories-updated"));
  }, [queryClient]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: { action: "list-categories", token: adminToken },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to load categories");
      }
      setCategories(sortCategories((data.categories ?? []) as AdminCategoryRow[]));
      setUncategorizedCount(Number(data.uncategorized_count) || 0);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to load categories",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [adminToken, toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!slugTouched) {
      setNewSlug(categoryToSlug(val));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    const effectiveSlug = (newSlug.trim() || categoryToSlug(trimmedName)).toLowerCase();
    if (!trimmedName || !effectiveSlug) {
      toast({ variant: "destructive", title: "Category name is required" });
      return;
    }

    setBusy(true);
    setBlockedDeleteMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: {
          action: "create-category",
          token: adminToken,
          name: trimmedName,
          slug: effectiveSlug,
        },
      });
      if (error || !data?.success) {
        throw new Error(await extractInvokeError(error, data, "Failed to create category"));
      }
      toast({ title: "Category created", description: `"${trimmedName}" (${effectiveSlug})` });
      setNewName("");
      setNewSlug("");
      setSlugTouched(false);
      await loadCategories();
      broadcastUpdate();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Create failed", description: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleRenameSave = async (cat: AdminCategoryRow) => {
    const nextName = editingName.trim();
    if (!nextName) {
      toast({ variant: "destructive", title: "Category name cannot be empty" });
      return;
    }
    if (nextName === cat.name) {
      setEditingId(null);
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: {
          action: "update-category",
          token: adminToken,
          id: cat.id,
          name: nextName,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to rename category");
      }
      setEditingId(null);
      toast({ title: "Category renamed", description: `${cat.name} → ${nextName}` });
      await loadCategories();
      broadcastUpdate();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Rename failed", description: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (cat: AdminCategoryRow, nextActive: boolean) => {
    setBusy(true);
    setBlockedDeleteMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: {
          action: "update-category",
          token: adminToken,
          id: cat.id,
          is_active: nextActive,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to update status");
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: nextActive } : c))
      );
      toast({
        title: nextActive ? "Category activated" : "Category deactivated",
        description: cat.name,
      });
      broadcastUpdate();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (index: number, delta: -1 | 1) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const updatedWithOrder = reordered.map((c, idx) => ({ ...c, sort_order: idx + 1 }));
    setCategories(updatedWithOrder);

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: {
          action: "reorder-categories",
          token: adminToken,
          orderedIds: updatedWithOrder.map((c) => c.id),
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to reorder categories");
      }
      broadcastUpdate();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reorder failed", description: err.message });
      await loadCategories();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (cat: AdminCategoryRow) => {
    setBlockedDeleteMsg(null);
    if (cat.product_count > 0) {
      const msg = `Cannot delete "${cat.name}" because ${cat.product_count} product(s) are still assigned to it. Move those products to another category first.`;
      setBlockedDeleteMsg(msg);
      toast({
        variant: "destructive",
        title: "Category in use",
        description: msg,
      });
      return;
    }

    if (!confirm(`Delete empty category "${cat.name}"? This cannot be undone.`)) return;

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: {
          action: "delete-category",
          token: adminToken,
          id: cat.id,
        },
      });
      if (error || !data?.success) {
        throw new Error(await extractInvokeError(error, data, "Delete failed"));
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      toast({ title: "Category deleted", description: cat.name });
      broadcastUpdate();
    } catch (err: any) {
      setBlockedDeleteMsg(err.message);
      toast({ variant: "destructive", title: "Delete blocked", description: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-primary" />
              Categories Management
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create, rename, reorder, and activate/deactivate product categories. Active categories with published products appear on the shop filter in this exact order.
            </p>
          </div>
          <Badge variant="outline" className="text-xs px-3 py-1">
            Uncategorized fallback: {uncategorizedCount} product(s)
          </Badge>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-[1fr_240px_auto] items-end pt-2 border-t border-border">
          <div className="space-y-1.5">
            <Label htmlFor="new-cat-name">New Category Name</Label>
            <Input
              id="new-cat-name"
              placeholder="e.g. Cameras"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-cat-slug">Slug (auto-generated)</Label>
            <Input
              id="new-cat-slug"
              placeholder="cameras"
              value={newSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setNewSlug(categoryToSlug(e.target.value));
              }}
              className="font-mono text-sm"
              disabled={busy}
            />
          </div>
          <Button type="submit" disabled={busy || !newName.trim()} className="gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Category
          </Button>
        </form>

        {blockedDeleteMsg && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-2">
            <span>{blockedDeleteMsg}</span>
            <button type="button" onClick={() => setBlockedDeleteMsg(null)} aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Category List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : categories.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No categories found.</p>
        ) : (
          <div className="divide-y divide-border">
            {categories.map((cat, index) => {
              const isEditing = editingId === cat.id;
              return (
                <div
                  key={cat.id}
                  data-testid={`category-row-${cat.slug}`}
                  className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors ${!cat.is_active ? "opacity-65 bg-muted/20" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={busy || index === 0}
                        onClick={() => handleMove(index, -1)}
                        aria-label={`Move ${cat.name} up`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={busy || index === categories.length - 1}
                        onClick={() => handleMove(index, 1)}
                        aria-label={`Move ${cat.name} down`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <span className="text-xs font-mono text-muted-foreground w-7 text-center shrink-0">
                      #{cat.sort_order}
                    </span>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleRenameSave(cat);
                              } else if (e.key === "Escape") {
                                setEditingId(null);
                              }
                            }}
                            className="h-8 max-w-xs"
                            autoFocus
                          />
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleRenameSave(cat)} disabled={busy}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{cat.name}</span>
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {cat.slug}
                          </span>
                          {!cat.is_active && (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={cat.product_count > 0 ? "secondary" : "outline"} className="text-xs">
                      {cat.product_count} {cat.product_count === 1 ? "product" : "products"}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={cat.is_active !== false}
                        onCheckedChange={(checked) => handleToggleActive(cat, checked)}
                        disabled={busy}
                        aria-label={`Toggle ${cat.name} active status`}
                      />
                      <span className="text-xs text-muted-foreground w-14">
                        {cat.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {!isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditingName(cat.name);
                        }}
                        disabled={busy}
                        aria-label={`Rename ${cat.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cat)}
                      disabled={busy}
                      aria-label={`Delete ${cat.name}`}
                      title={
                        cat.product_count > 0
                          ? `Cannot delete (${cat.product_count} products assigned)`
                          : `Delete ${cat.name}`
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
