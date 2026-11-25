import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Bot, Send, User, Sparkles, Loader2, Volume2, VolumeX, ExternalLink, Square } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import {
  VoiceButton,
  speakText,
  stopSpeaking,
  unlockAudio,
  subscribeSpeakingState,
  type SpeakingState,
} from '@/components/ai/VoiceButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/config';
import {
  extractProductSlugsFromMarkdown,
  generateSmartClientAdvice,
  isLegacyFallbackResponse,
  normalizeAssistantLinks,
} from '@/lib/smartAdvisorClient';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${SUPABASE_URL}/functions/v1/smart-home-consultant`;

function ProductMiniCard({ slug }: { slug: string }) {
  const { formatPrice } = useLanguage();
  const { data: product } = useQuery({
    queryKey: ['ai-product-card', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url, slug')
        .eq('slug', slug)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });
  if (!product) return null;
  return (
    <Link
      to={`/products/${product.slug}`}
      className="flex items-center gap-2.5 sm:gap-3 p-2 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors min-w-0 max-w-full overflow-hidden"
    >
      <img
        src={product.image_url || '/placeholder.svg'}
        alt={product.name}
        className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl object-contain p-1 flex-shrink-0 bg-muted/30 border border-border/40"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{product.name}</p>
        <p className="text-sm font-bold text-primary">{formatPrice(product.price)}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

const SUGGESTED_EN = [
  "I want to make my 3-bedroom apartment smart",
  "How can I control my lights remotely?",
  "What's the best security camera system?",
  "Help me save on electricity bills",
];

const SUGGESTED_AR = [
  "عايز أعمل شقتي ٣ غرف ذكية",
  "إزاي أتحكم في الإضاءة من بره البيت؟",
  "إيه أحسن نظام كاميرات أمان؟",
  "ساعدني أوفر في فاتورة الكهرباء",
];

const AIConsultant = () => {
  const { isRTL } = useLanguage();
  const { get: getInfo } = useSiteInfo();
  const rawWa = (getInfo('contact', 'whatsapp', '201501896456') || '201501896456').replace(/\D/g, '');
  const whatsappNumber = rawWa.startsWith('0') ? '2' + rawWa : (rawWa || '201501896456');
  const { toast } = useToast();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingState, setSpeakingState] = useState<SpeakingState>({ status: 'idle', id: null });
  const scrollRef = useRef<HTMLDivElement>(null);
  const didAutoSend = useRef(false);

  const suggestions = isRTL ? SUGGESTED_AR : SUGGESTED_EN;

  useEffect(() => {
    const unsubscribe = subscribeSpeakingState(setSpeakingState);
    return () => {
      unsubscribe();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-send pre-filled message (e.g. from Bundles "Order Now")
  useEffect(() => {
    const initial = (location.state as any)?.initialMessage as string | undefined;
    if (initial && !didAutoSend.current) {
      didAutoSend.current = true;
      handleSend(initial);
    }
  }, []);

  const streamChat = useCallback(async (userMessages: Message[]) => {
    const lastUser = [...userMessages].reverse().find((m) => m.role === "user");
    const userPrompt = lastUser?.content ?? "";

    let assistantContent = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: userPrompt,
          messages: userMessages,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Edge function error");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const normalized = normalizeAssistantLinks(assistantContent);
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: normalized } : m));
                }
                return [...prev, { role: "assistant", content: normalized }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch {
      // Handled below via smart client advisor fallback
    }

    const lower = assistantContent.toLowerCase();
    const hasProviderBanner =
      lower.includes("doesn't have enough credits") ||
      lower.includes("pollinations.ai") ||
      lower.includes("top up") ||
      lower.includes("complete a quest");

    if (!assistantContent.trim() || hasProviderBanner || isLegacyFallbackResponse(assistantContent)) {
      try {
        assistantContent = await generateSmartClientAdvice(userPrompt, isRTL);
      } catch {
        assistantContent = isRTL
          ? `أهلاً بك في **AzkaSmart**! لمساعدتك في اختيار أفضل الأجهزة الذكية لمنزلك، يمكنك تصفح [كتالوج المنتجات الذكية](/products) أو [باقات التوفير المتكاملة](/bundles)، أو التحدث مباشرة مع خبرائنا عبر [واتساب](https://wa.me/${whatsappNumber}).`
          : `Welcome to **AzkaSmart**! We are here to help you choose the best smart devices for your home. You can explore our [Product Catalog](/products) or [Smart Bundles](/bundles), or chat directly with our specialists on [WhatsApp](https://wa.me/${whatsappNumber}).`;
      }

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    } else {
      assistantContent = normalizeAssistantLinks(assistantContent);
    }

    return assistantContent;
  }, [isRTL, whatsappNumber]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    if (autoSpeak) {
      unlockAudio();
    }

    const userMsg: Message = { role: 'user', content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await streamChat(newMessages);
      if (autoSpeak && response) {
        const lang = /[\u0600-\u06FF]/.test(response) ? 'ar-EG' : 'en-US';
        void speakText(response, lang, { id: `msg-${newMessages.length}` });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: isRTL ? "خطأ في الاتصال" : "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (text: string) => {
    handleSend(text);
  };

  return (
    <>
      <Helmet>
        <title>{isRTL ? 'مستشار المنزل الذكي' : 'Smart Home Consultant'} | AzkaSmart</title>
        <meta name="description" content="Get personalized smart home recommendations from our AI consultant." />
      </Helmet>
      <Layout>
        <div className="container px-3 sm:px-6 lg:px-8 pt-20 pb-24 sm:py-8 sm:pt-24 md:py-12 md:pt-24">
          <div className="mx-auto max-w-4xl min-w-0">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" />
                {isRTL ? 'مستشار ذكي بالذكاء الاصطناعي' : 'AI-Powered Consultant'}
              </div>
              <h1 className="mb-3 font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                {isRTL ? 'مستشار المنزل الذكي' : 'Smart Home Consultant'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isRTL
                  ? 'قولنا عن بيتك واحتياجاتك وهنقترحلك الحل الأنسب. تقدر تكلمنا بالصوت!'
                  : 'Tell us about your home and needs. You can also use voice!'}
              </p>
            </div>

            {/* Chat Container */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg min-w-0">
              <div ref={scrollRef} className="h-[60vh] min-h-[380px] max-h-[560px] md:h-[500px] md:max-h-none overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
                <AnimatePresence mode="popLayout">
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="min-h-full flex flex-col items-center justify-center text-center py-4 sm:py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Bot className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-display text-lg font-semibold mb-2">
                        {isRTL ? 'إزاي أقدر أساعدك النهارده؟' : 'How can I help you today?'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md">
                        {isRTL
                          ? 'اسألني عن أي حاجة عن المنزل الذكي أو اضغط على مايك وقولي بصوتك'
                          : 'Ask about smart home products or tap the mic to speak'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                        {suggestions.map((q, i) => (
                          <Button key={i} variant="outline" className={cn("h-auto py-3 px-4 text-sm whitespace-normal", isRTL ? "text-right" : "text-left")} onClick={() => handleSend(q)}>
                            {q}
                          </Button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4 min-w-0">
                      {messages.map((message, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-2 sm:gap-3 min-w-0 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {message.role === 'assistant' && (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "min-w-0 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm overflow-hidden",
                              message.role === 'user'
                                ? 'max-w-[85%] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                                : 'max-w-[calc(100%-2.25rem)] sm:max-w-[85%] bg-gradient-to-br from-muted to-muted/60 border border-border/50'
                            )}
                          >
                            {message.role === 'assistant' ? (
                              <div
                                dir={/[\u0600-\u06FF]/.test(message.content) ? 'rtl' : 'ltr'}
                                className="prose prose-sm dark:prose-invert max-w-none min-w-0 w-full break-words [overflow-wrap:anywhere] font-body text-[14px] leading-relaxed [&_p]:my-1.5 [&_ul]:my-2 [&_ul]:ps-5 [&_li]:my-0.5 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:font-display [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:text-primary [&_a]:text-primary [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-words"
                              >
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    a: ({ href, children }) => {
                                      const cleanHref = href?.replace(/^https?:\/\/(?:www\.)?azkasmart\.com/i, '') || '';
                                      if (cleanHref.startsWith('/')) {
                                        return (
                                          <Link to={cleanHref} className="inline px-1.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-semibold no-underline transition-colors break-words [overflow-wrap:anywhere]">
                                            🛒 {children}
                                          </Link>
                                        );
                                      }
                                      return <a href={href} target="_blank" rel="noopener noreferrer" className="break-words [overflow-wrap:anywhere]">{children}</a>;
                                    },
                                    table: ({ children }) => (
                                      <div className="my-2 w-full max-w-full overflow-x-auto rounded-lg border border-border/50">
                                        <table className="w-max min-w-full sm:w-full text-xs sm:text-sm border-collapse my-0 break-normal [overflow-wrap:normal]">{children}</table>
                                      </div>
                                    ),
                                    th: ({ children }) => (
                                      <th className="px-2.5 py-1.5 text-start font-semibold whitespace-nowrap border-b border-border bg-background/40 break-normal [overflow-wrap:normal]">{children}</th>
                                    ),
                                    td: ({ children }) => (
                                      <td className="px-2.5 py-1.5 text-start border-b border-border/40 align-top min-w-[90px] first:min-w-[120px] break-normal [overflow-wrap:normal]">{children}</td>
                                    ),
                                  }}
                                >
                                  {normalizeAssistantLinks(message.content)}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-body">{message.content}</p>
                            )}
                            {message.role === 'assistant' && (() => {
                              const msgId = `msg-${i}`;
                              const isThisActive = speakingState.id === msgId && speakingState.status !== 'idle';
                              const isThisLoading = speakingState.id === msgId && speakingState.status === 'loading';
                              const isThisPlaying = speakingState.id === msgId && speakingState.status === 'playing';
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isThisActive) {
                                      stopSpeaking();
                                      return;
                                    }
                                    unlockAudio();
                                    const lang = /[\u0600-\u06FF]/.test(message.content) ? 'ar-EG' : 'en-US';
                                    void speakText(message.content, lang, {
                                      id: msgId,
                                      onError: (msg) =>
                                        toast({
                                          variant: 'destructive',
                                          title: isRTL ? 'تعذر تشغيل الصوت' : 'Audio Playback Failed',
                                          description: msg,
                                        }),
                                    });
                                  }}
                                  className={cn(
                                    'mt-2 text-xs flex items-center gap-1.5 transition-colors',
                                    isThisActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                                  )}
                                >
                                  {isThisLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : isThisPlaying ? (
                                    <Square className="h-3 w-3 fill-current" />
                                  ) : (
                                    <Volume2 className="h-3.5 w-3.5" />
                                  )}
                                  {isThisLoading
                                    ? (isRTL ? 'جاري التحميل...' : 'Loading...')
                                    : isThisPlaying
                                      ? (isRTL ? 'إيقاف' : 'Stop')
                                      : (isRTL ? 'اسمع' : 'Listen')}
                                </button>
                              );
                            })()}
                            {/* Product image cards for /products/slug links in completed messages */}
                            {message.role === 'assistant' && !(isLoading && i === messages.length - 1) && (() => {
                              const slugs = extractProductSlugsFromMarkdown(message.content);
                              if (!slugs.length) return null;
                              return (
                                <div className="mt-3 grid grid-cols-1 gap-2 min-w-0">
                                  {slugs.slice(0, 5).map(slug => <ProductMiniCard key={slug} slug={slug} />)}
                                </div>
                              );
                            })()}
                          </div>
                          {message.role === 'user' && (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {isLoading && messages[messages.length - 1]?.role === 'user' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 sm:gap-3 justify-start">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-2xl px-4 py-3">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input Area */}
              <div className="border-t border-border p-3 sm:p-4 bg-background/50">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isRTL ? 'اكتب سؤالك هنا أو استخدم المايك...' : 'Type your question or use the mic...'}
                    className="order-1 sm:order-2 w-full sm:flex-1 min-w-0 min-h-[48px] max-h-32 resize-none rounded-xl"
                    disabled={isLoading}
                  />
                  <div className="order-2 sm:contents flex items-center justify-between gap-2 pe-16 sm:pe-0">
                    <VoiceButton
                      onTranscript={handleVoiceTranscript}
                      isDisabled={isLoading}
                      lang={isRTL ? 'ar-EG' : 'en-US'}
                      className="h-10 w-10 sm:h-12 sm:w-12 sm:order-1"
                    />
                    <div className="flex items-center gap-2 sm:contents">
                      <Button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        className="h-10 px-4 sm:h-12 sm:w-12 sm:px-0 rounded-xl flex-shrink-0 sm:order-3"
                      >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </Button>
                      <Button
                        type="button"
                        variant={autoSpeak ? "default" : "outline"}
                        size="icon"
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex-shrink-0 sm:order-4"
                        onClick={() => {
                          unlockAudio();
                          const next = !autoSpeak;
                          setAutoSpeak(next);
                          if (!next) {
                            stopSpeaking();
                            toast({ title: isRTL ? 'تم إيقاف النطق التلقائي' : 'Auto-speak OFF' });
                            return;
                          }
                          toast({ title: isRTL ? 'تم تفعيل النطق التلقائي' : 'Auto-speak ON' });
                          if (!isLoading && messages.length > 0) {
                            const lastIdx = messages.length - 1;
                            const lastMsg = messages[lastIdx];
                            if (lastMsg.role === 'assistant' && lastMsg.content.trim()) {
                              const lang = /[\u0600-\u06FF]/.test(lastMsg.content) ? 'ar-EG' : 'en-US';
                              void speakText(lastMsg.content, lang, {
                                id: `msg-${lastIdx}`,
                                onError: (msg) =>
                                  toast({
                                    variant: 'destructive',
                                    title: isRTL ? 'تعذر تشغيل الصوت' : 'Audio Playback Failed',
                                    description: msg,
                                  }),
                              });
                            }
                          }
                        }}
                        title={autoSpeak ? (isRTL ? 'إيقاف النطق التلقائي' : 'Auto-speak ON') : (isRTL ? 'تفعيل النطق التلقائي' : 'Auto-speak OFF')}
                        aria-label={autoSpeak ? (isRTL ? 'إيقاف النطق التلقائي' : 'Auto-speak ON') : (isRTL ? 'تفعيل النطق التلقائي' : 'Auto-speak OFF')}
                      >
                        {autoSpeak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {isRTL ? '🎤 اضغط المايك وتكلم بالعربي أو الإنجليزي' : '🎤 Tap mic to speak in Arabic or English'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default AIConsultant;
