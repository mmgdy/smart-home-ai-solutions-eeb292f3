import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Bot, Send, User, Sparkles, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { VoiceButton, speakText } from '@/components/ai/VoiceButton';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-home-consultant`;

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
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = isRTL ? SUGGESTED_AR : SUGGESTED_EN;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (userMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to connect");
    }
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

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
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    return assistantContent;
  }, []);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { role: 'user', content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await streamChat(newMessages);
      if (autoSpeak && response) {
        const lang = /[\u0600-\u06FF]/.test(response) ? 'ar-EG' : 'en-US';
        speakText(response, lang);
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
        <title>{isRTL ? 'مستشار المنزل الذكي' : 'Smart Home Consultant'} | Baytzaki</title>
        <meta name="description" content="Get personalized smart home recommendations from our AI consultant." />
      </Helmet>
      <Layout>
        <div className="container py-8 md:py-12 pt-24">
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" />
                {isRTL ? 'مستشار ذكي بالذكاء الاصطناعي' : 'AI-Powered Consultant'}
              </div>
              <h1 className="mb-3 font-display text-3xl md:text-4xl font-bold text-foreground">
                {isRTL ? 'مستشار المنزل الذكي' : 'Smart Home Consultant'}
              </h1>
              <p className="text-muted-foreground">
                {isRTL
                  ? 'قولنا عن بيتك واحتياجاتك وهنقترحلك الحل الأنسب. تقدر تكلمنا بالصوت!'
                  : 'Tell us about your home and needs. You can also use voice!'}
              </p>
            </div>

            {/* Chat Container */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
              <ScrollArea className="h-[400px] md:h-[500px] p-4 md:p-6" ref={scrollRef}>
                <AnimatePresence mode="popLayout">
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center py-8"
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
                          <Button key={i} variant="outline" className="text-left h-auto py-3 px-4 text-sm whitespace-normal" onClick={() => handleSend(q)}>
                            {q}
                          </Button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.role === 'assistant' && (
                              <button
                                onClick={() => {
                                  const lang = /[\u0600-\u06FF]/.test(message.content) ? 'ar-EG' : 'en-US';
                                  speakText(message.content, lang);
                                }}
                                className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                              >
                                <Volume2 className="h-3 w-3" />
                                {isRTL ? 'اسمع' : 'Listen'}
                              </button>
                            )}
                          </div>
                          {message.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {isLoading && messages[messages.length - 1]?.role === 'user' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-2xl px-4 py-3">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t border-border p-4 bg-background/50">
                <div className="flex gap-2 items-end">
                  <VoiceButton onTranscript={handleVoiceTranscript} isDisabled={isLoading} />
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isRTL ? 'اكتب سؤالك هنا أو استخدم المايك...' : 'Type your question or use the mic...'}
                    className="min-h-[48px] max-h-32 resize-none rounded-xl flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="h-12 w-12 rounded-xl flex-shrink-0"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant={autoSpeak ? "default" : "outline"}
                    size="icon"
                    className="h-12 w-12 rounded-xl flex-shrink-0"
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    title={autoSpeak ? "Auto-speak ON" : "Auto-speak OFF"}
                  >
                    {autoSpeak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </Button>
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
