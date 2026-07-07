import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles, Loader2, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { SUPABASE_URL } from '@/integrations/supabase/config';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

export function AISearchDialog() {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const ask = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text || busy) return;
    setQuery('');
    setBusy(true);
    const nextHistory: Msg[] = [...messages, { role: 'user', content: text }, { role: 'assistant', content: '' }];
    setMessages(nextHistory);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/site-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          language: isRTL ? 'ar' : 'en',
          history: messages,
        }),
      });
      if (!resp.ok || !resp.body) throw new Error(await resp.text());
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const j = JSON.parse(payload);
            const delta = j?.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const arr = [...prev];
                arr[arr.length - 1] = { role: 'assistant', content: acc };
                return arr;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      setMessages((prev) => {
        const arr = [...prev];
        arr[arr.length - 1] = {
          role: 'assistant',
          content: isRTL ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Please try again.',
        };
        return arr;
      });
    } finally {
      setBusy(false);
    }
  };

  const suggestions = isRTL
    ? ['أفضل باقة لشقة 3 غرف', 'قفل ذكي أقل من 3000 جنيه', 'كاميرا خارجية للمنزل', 'إضاءة ذكية لغرفة المعيشة']
    : ['Best bundle for a 3-bedroom apartment', 'Smart lock under 3000 EGP', 'Outdoor security camera', 'Smart lighting for the living room'];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full hover:bg-foreground/5 relative"
        onClick={() => setOpen(true)}
        aria-label="AI Search"
      >
        <Search className="h-4 w-4" />
        <Sparkles className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 text-primary" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-[8vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-1.5 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {isRTL ? 'بحث بالذكاء الاصطناعي' : 'AI Search'}
                </span>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); ask(); }}
              className="px-4 py-3 border-b border-border"
            >
              <div className="flex items-center gap-2 rounded-xl bg-background border border-border focus-within:border-primary transition-colors px-3 py-2.5">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isRTL ? 'اسأل عن أي منتج أو باقة...' : 'Ask about any product or bundle...'}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  disabled={busy}
                />
                {busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {!busy && query && (
                  <Button type="submit" size="sm" className="h-7 gap-1">
                    {isRTL ? 'اسأل' : 'Ask'} <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </form>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {isRTL ? 'جرّب' : 'Try asking'}
                  </p>
                  <div className="grid gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        className="text-start text-sm px-3 py-2.5 rounded-lg border border-border bg-background/50 hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <MessageBubble key={i} msg={m} isRTL={isRTL} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ msg, isRTL }: { msg: Msg; isRTL: boolean }) {
  const isUser = msg.role === 'user';
  // Linkify /products/slug and /paths
  const parts = msg.content.split(/(\/(?:products|bundles|brands|services|ai-consultant|calculator|profile)[a-zA-Z0-9/\-_?=&]*)/g);
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
      )}>
        {parts.map((p, i) =>
          p.startsWith('/') ? (
            <a key={i} href={p} className="underline underline-offset-2 font-medium">
              {p}
            </a>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </div>
    </div>
  );
}