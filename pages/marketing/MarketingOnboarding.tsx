import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Calendar, Bell, Rocket, ArrowRight, Loader2, FileText, CheckCircle2, Activity } from "lucide-react";
import { MarketingOnboarding as MarketingOnboardingEntity, MarketingMember } from "@/entities";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { contacts, events } from "@/integrations/core";

export default function MarketingOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: sessionStorage.getItem("marketing_member_name") || "",
    email: sessionStorage.getItem("marketing_member_email") || "",
    nda_signed: false,
    jan1_confirmed: false,
    beta_opt_in: true,
    email_promotions: true,
    email_updates: true,
    email_community: true,
    optional_feedback: ""
  });

  useEffect(() => {
    const storedId = sessionStorage.getItem("marketing_member_id");
    const isPending = sessionStorage.getItem("marketing_payment_pending") === "true";
    
    if (!storedId) {
      if (isPending) {
        // Just let the render handle the pending UI if we're on the right route
        return;
      }
      toast({
        title: "Session Lost",
        description: "Please complete the checkout process first.",
        variant: "destructive"
      });
      navigate("/marketing/access");
    } else {
      setMemberId(storedId);
    }
  }, [navigate, toast]);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleFinalActivation = async () => {
    if (!memberId) return;
    setLoading(true);

    try {
      // Create Onboarding record
      await MarketingOnboardingEntity.create({
        member_id: memberId,
        nda_signed: formData.nda_signed,
        jan1_confirmed: formData.jan1_confirmed,
        beta_opt_in: formData.beta_opt_in,
        email_promotions: formData.email_promotions,
        email_updates: formData.email_updates,
        email_community: formData.email_community,
        optional_feedback: formData.optional_feedback,
        timestamp: new Date().toISOString()
      });

      // Update Member status
      await MarketingMember.update(memberId, {
        onboarding_complete: true
      });

      // Update CRM contact with onboarding details
      try {
        const tags = ["marketing", "onboarding-complete"];
        if (formData.beta_opt_in) tags.push("beta-tester");
        
        await contacts({
          email: formData.email,
          tags: tags,
          append_notes: `NDA Signed: ${formData.nda_signed}. Jan 1 Confirmed: ${formData.jan1_confirmed}. Feedback: ${formData.optional_feedback}`
        });

        // Trigger onboarding completion event
        await events({
          event_name: "marketing_onboarding_completed",
          contact_email: formData.email,
          properties: {
            beta_opt_in: formData.beta_opt_in,
            timestamp: new Date().toISOString()
          }
        });
      } catch (crmError) {
        console.warn("CRM sync failed during onboarding:", crmError);
      }

      toast({
        title: "Clearance Activated",
        description: "Your protocol activation is complete."
      });

      setTimeout(() => {
        navigate("/marketing/briefing");
      }, 1500);

    } catch (error) {
      console.error("Onboarding activation failed:", error);
      toast({
        title: "Activation Error",
        description: "Failed to save onboarding data. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const isPending = !memberId && sessionStorage.getItem("marketing_payment_pending") === "true";

  if (isPending) {
    return (
      <MarketingLayout>
        <div className="max-w-2xl mx-auto py-24 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse-neon">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-6 leading-none italic">Verification <span className="text-amber-500 text-glow-amber">In Progress</span></h2>
          <p className="text-zinc-500 text-sm sm:text-base mb-10 leading-relaxed italic max-w-md mx-auto">
            Your manual payment proof is currently being reviewed by VELO Command. Onboarding will be unlocked once your clearance is approved.
          </p>
          <div className="p-6 rounded-xl bg-zinc-950 border border-white/5 text-left mb-10">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <Activity className="w-4 h-4 shrink-0" />
              <span className="hud-label-xs">Review Status: PENDING</span>
            </div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest leading-relaxed">
              Standard review time: 12-24 hours. You will receive an automated transmission at <span className="text-zinc-400">{sessionStorage.getItem("marketing_member_email")}</span> once verified.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hud" className="h-14 px-10 uppercase tracking-widest" onClick={() => navigate("/marketing/access")}>
              Return to Access Hub
            </Button>
            <Button variant="hud-outline" className="h-14 px-10 uppercase tracking-widest" onClick={() => window.location.reload()}>
              Check Status
            </Button>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="flex items-center gap-3 text-primary mb-2">
              <FileText className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sequence 01</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-[1.1]">Non-Disclosure <span className="text-primary text-glow-cyan">Agreement</span></h2>
            <p className="text-zinc-500 text-sm leading-relaxed italic">The protocols you are about to witness are strictly classified. By continuing, you agree not to disclose any details.</p>
            
            <div className="p-4 sm:p-6 rounded-xl bg-zinc-950 border border-white/5 font-mono text-[9px] sm:text-[10px] text-zinc-600 h-40 sm:h-48 overflow-y-auto leading-relaxed italic">
              [CLASSIFIED DOCUMENT v2.7]<br/><br/>
              1. CONFIDENTIALITY: The Member agrees that all information, blueprints, and protocol details are proprietary...<br/>
              2. USE OF DATA: The VELO system uses advanced recursive feedback loops to align temporal wealth...<br/>
              3. DISCLOSURE: Any unauthorized leak of system capabilities will result in immediate protocol termination...<br/>
              4. ACTIVATION: The transformation begins Jan 1, 2027. No early exits allowed once the neural link is established...
            </div>

            <div className="space-y-4">
              <div className="cramp-safe-row items-center gap-3">
                <Checkbox 
                  id="nda" 
                  checked={formData.nda_signed} 
                  onCheckedChange={(checked) => setFormData({...formData, nda_signed: !!checked})} 
                  className="shrink-0 mt-0.5"
                />
                <Label htmlFor="nda" className="cramp-safe-text text-[11px] sm:text-xs md:text-sm font-medium text-zinc-300 leading-tight">I agree to the non-disclosure terms and sign my digital fingerprint.</Label>
              </div>
              <Input 
                placeholder="TYPE FULL NAME TO SIGN" 
                className="bg-black border-white/10 uppercase tracking-widest font-mono text-xs sm:text-sm h-12 px-4"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <Button size="xl" className="hud w-full h-14 sm:h-16 py-0 uppercase tracking-widest text-xs sm:text-sm" disabled={!formData.nda_signed || !formData.name} onClick={nextStep}>
              Verify Signature <ArrowRight className="ml-2 w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="flex items-center gap-3 text-primary mb-2">
              <Calendar className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sequence 02</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-none">Timeline <span className="text-primary">Confirmation</span></h2>
            <p className="text-zinc-500 text-sm leading-relaxed italic">The launch window is fixed. You must confirm your attendance for the mandatory briefing on January 1, 2027.</p>
            
            <div className="cockpit-panel-responsive text-center border-primary/20 bg-primary/5">
              <div className="hud-label-xs text-primary mb-2">Target Date</div>
              <div className="text-3xl sm:text-4xl font-black tracking-tighter mb-4 text-glow-cyan">JAN 01, 2027</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">00:00:00 UTC</div>
            </div>

            <div className="cramp-safe-row items-center p-4 rounded-lg bg-zinc-950 border border-white/5">
              <Checkbox 
                id="jan1" 
                checked={formData.jan1_confirmed} 
                onCheckedChange={(checked) => setFormData({...formData, jan1_confirmed: !!checked})} 
                className="shrink-0"
              />
              <Label htmlFor="jan1" className="cramp-safe-text text-[11px] sm:text-xs text-zinc-400 leading-relaxed italic">
                I confirm that I will be present for the system integration on Jan 1, 2027. Missing this window may result in protocol desync.
              </Label>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hud-outline" className="flex-1 h-14 uppercase tracking-widest" onClick={prevStep}>Back</Button>
              <Button size="xl" className="hud flex-[2] h-14 uppercase tracking-widest" disabled={!formData.jan1_confirmed} onClick={nextStep}>
                Confirm Timeline <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="flex items-center gap-3 text-primary mb-2">
              <Bell className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sequence 03</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-none">Permission <span className="text-primary">Protocols</span></h2>
            <p className="text-zinc-500 text-sm leading-relaxed italic">Configure your communication channels and beta preferences for the upcoming transformation.</p>
            
            <div className="space-y-6">
              <div className="cramp-safe-row-center p-4 rounded-lg bg-zinc-950 border border-white/5">
                <div className="cramp-safe-text">
                  <Label className="text-xs sm:text-sm font-bold uppercase tracking-widest">Beta Protocol Opt-in</Label>
                  <p className="text-[10px] text-zinc-500 mt-1">Participate in experimental wealth generation modules early.</p>
                </div>
                <Checkbox checked={formData.beta_opt_in} onCheckedChange={(c) => setFormData({...formData, beta_opt_in: !!c})} className="shrink-0" />
              </div>

              <div className="space-y-4">
                <h4 className="hud-label-xs text-zinc-600 ml-1">Communication Channels</h4>
                {[
                  { id: "email_promotions", label: "Strategic Promotions", desc: "Rare asset acquisition alerts." },
                  { id: "email_updates", label: "System Updates", desc: "Technical briefings and protocol shifts." },
                  { id: "email_community", label: "Elite Community", desc: "Connect with verified Commanders." }
                ].map((item) => (
                  <div key={item.id} className="cramp-safe-row-center p-4 rounded-lg bg-zinc-900/30 border border-white/5">
                    <div className="cramp-safe-text">
                      <Label className="text-[11px] sm:text-xs font-bold uppercase tracking-widest truncate block">{item.label}</Label>
                      <p className="text-[10px] text-zinc-600 truncate">{item.desc}</p>
                    </div>
                    <Checkbox 
                      checked={(formData as any)[item.id]} 
                      onCheckedChange={(c) => setFormData({...formData, [item.id]: !!c})} 
                      className="shrink-0"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4">
                <Label className="hud-label-xs text-zinc-600">Optional Feedback</Label>
                <Textarea
                  placeholder="Share any intel or questions..."
                  className="bg-zinc-950 border-white/10 text-[11px] font-mono text-zinc-400 min-h-[80px] resize-none focus:border-primary/40 tracking-tight leading-relaxed italic"
                  value={formData.optional_feedback}
                  onChange={(e) => setFormData({...formData, optional_feedback: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hud-outline" className="flex-1 h-14 uppercase tracking-widest" onClick={prevStep}>Back</Button>
              <Button size="xl" className="hud flex-[2] h-14 uppercase tracking-widest" onClick={nextStep}>
                Verify Permissions <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full border-2 border-primary/20 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
                <ShieldCheck className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-4 leading-none">Final <span className="text-primary text-glow-cyan">Activation</span></h2>
            <p className="text-zinc-500 text-sm sm:text-base max-w-md mx-auto mb-10 leading-relaxed italic">
              All sequences are green. Your timeline is locked. Click below to activate your clearance.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-10">
              <div className="p-4 rounded-lg bg-zinc-950 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Identity</div>
                <div className="text-xs font-black uppercase tracking-widest text-zinc-300 truncate">{formData.name}</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-950 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Target Date</div>
                <div className="text-xs font-black uppercase tracking-widest text-zinc-300">JAN 01, 2027</div>
              </div>
            </div>

            <Button size="xl" className="hud w-full h-20 uppercase font-black tracking-widest" onClick={handleFinalActivation} disabled={loading}>
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <>Activate Clearance <Rocket className="ml-3 w-8 h-8" /></>}
            </Button>

            <button onClick={prevStep} className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors uppercase">
              Restart Sequence
            </button>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <MarketingLayout>
      <div className="max-w-2xl mx-auto py-8 sm:py-16 md:py-24 px-4">
        {/* Progress Rail */}
        <div className="flex gap-1.5 sm:gap-2 mb-12 sm:mb-16">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-primary shadow-[0_0_10px_rgba(0,242,255,0.5)]' : 'bg-white/5'}`} />
          ))}
        </div>

        <div className="cockpit-panel-responsive border-white/10 bg-zinc-950/20 backdrop-blur-xl relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Activity className="w-24 h-24 text-primary" />
          </div>
          {renderStep()}
        </div>
      </div>
    </MarketingLayout>
  );
}
