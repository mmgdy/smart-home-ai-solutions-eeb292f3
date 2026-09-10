import { useEffect, useState } from "react";
import { Loader2, RefreshCcw, Users, Mail, Calendar, Award, ShoppingBag, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  order_count: number;
  total_spent: number;
  loyalty_points: number;
  tier: string;
}

const tierColors: Record<string, string> = {
  bronze: "bg-amber-700/10 text-amber-700 border-amber-700/20",
  silver: "bg-slate-400/10 text-slate-500 border-slate-400/20",
  gold: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  platinum: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export function UsersManagement({ adminToken }: { adminToken: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, verified: 0, totalOrders: 0, totalSpent: 0 });
  const { toast } = useToast();

  const load = async () => {
    if (!adminToken) {
      toast({
        title: "Not authenticated",
        description: "Please log in to view users",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        headers: { Authorization: "Bearer " + adminToken },
        body: { token: adminToken },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Failed to fetch users");
      }

      const arr: UserRow[] = (data?.users || []).map((u: any) => ({
        id: u.id,
        email: u.email || "",
        full_name: u.full_name || null,
        avatar_url: u.avatar_url || null,
        provider: u.provider || "email",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        email_confirmed_at: u.email_confirmed_at || null,
        order_count: Number(u.order_count) || 0,
        total_spent: Number(u.total_spent) || 0,
        loyalty_points: Number(u.loyalty_points) || 0,
        tier: u.tier || "bronze",
      }));

      setUsers(arr);
      setStats({
        total: arr.length,
        verified: arr.filter((u) => u.email_confirmed_at).length,
        totalOrders: arr.reduce((s, u) => s + (u.order_count || 0), 0),
        totalSpent: arr.reduce((s, u) => s + (u.total_spent || 0), 0),
      });
    } catch (e: any) {
      console.error("UsersManagement load error:", e);
      toast({
        title: "Failed to load users",
        description: e.message || "An error occurred while loading registered users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [adminToken]);

  const filtered = users.filter(
    (u) =>
      !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.provider?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSpent = filtered.reduce((s, u) => s + (u.total_spent || 0), 0);
  const totalOrders = filtered.reduce((s, u) => s + (u.order_count || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading users list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Users</div>
            <div className="text-2xl font-bold mt-1">{users.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Verified Accounts</div>
            <div className="text-2xl font-bold mt-1">{users.filter((u) => u.email_confirmed_at).length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Customer Orders</div>
            <div className="text-2xl font-bold mt-1">{totalOrders}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Revenue</div>
            <div className="text-2xl font-bold mt-1 text-primary">
              {(totalSpent || 0).toLocaleString()} <span className="text-xs font-normal">EGP</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Registered Users & Customers ({filtered.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name, email, or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5 shrink-0">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground uppercase">
              <tr>
                <th className="text-left py-3 px-4">User / Customer</th>
                <th className="text-left py-3 px-4">Sign-in Method</th>
                <th className="text-left py-3 px-4">Joined</th>
                <th className="text-left py-3 px-4">Last Active</th>
                <th className="text-right py-3 px-4">Orders</th>
                <th className="text-right py-3 px-4">Total Spent</th>
                <th className="text-right py-3 px-4">Loyalty Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {u.email ? u.email[0].toUpperCase() : "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {u.full_name || u.email.split("@")[0]}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="capitalize text-xs font-normal">
                      {u.provider || "email"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("ar-EG") : "—"}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("ar-EG") : "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{u.order_count || 0}</td>
                  <td className="py-3 px-4 text-right font-medium text-foreground whitespace-nowrap">
                    {(u.total_spent || 0).toLocaleString()} EGP
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
                        tierColors[u.tier] || tierColors.bronze
                      }`}
                    >
                      <Award className="w-3 h-3" />
                      {u.tier || "bronze"} • {u.loyalty_points || 0} pts
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No registered users match your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UsersManagement;
