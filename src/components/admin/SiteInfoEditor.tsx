import { useEffect, useState } from "react";
import { Loader2, Save, Phone, Share2, Sparkles, Info, Wrench, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { refreshSiteInfo } from "@/hooks/useSiteInfo";

interface Props { adminToken: string; }

const SECTIONS: Array<{
  key: string;
  title: string;
  icon: any;
  fields: Array<{ key: string; label: string; type?: "text" | "textarea" }>;
}> = [
  { key: "contact", title: "Contact info", icon: Phone, fields: [
    { key: "phone", label: "Phone (display)" },
    { key: "whatsapp", label: "WhatsApp number (digits only, e.g. 201234567890)" },
    { key: "email", label: "Email" },
    { key: "address_en", label: "Address (English)" },
    { key: "address_ar", label: "Address (Arabic)" },
  ] },
  { key: "social", title: "Social links", icon: Share2, fields: [
    { key: "facebook", label: "Facebook URL" },
    { key: "instagram", label: "Instagram URL" },
    { key: "tiktok", label: "TikTok URL" },
    { key: "youtube", label: "YouTube URL" },
  ] },
  { key: "hero", title: "Hero (homepage)", icon: Sparkles, fields: [
    { key: "headline_en", label: "Headline (English)" },
    { key: "headline_ar", label: "Headline (Arabic)" },
    { key: "subheadline_en", label: "Subheadline (English)", type: "textarea" },
    { key: "subheadline_ar", label: "Subheadline (Arabic)", type: "textarea" },
    { key: "cta_en", label: "Primary CTA (English)" },
    { key: "cta_ar", label: "Primary CTA (Arabic)" },
  ] },
  { key: "about", title: "About / company", icon: Info, fields: [
    { key: "mission_en", label: "Mission (English)", type: "textarea" },
    { key: "mission_ar", label: "Mission (Arabic)", type: "textarea" },
    { key: "story_en", label: "Story (English)", type: "textarea" },
    { key: "story_ar", label: "Story (Arabic)", type: "textarea" },
  ] },
  { key: "service_prices", title: "Service prices (EGP)", icon: Wrench, fields: [
    { key: "installation", label: "Smart home installation (from EGP)" },
    { key: "configuration", label: "System configuration (from EGP)" },
    { key: "consultation", label: "Consultation (from EGP)" },
    { key: "calculator_install_per_device", label: "Calculator: install fee per device (EGP)" },
    { key: "calculator_install_min", label: "Calculator: minimum install fee (EGP)" },
    { key: "checkout_install_per_device", label: "Checkout: install fee per device (EGP)" },
    { key: "checkout_install_cap", label: "Checkout: install fee cap (EGP)" },
  ] },
];

export function SiteInfoEditor({ adminToken }: Props) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_info").select("section, key, value");
      const map: Record<string, Record<string, string>> = {};
      for (const r of data ?? []) {
        if (!map[r.section]) map[r.section] = {};
        map[r.section][r.key] = r.value ?? "";
      }
      setValues(map);
      setLoading(false);
    })();
  }, []);

  const set = (section: string, key: string, value: string) => {
    setValues((prev) => ({ ...prev, [section]: { ...(prev[section] ?? {}), [key]: value } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const entries: Array<{ section: string; key: string; value: string }> = [];
      for (const sec of SECTIONS) {
        for (const f of sec.fields) {
          entries.push({ section: sec.key, key: f.key, value: values[sec.key]?.[f.key] ?? "" });
        }
      }
      const { data, error } = await supabase.functions.invoke("admin-write", {
        body: { action: "update-site-info", token: adminToken, entries },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      await refreshSiteInfo();
      toast({ title: "Site info saved", description: "Changes are live across the site." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {SECTIONS.map((sec) => (
        <div key={sec.key} className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <sec.icon className="h-5 w-5 text-primary" />{sec.title}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {sec.fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "md:col-span-2 space-y-2" : "space-y-2"}>
                <Label>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea rows={3} value={values[sec.key]?.[f.key] ?? ""}
                    onChange={(e) => set(sec.key, f.key, e.target.value)} />
                ) : (
                  <Input value={values[sec.key]?.[f.key] ?? ""}
                    onChange={(e) => set(sec.key, f.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save all changes
        </Button>
      </div>
    </div>
  );
}
