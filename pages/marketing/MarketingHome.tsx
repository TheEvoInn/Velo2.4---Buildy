import React from "react";
import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, Landmark, Fingerprint, Activity } from "lucide-react";

export default function MarketingHome() {
  return (
    <MarketingLayout>
      <div className="flex flex-col items-center text-center py-8 sm:py-16 md:py-24">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-8"
        >
          <Activity className="w-3 h-3" />
          Status: Active Briefing
        </motion.div>

        <h1 className="hud-title-lg mb-8 max-w-4xl px-4">
          IMAGINE WAKING UP TO <br />
          <span className="text-primary drop-shadow-[0_0_30px_rgba(0,242,255,0.4)]">TOTAL FREEDOM</span>
        </h1>

        <p className="text-zinc-400 text-base sm:text-lg md:text-xl max-w-2xl mb-12 font-medium px-4 leading-relaxed">
          The era of noise is ending. We are constructing a bridge between who you were and who you are destined to become. A total emotional and lifestyle transformation.
        </p>

        <div className="cramp-safe-row-center justify-center mb-12 px-4">
          <Button asChild size="xl" className="hud-button-responsive w-full sm:w-auto h-16">
            <Link to="/marketing/access" className="flex items-center">
              Initialize Access <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button asChild variant="hud-outline" size="xl" className="hud-button-responsive w-full sm:w-auto h-16">
            <a href="#pillars">View Pillars</a>
          </Button>
        </div>

        <div className="mb-24">
          <button 
            onClick={() => {
              import("@/entities").then(m => {
                const currentPath = encodeURIComponent(window.location.origin + "/?module=wallet");
                const loginUrl = (superdevClient.auth.client.options.loginUrl + "&from_url=" + currentPath).replace("/api", "");
                window.location.href = loginUrl;
              });
            }}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 hover:text-primary transition-colors flex items-center gap-2"
          >
            Already a member? Sign in to your station <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Pillars */}
        <div id="pillars" className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full max-w-5xl mb-32 px-4">
          {[
            { icon: Clock, title: "Time Wealth", desc: "Reclaim every second. No more selling hours for survival. Experience the luxury of choice." },
            { icon: Fingerprint, title: "Identity Freedom", desc: "Shed the labels assigned by others. Define yourself through action and intent, not history." },
            { icon: Landmark, title: "Financial Peace", desc: "The quiet confidence of total stability. Systems that work so you don't have to." }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="cockpit-panel-responsive group hover:border-primary/30 transition-colors text-left"
            >
              <item.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-6 group-hover:scale-110 transition-transform shrink-0" />
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest mb-4 truncate">{item.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Comparison */}
        <div className="w-full max-w-5xl mb-32 px-4">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest mb-12">The Deviation Point</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-950/50 border border-white/5 p-6 sm:p-8 rounded-2xl text-left opacity-40">
              <span className="hud-label-xs text-zinc-600 block mb-4">Path A: Standard Reality</span>
              <ul className="space-y-4 text-zinc-500 text-sm">
                <li className="flex gap-2"><span>•</span> <span>Linear income growth</span></li>
                <li className="flex gap-2"><span>•</span> <span>Constant surveillance</span></li>
                <li className="flex gap-2"><span>•</span> <span>Fragmented attention</span></li>
                <li className="flex gap-2"><span>•</span> <span>Reactive decision making</span></li>
              </ul>
            </div>
            <div className="cockpit-panel-responsive rounded-2xl text-left border-primary/20 bg-primary/5">
              <span className="hud-label-xs text-primary block mb-4">Path B: VELO Protocols</span>
              <ul className="space-y-4 text-zinc-300 text-sm">
                <li className="flex gap-2"><span>•</span> <span>Exponential leverage systems</span></li>
                <li className="flex gap-2"><span>•</span> <span>Total privacy shielding</span></li>
                <li className="flex gap-2"><span>•</span> <span>Hyper-focused workflow</span></li>
                <li className="flex gap-2"><span>•</span> <span>Proactive strategic dominance</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mystery Hook */}
        <div className="w-full max-w-3xl cockpit-panel-responsive border-primary/20 bg-gradient-to-b from-primary/5 to-transparent mx-4">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest mb-6 italic">The Secret Protocol</h2>
          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed font-medium italic">
            By <span className="redacted">combining past work with future goals</span>, we have unlocked a recursive feedback loop that <span className="redacted">automates human intent</span>. This is not just technology; it's a <span className="redacted">paradigm shift in human sovereignty</span>.
          </p>
          <div className="mt-10 flex justify-center">
            <div className="px-4 py-2 rounded bg-black border border-white/10 font-mono text-[10px] text-zinc-600 uppercase tracking-widest overflow-hidden truncate max-w-full">
              ENCRYPTION KEY: ********************
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
