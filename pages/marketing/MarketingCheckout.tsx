import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  Lock, 
  CreditCard, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Wallet, 
  Bitcoin,
  ChevronRight,
  Info
} from "lucide-react";
import { MarketingMember, MarketingPaymentProof } from "@/entities";
import { useToast } from "@/hooks/use-toast";
import { contacts, events } from "@/integrations/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tiersData: any = {
  explorer: { name: "Explorer Pass", price: 147, duration: "monthly" },
  commander: { name: "Commander Pass", price: 997, duration: "yearly" },
  founder: { name: "Founder Pass", price: 2997, duration: "lifetime" }
};

const paymentMethods = [
  { id: "paypal", name: "PayPal", icon: CreditCard, instructions: "Send payment to payments@velo.system" },
  { id: "stripe", name: "Stripe / Card", icon: Shield, instructions: "Complete transfer via secure link" }
];

export default function MarketingCheckout() {
  const { tier } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    payment_method: "",
    payment_reference: "",
    proof_notes: ""
  });

  const tierInfo = tiersData[tier || "explorer"];

  if (!tierInfo) {
    return (
      <MarketingLayout>
        <div className="py-24 text-center">
          <h2 className="text-2xl font-black uppercase tracking-widest text-red-500 mb-4 px-4">Invalid Clearance Tier</h2>
          <Button variant="outline" onClick={() => navigate("/marketing/access")}>Return to Access</Button>
        </div>
      </MarketingLayout>
    );
  }

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !formData.payment_method) return;
    setLoading(true);

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      const tierName = tierInfo.name;

      // Create Payment Proof record (Pending Review)
      await MarketingPaymentProof.create({
        name: formData.name,
        email: normalizedEmail,
        tier: tier as string,
        amount: tierInfo.price,
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        proof_notes: formData.proof_notes,
        status: "pending",
        submitted_at: new Date().toISOString()
      });

      // CRM Integration: Capture lead with pending status
      try {
        await contacts({
          email: normalizedEmail,
          first_name: formData.name.split(' ')[0],
          last_name: formData.name.split(' ').slice(1).join(' ') || "",
          tags: ["marketing", "payment-pending", tier as string],
          contact_stage: "lead",
          append_notes: `Manual Payment Submitted: ${formData.payment_method}. Ref: ${formData.payment_reference}`
        });
      } catch (crmError) {
        console.warn("CRM lead capture failed:", crmError);
      }

      setSubmitted(true);
      setLoading(false);
      
      // Store pending status in session
      sessionStorage.setItem("marketing_payment_pending", "true");
      sessionStorage.setItem("marketing_member_email", normalizedEmail);
      sessionStorage.setItem("marketing_member_name", formData.name);
      
      toast({
        title: "Submission Received",
        description: "Your payment proof is under review. You will be notified once access is granted."
      });

    } catch (error) {
      console.error("Checkout failed:", error);
      toast({
        title: "Submission Error",
        description: "Failed to record payment proof. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <MarketingLayout>
        <div className="max-w-2xl mx-auto py-24 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse-neon">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-6 leading-none">Review <span className="text-amber-500 text-glow-amber">Pending</span></h1>
          <p className="text-zinc-500 text-lg mb-12 italic leading-relaxed">
            Your payment proof has been transmitted to the VELO High Command. Access will be granted once verification is complete. Please monitor your secure email for confirmation.
          </p>
          <div className="p-6 rounded-xl bg-zinc-950 border border-white/5 text-left mb-12">
            <div className="hud-label-xs text-zinc-600 mb-4 uppercase">Submission Summary</div>
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <div className="text-zinc-500 uppercase tracking-widest mb-1">Identity</div>
                <div className="font-mono text-zinc-300 uppercase truncate">{formData.name}</div>
              </div>
              <div>
                <div className="text-zinc-500 uppercase tracking-widest mb-1">Method</div>
                <div className="font-mono text-zinc-300 uppercase">{formData.payment_method.replace('_', ' ')}</div>
              </div>
              <div className="col-span-2">
                <div className="text-zinc-500 uppercase tracking-widest mb-1">Secure Email</div>
                <div className="font-mono text-zinc-300 truncate">{formData.email}</div>
              </div>
            </div>
          </div>
          <Button variant="hud-outline" size="xl" className="h-16 uppercase font-black tracking-widest px-12" onClick={() => navigate("/")}>
            Return to Station Core
          </Button>
        </div>
      </MarketingLayout>
    );
  }

  const selectedMethod = paymentMethods.find(m => m.id === formData.payment_method);

  return (
    <MarketingLayout>
      <div className="max-w-4xl mx-auto py-8 sm:py-12 md:py-20 lg:py-24 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          <div className="space-y-6 sm:space-y-8">
            <div className="px-2 sm:px-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black uppercase tracking-tight mb-4 leading-[0.9]">Final <span className="text-primary text-glow-cyan">Verification</span></h1>
              <p className="text-zinc-500 font-medium text-sm sm:text-base leading-relaxed italic max-w-md">Verify your identity and submit payment proof to activate your protocols.</p>
            </div>

            <div className="cockpit-panel-responsive border-white/10 bg-zinc-950/50">
              <h3 className="hud-label-xs mb-4 sm:mb-6 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                Order Summary
              </h3>
              
              <div className="flex justify-between items-end mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-white/5 gap-4">
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black uppercase tracking-widest truncate">{tierInfo.name}</div>
                  <div className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest truncate">{tierInfo.duration} access</div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-primary shrink-0">${tierInfo.price}</div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 gap-4">
                  <span className="truncate">Processing Fee</span>
                  <span className="shrink-0">$0.00</span>
                </div>
                <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 gap-4">
                  <span className="truncate">Manual Verification</span>
                  <span className="shrink-0 text-amber-500/60">Required</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm font-black uppercase tracking-widest mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/5 gap-4">
                  <span className="truncate">Total Due</span>
                  <span className="text-primary text-glow-cyan shrink-0">${tierInfo.price}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-500/80 leading-tight">
                Manual Approval Path Active • Verification takes 12-24 hours
              </div>
            </div>
          </div>

          <Card className="cockpit-panel border-white/10 bg-zinc-950/20 backdrop-blur-xl">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleProcess} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="hud-label-xs">Full Legal Name</Label>
                  <Input 
                    id="name" 
                    required 
                    placeholder="JOHN DOE"
                    className="bg-black/50 border-white/10 h-12 uppercase font-mono tracking-widest focus:border-primary/50 text-xs sm:text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="hud-label-xs">Secure Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    placeholder="IDENTITY@VELO.SYSTEM"
                    className="bg-black/50 border-white/10 h-12 font-mono tracking-widest focus:border-primary/50 text-xs sm:text-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="space-y-2">
                    <Label className="hud-label-xs">Payment Method</Label>
                    <Select value={formData.payment_method} onValueChange={(val) => setFormData({ ...formData, payment_method: val })}>
                      <SelectTrigger className="bg-black/50 border-white/10 h-12 uppercase font-black tracking-widest focus:border-primary/50 text-[10px]">
                        <SelectValue placeholder="CHOOSE PAYMENT CHANNEL" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-white/10">
                        {paymentMethods.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-[10px] uppercase font-black tracking-widest">
                            <div className="flex items-center gap-2">
                              <m.icon className="w-3 h-3" />
                              {m.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMethod && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <selectedMethod.icon className="w-3 h-3" />
                        Transfer Instructions
                      </div>
                      <div className="text-xs font-mono text-zinc-300 break-all bg-black/40 p-3 rounded border border-white/5">
                        {selectedMethod.instructions}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reference" className="hud-label-xs">Transaction / Order ID</Label>
                    <Input 
                      id="reference" 
                      required 
                      placeholder="ENTER REFERENCE CODE"
                      className="bg-black/50 border-white/10 h-12 uppercase font-mono tracking-widest focus:border-primary/50 text-xs sm:text-sm"
                      value={formData.payment_reference}
                      onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="hud-label-xs">Submission Notes (Optional)</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="ADDITIONAL INTEL OR PROOF DETAILS..."
                      className="bg-black/50 border-white/10 min-h-[80px] font-mono tracking-tight focus:border-primary/50 text-xs resize-none"
                      value={formData.proof_notes}
                      onChange={(e) => setFormData({ ...formData, proof_notes: e.target.value })}
                    />
                  </div>

                  <Button type="submit" size="xl" disabled={loading || !formData.payment_method} className="w-full hud h-16 py-0 uppercase font-black tracking-widest">
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>Submit Proof for Review <ArrowRight className="ml-2 w-6 h-6" /></>
                    )}
                  </Button>

                  <p className="text-[9px] text-center text-zinc-600 uppercase tracking-widest leading-relaxed italic px-2">
                    Submissions are manually verified by VELO Command. Fraudulent attempts will result in permanent identity termination.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  );
}
