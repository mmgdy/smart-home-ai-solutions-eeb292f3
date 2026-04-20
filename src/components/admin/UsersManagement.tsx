import { useEffect, useState } from "react";
import { Loader2, RefreshCcw, Users, Mail, Calendar, Award, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  bronze: "bg-amber-700/10 text-amber-700",
  silver: "bg-slate-400/10 text-slate-500",
  gold: "bg-yellow-500/10 text-yellow-600",
  platinum: "bg-purple-500/10 text-purple-600",
};

export function UsersManagement({ adminToken }: { adminToken: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { token: adminToken },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setUsers(data.users || []);
    } catch (e: any) {
      toast({ title: "Failed to load users", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSpent = filtered.reduce((s, u) => s + u.total_spent, 0);
  const totalOrders = filtered.reduce((s, u) => s + u.order_count, 0);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-4">
          <div className="text-xs text-muted-foreground">Total users</div>
          <div className="text-2xl font-bold">{users.length}</div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="text-xs text-muted-foreground">Verified</div>
          <div className="text-2xl font-bold">{users.filter(u => u.email_confirmed_at).length}</div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="text-xs text-muted-foreground">Total orders</div>
          <div className="text-2xl font-bold">{totalOrders}</div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="text-xs text-muted-foreground">Total spent</div>
          <div className="text-2xl font-bold text-primary">{totalSpent.toLocaleString()} EGP</div>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold flex-1">Registered Users</h3>
        <Input placeholder="Search by name/email" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Provider</th>
                <th className="text-left p-3">Joined</th>
                <th className="text-left p-3">Last sign-in</th>
                <th className="text-right p-3">Orders</th>
                <th className="text-right p-3">Spent</th>
                <th className="text-right p-3">Loyalty</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? <img src={u.avatar_url} className="w-8 h-8 rounded-full" /> :
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs">{u.email?.[0]?.toUpperCase()}</div>}
                      <div>
                        <div className="font-medium">{u.full_name || u.email?.split("@")[0]}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 capitalize">{u.provider}</td>
                  <td className="p-3 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3 text-right">{u.order_count}</td>
                  <td className="p-3 text-right font-medium">{u.total_spent.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${tierColors[u.tier] || tierColors.bronze}`}>
                      {u.tier} • {u.loyalty_points}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
