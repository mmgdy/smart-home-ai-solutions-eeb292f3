import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type ClientInfo = { name?: string; client_uri?: string; redirect_uris?: string[] };
type Details = {
  client?: ClientInfo;
  scope?: string;
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: Details | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: Details | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: Details | null; error: { message: string } | null }>;
};

function oauthApi(): OAuthApi | null {
  const api = (supabase.auth as unknown as { oauth?: OAuthApi }).oauth;
  return api ?? null;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const api = oauthApi();
      if (!api) return setError("OAuth is not enabled on this project.");
      const { data, error } = await api.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const api = oauthApi();
    if (!api) return setError("OAuth is not enabled on this project.");
    setBusy(true);
    const { data, error } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-2xl border border-destructive/40 bg-card p-6">
          <h1 className="font-display text-xl mb-2">Cannot load this authorization request</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const redirect = details.client?.redirect_uris?.[0] ?? details.redirect_uri;
  const scopes = (details.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl mb-2">Connect {clientName} to Baytzaki</h1>
        <p className="text-sm text-muted-foreground mb-4">
          This lets {clientName} use Baytzaki as you. It will be able to call this app's enabled tools
          (browse the catalog, see your orders, check your loyalty balance) while you are signed in.
        </p>
        {redirect && (
          <p className="text-xs text-muted-foreground mb-4 break-all">
            Redirects to: <span className="font-mono">{redirect}</span>
          </p>
        )}
        {scopes.length > 0 && (
          <ul className="text-sm mb-4 space-y-1">
            {scopes.map((s) => (
              <li key={s} className="text-muted-foreground">
                • {s === "email" ? "Share your email address" : s === "profile" ? "Share your basic profile" : `Additional permission: ${s}`}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mb-6">
          This does not bypass Baytzaki's permissions — the tools still run under your account.
        </p>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => decide(true)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => decide(false)} disabled={busy}>
            Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}