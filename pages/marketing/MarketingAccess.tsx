import React from "react";
import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, ShieldAlert, Zap, Trophy, Crown } from "lucide-react";

const tiers = [
  {
    id: "explorer",
    name: "Explorer",
    price: "147",
    duration: "per month",
    icon: Zap,
    benefits: [
      "Initial frequency alignment",
      "Peripheral vision expansion",
      "Baseline protocol access",
      "Standard mission allocation"
    ]
  },
  {
    id: "commander",
    name: "Commander",
    price: "997",
    duration: "per year",
    icon: Trophy,
    highlight: true,
    benefits: [
      "Advanced temporal leverage",
      "Deep-state system integration",
      "Priority objective queuing",
      "Identity shielding protocols",
      "Elite community clearance"
    ]
  },
  {
    id: "founder",
    name: "Founder",
    price: "2997",
    duration: "lifetime",
    icon: Crown,
    benefits: [
      "Full sovereign autonomy",
      "The Unredacted Blueprint",
      "Legacy wealth architecture",
      "Direct neural-link support",
      "Infinite protocol updates",
      "The Final Verification"
    ]
  }
];

export default function MarketingAccess() {
  return (
    <MarketingLayout>
      <div className="py-8 sm:py-12 md:py-20 lg:py-24">
        <div className="text-center mb-8 sm:mb-12 md:mb-16 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black uppercase tracking-tight mb-4 sm:mb-6 leading-[0.9]">
            Secure Your <span className="text-primary text-glow-cyan">Clearance</span>
          </h1>
          <p className="text-zinc-500 max-w-2xl mx-auto font-medium mb-8 text-sm sm:text-base leading-relaxed px-4 italic">
            Access is strictly limited by available bandwidth. We do not recruit; we recognize those who are already looking. Select your trajectory.
          </p>
          
          <button 
            onClick={() => {
              import("@/entities").then(m => {
                const currentPath = encodeURIComponent(window.location.origin + "/?module=wallet");
                // Accessing the client options via the User entity which is superdevClient.auth
                const loginUrl = (m.User.client.options.loginUrl + "&from_url=" + currentPath).replace("/api", "");
                window.location.href = loginUrl;
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-white/5 bg-white/5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-primary hover:border-primary/20 transition-all max-w-full"
          >
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span className="truncate">Already have an Access Pass? Sign in here</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto px-4">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={tier.highlight ? "relative group" : "group"}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] z-20 shadow-[0_0_20px_rgba(0,242,255,0.5)] whitespace-nowrap">
                  Most Requested
                </div>
              )}
              
              <div className={`h-full cockpit-panel-responsive flex flex-col transition-all duration-500 group-hover:scale-[1.02] ${tier.highlight ? 'border-primary/40 ring-1 ring-primary/20 bg-primary/[0.02]' : 'border-white/5 bg-zinc-950/20'}`}>
                <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
                  <tier.icon className={`w-8 h-8 shrink-0 ${tier.highlight ? 'text-primary' : 'text-zinc-600'}`} />
                  <div className="text-right min-w-0">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-black truncate">${tier.price}</div>
                    <div className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest truncate">{tier.duration}</div>
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl lg:text-2xl font-black uppercase tracking-widest mb-4 sm:mb-6 truncate">{tier.name}</h3>

                <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-grow">
                  {tier.benefits.map((benefit, bIdx) => (
                    <li key={bIdx} className="cramp-safe-row items-center text-xs sm:text-sm text-zinc-400">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="cramp-safe-text leading-tight">{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild variant={tier.highlight ? "default" : "hud-outline"} size="lg" className="w-full uppercase font-black tracking-widest h-12 sm:h-14 text-xs sm:text-sm">
                  <Link to={`/marketing/checkout/${tier.id}`}>
                    Initiate {tier.id}
                  </Link>
                </Button>

                <div className="mt-6 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  <ShieldAlert className="w-3 h-3 shrink-0" />
                  Limited Availability
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-32 text-center max-w-2xl mx-auto px-4">
          <div className="inline-block p-6 sm:p-8 border border-white/5 rounded-2xl bg-zinc-950/30 backdrop-blur-sm">
            <h4 className="text-sm font-black uppercase tracking-widest mb-4 italic">Scarcity Warning</h4>
            <p className="text-xs text-zinc-500 leading-relaxed font-medium italic">
              Membership slots are released in batches to ensure system stability. If you are reading this, a slot is currently available for your IP address. Once the current cohort is filled, the gateway will close until the next verification cycle.
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
