import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Store as StoreIcon, 
  Settings, 
  Plus, 
  ChevronLeft, 
  ShoppingBag,
  Loader2,
  AlertCircle,
  Package,
  LayoutDashboard,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreProductCard } from "@/components/velo/StoreProductCard";
import { StoreEditor } from "@/components/velo/StoreEditor";
import { StoreDashboard } from "@/components/velo/dashboard/StoreDashboard";
import { User, StoreSetting, PodProduct } from "@/entities";
import { Link, useNavigate } from "react-router-dom";

export default function Store() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStoreData = async () => {
      try {
        setIsLoading(true);
        const me = await User.me();
        setUser(me);

        // Load store settings
        const allSettings = await StoreSetting.list();
        const mySettings = allSettings.find((s: any) => s.owner_user_id === me.id);
        
        if (mySettings) {
          setSettings(mySettings);
        } else {
          // Default settings if none exist
          setSettings({
            store_name: "My Design Shop",
            tagline: "Custom designs crafted with passion and precision",
            primary_color: "#0f172a",
            accent_color: "#6366f1",
            secondary_color: "#f8fafc",
            layout_style: "grid",
            card_style: "standard",
            grid_columns: 3,
            show_product_type_badge: true,
            show_prices: true
          });
        }

        // Load products
        const allProducts = await PodProduct.list();
        const myProducts = allProducts.filter((p: any) => p.owner_user_id === me.id);
        setProducts(myProducts);
      } catch (err: any) {
        console.error("Store loading error:", err);
        setError(err.message || "Failed to load store data. Please ensure you are logged in.");
      } finally {
        setIsLoading(false);
      }
    };

    loadStoreData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse font-medium">Opening your storefront...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md mb-6">{error}</p>
        <Button onClick={() => navigate("/")}>Return Home</Button>
      </div>
    );
  }

  const primaryColor = settings?.primary_color || "#0f172a";
  const accentColor = settings?.accent_color || "#6366f1";
  const secondaryColor = settings?.secondary_color || "#f8fafc";
  const isList = settings?.layout_style === "list";
  const gridCols = settings?.grid_columns || 3;

  const gridClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  }[gridCols as 2 | 3 | 4] || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: secondaryColor }}>
      <AnimatePresence mode="wait">
        {isDashboardOpen ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <StoreDashboard 
              user={user} 
              products={products} 
              settings={settings}
              onClose={() => setIsDashboardOpen(false)}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="storefront"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {/* Header / Hero Section */}
            <header 
              className="relative min-h-[40vh] flex flex-col justify-center overflow-hidden transition-all duration-700"
              style={{ 
                background: settings?.hero_banner_url 
                  ? `url(${settings.hero_banner_url}) center/cover no-repeat` 
                  : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                color: 'white'
              }}
            >
              {/* Overlay if there's a banner image */}
              {settings?.hero_banner_url && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              )}

              {/* Decorative elements only if no banner image */}
              {!settings?.hero_banner_url && (
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
                  <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[80%] rounded-full blur-[100px]" style={{ backgroundColor: accentColor }}></div>
                  <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[60%] rounded-full blur-[80px]" style={{ backgroundColor: accentColor }}></div>
                </div>
              )}

              <div className="max-w-7xl mx-auto w-full relative z-10 px-6 py-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-3xl"
                  >
                    <Button 
                      variant="ghost" 
                      asChild 
                      className="mb-8 text-white/70 hover:text-white hover:bg-white/10 -ml-2"
                    >
                      <Link to="/">
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back to Hub
                      </Link>
                    </Button>
                    
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 leading-none">
                      {settings?.hero_headline || settings?.store_name}
                    </h1>
                    
                    <p className="text-xl md:text-2xl text-white/90 max-w-2xl font-medium leading-relaxed mb-8">
                      {settings?.hero_subtext || settings?.tagline}
                    </p>

                    <div className="flex flex-wrap gap-4">
                      <Button 
                        size="lg"
                        style={{ backgroundColor: accentColor }}
                        className="hover:opacity-90 shadow-2xl shadow-black/30 font-black h-14 px-8 text-lg rounded-2xl"
                        onClick={() => {
                          document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        Shop Collection
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg"
                        onClick={() => setIsDashboardOpen(true)}
                        className="bg-white/10 border-white/20 hover:bg-white/20 text-white backdrop-blur-md h-14 px-8 rounded-2xl font-bold"
                      >
                        <LayoutDashboard className="w-5 h-5 mr-2" />
                        Manage Store
                      </Button>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="hidden lg:flex flex-col gap-3 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10">
                        <StoreIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/60">Official Merchant</p>
                        <p className="font-black text-white">{settings?.store_name}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditorOpen(true)}
                      className="w-full bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl py-6"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Brand Studio
                    </Button>
                  </motion.div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main id="products" className="flex-1 max-w-7xl mx-auto w-full px-6 py-20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                  <h2 className="text-4xl font-black tracking-tight mb-2">Featured Designs</h2>
                  <p className="text-muted-foreground font-medium">Unique products created by independent designers.</p>
                </div>
                <Badge variant="secondary" className="bg-muted text-muted-foreground font-bold px-4 py-2 text-sm rounded-xl">
                  {products.length} {products.length === 1 ? 'Product Available' : 'Products Available'}
                </Badge>
              </div>

              {products.length > 0 ? (
                <motion.div 
                  className={`grid gap-8 ${isList ? 'grid-cols-1' : gridClass}`}
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                >
                  {products.map((product) => (
                    <StoreProductCard 
                      key={product.id} 
                      product={product} 
                      accentColor={accentColor}
                      cardStyle={settings?.card_style}
                      showBadge={settings?.show_product_type_badge}
                      showPrice={settings?.show_prices}
                      layoutStyle={settings?.layout_style}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-32 px-6 text-center border-2 border-dashed border-muted rounded-[3rem] bg-muted/20"
                >
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-8">
                    <Package className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-3xl font-black mb-4">The store is being stocked</h3>
                  <p className="text-muted-foreground max-w-md text-lg mb-10 leading-relaxed">
                    We're currently finalizing some exclusive designs. Check back soon for the latest collection from {settings?.store_name}.
                  </p>
                  <Button 
                    size="lg" 
                    asChild
                    style={{ backgroundColor: accentColor }}
                    className="hover:opacity-90 px-10 h-14 text-lg font-black rounded-2xl shadow-2xl shadow-black/10"
                  >
                    <Link to="/?module=print-shop">
                      Start Designing
                    </Link>
                  </Button>
                </motion.div>
              )}

              {/* About Section */}
              {settings?.about_text && (
                <div className="mt-32 pt-20 border-t border-border/50">
                  <div className="max-w-3xl">
                    <h2 className="text-3xl font-black mb-6">About the Store</h2>
                    <p className="text-xl text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {settings.about_text}
                    </p>
                  </div>
                </div>
              )}
            </main>

            {/* Footer */}
            <footer className="border-t border-border/50 mt-auto py-20 px-6 bg-muted/20">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor }}>
                        <ShoppingBag className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-black text-2xl tracking-tight">{settings?.store_name}</p>
                    </div>
                    <p className="text-muted-foreground max-w-md text-lg mb-8">
                      {settings?.footer_text || `Proudly powered by VELO Commerce. Quality designs, ethically produced and delivered worldwide.`}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-black uppercase tracking-widest text-sm mb-6">Navigation</h4>
                    <ul className="space-y-4 font-bold">
                      <li><Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Platform Hub</Link></li>
                      <li><Link to="/?module=print-shop" className="text-muted-foreground hover:text-primary transition-colors">Design Studio</Link></li>
                      <li><Link to="/?module=wallet" className="text-muted-foreground hover:text-primary transition-colors">Merchant Wallet</Link></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-black uppercase tracking-widest text-sm mb-6">Support</h4>
                    <ul className="space-y-4 font-bold">
                      <li><button className="text-muted-foreground hover:text-primary transition-colors">Shipping Policy</button></li>
                      <li><button className="text-muted-foreground hover:text-primary transition-colors">Returns & Refunds</button></li>
                      <li><button className="text-muted-foreground hover:text-primary transition-colors">Contact Merchant</button></li>
                    </ul>
                  </div>
                </div>
                
                <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground font-bold text-sm">
                  <p>&copy; {new Date().getFullYear()} {settings?.store_name}. All rights reserved.</p>
                  <p className="flex items-center gap-1 opacity-60">
                    Built with <span className="text-red-500">❤</span> on VELO
                  </p>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <StoreEditor 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        settings={settings}
        onSave={(newSettings) => setSettings(newSettings)}
      />
    </div>
  );
}
