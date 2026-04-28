import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Save, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  adminToken: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const blank: Partial<Coupon> = {
  code: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order_amount: 0,
  max_uses: null,
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: null,
  is_active: true,
};

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// Reads the coupon array directly from site_info (public read, anon key)
async function loadCoupons(): Promise<Coupon[]> {
  const { data } = await supabase
    .from("site_info")
    .select("value")
    .eq("section", "coupons")
    .eq("key", "all_coupons")
    .maybeSingle();
  if (!data?.value) return [];
  try { return JSON.parse(data.value); } catch { return []; }
}

// Persists coupon array via the already-deployed update-site-info action
async function persistCoupons(adminToken: string, coupons: Coupon[]): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-write", {
    body: {
      action: "update-site-info",
      token: adminToken,
      entries: [{ section: "coupons", key: "all_coupons", value: JSON.stringify(coupons) }],
    },
  });
  if (error || !data?.success) throw new Error(data?.error || error?.message || "Save failed");
}

export function CouponEditor({ adminToken }: Props) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Coupon>>(blank);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setCoupons(await loadCoupons());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ ...blank, valid_from: new Date().toISOString().slice(0, 10) }); setOpen(true); };
  const openEdit = (c: Coupon) => { setEditing({ ...c }); setOpen(true); };

  const save = async () => {
    if (!editing.code?.trim()) {
      toast({ title: "Coupon code is required", variant: "destructive" });
      return;
    }
    if (!editing.discount_value || editing.discount_value <= 0) {
      toast({ title: "Discount value must be greater than 0", variant: "destructive" });
      return;
    }
    if (editing.discount_type === "percentage" && editing.discount_value > 100) {
      toast({ title: "Percentage discount cannot exceed 100%", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const current = await loadCoupons();
      const isNew = !editing.id;
      const code = editing.code!.toUpperCase().trim();

      if (isNew && current.some((c) => c.code === code)) {
        toast({ title: "Coupon code already exists", variant: "destructive" });
        return;
      }

      const payload: Coupon = isNew
        ? {
            id: crypto.randomUUID(),
            code,
            discount_type: editing.discount_type!,
            discount_value: Number(editing.discount_value),
            min_order_amount: Number(editing.min_order_amount ?? 0),
            max_uses: editing.max_uses ? Number(editing.max_uses) : null,
            used_count: 0,
            valid_from: editing.valid_from || new Date().toISOString(),
            valid_until: editing.valid_until || null,
            is_active: editing.is_active !== false,
            created_at: new Date().toISOString(),
          }
        : {
            ...current.find((c) => c.id === editing.id)!,
            discount_type: editing.discount_type!,
            discount_value: Number(editing.discount_value),
            min_order_amount: Number(editing.min_order_amount ?? 0),
            max_uses: editing.max_uses ? Number(editing.max_uses) : null,
            valid_from: editing.valid_from || new Date().toISOString(),
            valid_until: editing.valid_until || null,
            is_active: editing.is_active !== false,
          };

      const updated = isNew
        ? [...current, payload]
        : current.map((c) => (c.id === payload.id ? payload : c));

      await persistCoupons(adminToken, updated);
      toast({ title: isNew ? "Coupon created" : "Coupon saved" });
      setCoupons(updated);
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const del = async (c: Coupon) => {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      const current = await loadCoupons();
      const updated = current.filter((x) => x.id !== c.id);
      await persistCoupons(adminToken, updated);
      toast({ title: "Deleted" });
      setCoupons(updated);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const toggleActive = async (c: Coupon) => {
    setToggling(c.id);
    try {
      const current = await loadCoupons();
      const updated = current.map((x) => x.id === c.id ? { ...x, is_active: !c.is_active } : x);
      await persistCoupons(adminToken, updated);
      setCoupons(updated);
    } catch (e: any) {
      toast({ title: "Failed to toggle", description: e.message, variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  const isExpired = (c: Coupon) => !!c.valid_until && new Date(c.valid_until) < new Date();
  const usageLabel = (c: Coupon) => c.max_uses ? `${c.used_count}/${c.max_uses}` : `${c.used_count} uses`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Coupon Codes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Create and manage discount coupons for customers.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Coupon</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : coupons.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          No coupons yet. Create your first one.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4 hover:bg-muted/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-primary">{c.code}</span>
                    {isExpired(c) && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Expired</span>
                    )}
                    {!c.is_active && !isExpired(c) && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                    {c.is_active && !isExpired(c) && (
                      <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      {c.discount_type === "percentage" ? `${c.discount_value}% off` : `${c.discount_value} EGP off`}
                    </span>
                    {c.min_order_amount > 0 && <span>Min: {c.min_order_amount} EGP</span>}
                    <span>{usageLabel(c)}</span>
                    {c.valid_until && <span>Until: {new Date(c.valid_until).toLocaleDateString()}</span>}
                  </div>
                </div>
                <Switch
                  checked={c.is_active}
                  disabled={toggling === c.id}
                  onCheckedChange={() => toggleActive(c)}
                />
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => del(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit Coupon" : "New Coupon"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Coupon Code {editing.id ? "(cannot change after creation)" : "*"}</Label>
              <Input
                value={editing.code ?? ""}
                onChange={(e) => !editing.id && setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER20"
                className="font-mono uppercase"
                readOnly={!!editing.id}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={editing.discount_type ?? "percentage"}
                  onValueChange={(v) => setEditing({ ...editing, discount_type: v as "percentage" | "fixed" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (EGP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{editing.discount_type === "percentage" ? "Discount %" : "Discount EGP"} *</Label>
                <Input
                  type="number" min="0"
                  max={editing.discount_type === "percentage" ? 100 : undefined}
                  value={editing.discount_value ?? ""}
                  onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min Order (EGP)</Label>
                <Input
                  type="number" min="0"
                  value={editing.min_order_amount ?? 0}
                  onChange={(e) => setEditing({ ...editing, min_order_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Uses (blank = unlimited)</Label>
                <Input
                  type="number" min="1"
                  value={editing.max_uses ?? ""}
                  placeholder="Unlimited"
                  onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Input
                  type="date"
                  value={toDateInput(editing.valid_from)}
                  onChange={(e) => setEditing({ ...editing, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valid Until (blank = no expiry)</Label>
                <Input
                  type="date"
                  value={toDateInput(editing.valid_until)}
                  onChange={(e) => setEditing({ ...editing, valid_until: e.target.value || null })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={editing.is_active !== false}
                onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
              />
              <Label>Active (customers can use this coupon)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}><X className="h-4 w-4 mr-2" />Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
