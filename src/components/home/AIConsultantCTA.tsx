import { Link } from 'react-router-dom';
import { Sparkles, MessageSquare, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AIConsultantCTA() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-cyan-accent/5 p-8 md:p-12">
          {/* Glow effects */}
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-cyan-accent/10 blur-3xl" />

          <div className="relative grid items-center gap-8 md:grid-cols-2">
            {/* Content */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-sm text-primary">
                <Sparkles className="h-4 w-4" />
                AI-Powered
              </div>

              <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
                Not Sure Where to Start?
              </h2>

              <p className="mb-6 text-lg text-muted-foreground">
                Our AI Smart Home Consultant analyzes your needs and builds a personalized 
                solution package. Just tell us about your home, and we'll do the rest.
              </p>

              <Link to="/ai-consultant">
                <Button size="lg" className="gap-2 glow-primary">
                  <MessageSquare className="h-5 w-5" />
                  Start AI Consultation
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: MessageSquare, title: 'Chat with AI', desc: 'Describe your home and lifestyle' },
                { icon: Sparkles, title: 'Get Recommendations', desc: 'AI suggests the perfect products' },
                { icon: Package, title: 'One-Click Bundles', desc: 'Add entire solution to cart' },
              ].map((step, i) => (
                <div
                  key={step.title}
                  className="flex items-start gap-4 rounded-lg border border-border/50 bg-card/50 p-4 backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
