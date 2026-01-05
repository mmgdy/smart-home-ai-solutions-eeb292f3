import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="font-display text-lg font-bold text-primary-foreground">B</span>
              </div>
              <span className="font-display text-xl font-semibold text-foreground">
                Baytzaki
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Making homes smarter, one device at a time. Your trusted partner for smart home solutions.
            </p>
          </div>

          {/* Shop */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="text-muted-foreground hover:text-foreground transition-colors">All Products</Link></li>
              <li><Link to="/products?category=lighting" className="text-muted-foreground hover:text-foreground transition-colors">Lighting</Link></li>
              <li><Link to="/products?category=security" className="text-muted-foreground hover:text-foreground transition-colors">Security</Link></li>
              <li><Link to="/products?category=climate" className="text-muted-foreground hover:text-foreground transition-colors">Climate Control</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/ai-consultant" className="text-muted-foreground hover:text-foreground transition-colors">AI Consultant</Link></li>
              <li><Link to="/services" className="text-muted-foreground hover:text-foreground transition-colors">Installation Services</Link></li>
              <li><a href="mailto:support@baytzaki.com" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>support@baytzaki.com</li>
              <li>+1 (555) 123-4567</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Baytzaki. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
