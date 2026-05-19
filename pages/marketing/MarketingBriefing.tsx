import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Shield, 
  Sparkles, 
  Clock, 
  Landmark, 
  Fingerprint, 
  Lock, 
  ArrowRight, 
  LayoutDashboard,
  ShieldAlert,
  Search
} from "lucide-react";

export default function MarketingBriefing() {
  const navigate = useNavigate();
  const memberName = sessionStorage.getItem("marketing_member_name") || "Commander";
  const memberId = sessionStorage.getItem("marketing_member_id");
  const isPending = !memberId && sessionStorage.getItem("marketing_payment_pending") === "true";

  // If no member ID is present in session, they might be accessing this prematurely
  // or after a manual payment submission. 
  if (!memberId) {
    return (
      <MarketingLayout>
        <div className="max-w-2xl mx-auto py-24 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-8">
            {isPending ? <Clock className="w-10 h-10 text-amber-500 animate-pulse" /> : <Search className="w-10 h-10 text-amber-500" />}
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-6 leading-none">
            {isPending ? <>Verification <span className="text-amber-500 text-glow-amber">Pending</span></> : <>Clearance <span className="text-amber-500 text-glow-amber">Unverified</span></>}
          </h1>
          <p className="text-zinc-500 text-lg mb-12 italic leading-relaxed">
            {isPending 
              ? "Your protocol activation is awaiting manual verification by VELO Command. You will be notified once your clearance is approved."
              : "We could not verify an active protocol activation for your current session. If you recently submitted a manual payment, it is likely still under review."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hud" size="xl" className="h-16 uppercase font-black tracking-widest px-12" onClick={() => navigate("/marketing/access")}>
              View Access Passes
            </Button>
            <Button variant="hud-outline" size="xl" className="h-16 uppercase font-black tracking-widest px-12" onClick={() => navigate("/")}>
              Return Home
            </Button>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="max-w-4xl mx-auto py-8 sm:py-16 md:py-24 px-2 sm:px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-14 h-14 sm:w-20 md:w-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 sm:mb-12 shadow-[0_0_40px_rgba(0,242,255,0.15)]"
        >
          <Sparkles className="w-6 h-6 sm:w-10 md:w-12 text-primary shrink-0" />
        </motion.div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black uppercase tracking-tight mb-8 leading-[0.9] px-4">
          Welcome to Your <br />
          <span className="text-primary text-glow-cyan drop-shadow-[0_0_30px_rgba(0,242,255,0.4)]">New Life</span>
        </h1>

        <p className="text-zinc-500 text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto mb-10 sm:mb-16 font-medium leading-relaxed italic px-4">
          Greetings, {memberName.split(' ')[0]}. Your clearance has been fully activated. The transformation has officially begun. Your old trajectory has been terminated.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-16 sm:mb-24 px-4">
          {[
            { icon: Clock, title: "Time Wealth", desc: "Protocol sequence initialized. Estimated freedom gain: +85%." },
            { icon: Fingerprint, title: "Identity Freedom", desc: "Old data scrubbed. New signature locked for Jan 1." },
            { icon: Landmark, title: "Financial Peace", desc: "Strategic asset alignment active. Stability confirmed." }
          ].map((item, idx) => (
            <div key={idx} className="cockpit-panel-responsive border-white/5 bg-zinc-950/20 text-left p-6">
              <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-4 shrink-0" />
              <h3 className="text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-[0.15em] mb-2 truncate">{item.title}</h3>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 leading-relaxed font-mono italic">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="w-full max-w-2xl mx-auto cockpit-panel-responsive border-primary/20 bg-primary/5 mb-24 text-left relative overflow-hidden mx-4">
          <div className="absolute top-2 right-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-red-500">Classified Stream</span>
          </div>
          
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest mb-6 italic">Member Capability Briefing</h2>
          
          <div className="space-y-6">
            <p className="text-zinc-400 leading-relaxed text-sm italic">
              Your member ID is now <span className="redacted">synchronized with the global Velo core</span>. This allows you to <span className="redacted">extract value from market inefficiencies</span> while maintaining <span className="redacted">total anonymity</span>.
            </p>
            <p className="text-zinc-400 leading-relaxed text-sm italic">
              Current beta capability: <span className="redacted">Autonomous asset reallocation</span>. Estimated activation window: <span className="redacted">14 days prior to target date</span>.
            </p>
            <div className="pt-6 border-t border-white/10 text-primary text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] italic">
              Your transformation begins January 1, 2027.
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 px-4">
          <Button asChild size="xl" className="hud-button-responsive hud w-full sm:w-auto h-20 uppercase font-black tracking-widest px-12">
            <Link to="/">
              Enter Intelligence Deck <LayoutDashboard className="ml-3 w-6 h-6" />
            </Link>
          </Button>
          
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest max-w-xs leading-relaxed italic">
            Note: Sign into the station core with the same email address you used during checkout. Non-members will be denied entry.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" />
              Secure Tunnel
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-zinc-800" />
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 shrink-0" />
              Verified Profile
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
