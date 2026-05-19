import React, { useState, useEffect, useMemo } from "react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { 
  MarketingMember, 
  MarketingOnboarding,
  MarketingPaymentProof,
  VeloContentArchiveItem,
  User
} from "@/entities";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  DollarSign, 
  CheckCircle, 
  TestTube, 
  Download, 
  Search, 
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  ShieldCheck,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { contacts, events } from "@/integrations/core";

export default function MarketingAdminDashboard() {
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [betaFilter, setBetaFilter] = useState("all");

  const fetchData = async () => {
    try {
      const [mList, oList, pList] = await Promise.all([
        MarketingMember.list("-purchase_date", 1000),
        MarketingOnboarding.list("-timestamp", 1000),
        MarketingPaymentProof.list("-submitted_at", 1000)
      ]);
      setMembers(mList);
      setOnboardings(oList);
      setPaymentProofs(pList);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onboardingMap = useMemo(() => {
    const map: any = {};
    onboardings.forEach(o => {
      map[o.member_id] = o;
    });
    return map;
  }, [onboardings]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = 
        m.name?.toLowerCase().includes(search.toLowerCase()) || 
        m.email?.toLowerCase().includes(search.toLowerCase());
      
      const matchesTier = tierFilter === "all" || m.tier === tierFilter;
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "complete" && m.onboarding_complete) ||
        (statusFilter === "pending" && !m.onboarding_complete);

      const onboarding = onboardingMap[m.id];
      const matchesBeta = betaFilter === "all" || 
        (betaFilter === "yes" && onboarding?.beta_opt_in) ||
        (betaFilter === "no" && !onboarding?.beta_opt_in);

      return matchesSearch && matchesTier && matchesStatus && matchesBeta;
    });
  }, [members, search, tierFilter, statusFilter, betaFilter, onboardingMap]);

  const metrics = useMemo(() => {
    const total = members.length;
    const revenue = members.reduce((sum, m) => sum + (m.revenue || 0), 0);
    const complete = members.filter(m => m.onboarding_complete).length;
    const rate = total > 0 ? (complete / total) * 100 : 0;
    const pendingProofs = paymentProofs.filter(p => p.status === "pending").length;

    return {
      total,
      revenue,
      rate,
      pendingProofs
    };
  }, [members, paymentProofs]);

  const handleApprovePayment = async (proof: any) => {
    if (actionLoading) return;
    setActionLoading(proof.id);
    
    try {
      const me = await User.me().catch(() => null);
      const normalizedEmail = proof.email.toLowerCase();
      
      // 1. Create or Update MarketingMember
      let member: any;
      const existing = members.find(m => m.email?.toLowerCase() === normalizedEmail);
      
      if (existing) {
        member = await MarketingMember.update(existing.id, {
          name: proof.name,
          purchase_date: new Date().toISOString(),
          revenue: (existing.revenue || 0) + (proof.amount || 0)
        });
      } else {
        member = await MarketingMember.create({
          name: proof.name,
          email: normalizedEmail,
          tier: proof.tier,
          purchase_date: new Date().toISOString(),
          revenue: proof.amount,
          onboarding_complete: false
        });
      }

      // 2. Create safe archive record
      const archive = await VeloContentArchiveItem.create({
        owner_email: normalizedEmail,
        title: `Manual Payment Approved: ${proof.tier.toUpperCase()}`,
        content_type: "report",
        source_department: "Marketing Admin",
        source_module: "payment-review",
        body: `Manual payment proof approved by ${me?.email || 'System'}.\n\nMethod: ${proof.payment_method}\nReference: ${proof.payment_reference}\nAmount: $${proof.amount}\nNotes: ${proof.proof_notes || 'N/A'}`,
        status: "archived",
        visibility: "admin",
        tags: ["payment", "manual-approval", proof.tier],
        metadata: {
          proof_id: proof.id,
          member_id: member.id,
          payment_method: proof.payment_method,
          payment_reference: proof.payment_reference
        }
      });

      // 3. Update Payment Proof record
      await MarketingPaymentProof.update(proof.id, {
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by_email: me?.email || "system",
        linked_member_id: member.id,
        archive_item_id: archive.id
      });

      // 4. CRM Update
      try {
        await contacts({
          email: normalizedEmail,
          first_name: proof.name.split(' ')[0],
          last_name: proof.name.split(' ').slice(1).join(' ') || "",
          tags: ["marketing", "buyer", proof.tier, "manual-pay"],
          contact_stage: "customer",
          append_notes: `Manual payment approved: ${proof.payment_method}. Ref: ${proof.payment_reference}`
        });

        await events({
          event_name: "marketing_purchase_completed",
          contact_email: normalizedEmail,
          properties: {
            tier: proof.tier,
            amount: proof.amount,
            purchase_date: new Date().toISOString(),
            member_id: member.id,
            source: "manual_payment_approval",
            payment_method: proof.payment_method,
            proof_id: proof.id
          }
        });
      } catch (crmErr) {
        console.warn("CRM sync warning during approval:", crmErr);
      }

      toast({
        title: "Payment Approved",
        description: `Member protocols activated for ${proof.email}.`
      });

      await fetchData();
    } catch (error) {
      console.error("Approval failed:", error);
      toast({
        title: "Approval Error",
        description: "System failed to process the activation. Check logs.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPayment = async (proof: any) => {
    if (actionLoading) return;
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    
    setActionLoading(proof.id);
    try {
      const me = await User.me().catch(() => null);
      await MarketingPaymentProof.update(proof.id, {
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by_email: me?.email || "system",
        review_notes: reason
      });

      toast({
        title: "Submission Rejected",
        description: `Payment proof for ${proof.email} has been denied.`
      });

      await fetchData();
    } catch (error) {
      console.error("Rejection failed:", error);
      toast({
        title: "Error",
        description: "Failed to update record status.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Tier", "Revenue", "Purchase Date", "Onboarding Status", "Beta Opt-in"];
    const rows = filteredMembers.map(m => {
      const onboarding = onboardingMap[m.id];
      return [
        m.name,
        m.email,
        m.tier,
        m.revenue,
        new Date(m.purchase_date).toLocaleDateString(),
        m.onboarding_complete ? "Complete" : "Pending",
        onboarding?.beta_opt_in ? "Yes" : "No"
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `marketing_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MarketingLayout>
      <div className="py-8 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Activity className="w-4 h-4 shrink-0" />
              <span className="hud-label-xs">Intelligence Summary</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none">Marketing <span className="text-primary text-glow-cyan">Admin</span></h1>
          </div>
          
          <Button variant="hud-outline" size="lg" onClick={exportCSV} className="gap-2 w-full md:w-auto h-12 uppercase tracking-widest">
            <Download className="w-4 h-4 shrink-0" /> Export CSV
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
          {[
            { label: "Total Members", value: metrics.total, icon: Users, color: "text-blue-400" },
            { label: "Total Revenue", value: `$${metrics.revenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
            { label: "Completion Rate", value: `${metrics.rate.toFixed(1)}%`, icon: CheckCircle, color: "text-amber-400" },
            { label: "Pending Reviews", value: metrics.pendingProofs, icon: Clock, color: "text-purple-400" }
          ].map((m, idx) => (
            <Card key={idx} className="cockpit-panel-responsive border-white/5 bg-zinc-950/20">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <span className="hud-label-xs text-zinc-500 truncate">{m.label}</span>
                  <m.icon className={`w-4 h-4 shrink-0 ${m.color}`} />
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight truncate">{m.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="members" className="w-full px-2">
          <TabsList className="bg-zinc-900 border-white/5 p-1 h-14 mb-8">
            <TabsTrigger value="members" className="data-[state=active]:bg-zinc-800 uppercase font-black tracking-widest text-[10px] h-full px-8">Member Intelligence</TabsTrigger>
            <TabsTrigger value="proofs" className="data-[state=active]:bg-zinc-800 uppercase font-black tracking-widest text-[10px] h-full px-8 relative">
              Payment Reviews
              {metrics.pendingProofs > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-black rounded-full flex items-center justify-center text-[8px] font-black animate-pulse">
                  {metrics.pendingProofs}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 shrink-0" />
                <Input 
                  placeholder="Search by name or email..." 
                  className="pl-10 bg-black/50 border-white/10 text-xs font-mono tracking-wider h-12"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-full bg-black/50 border-white/10 text-[10px] sm:text-xs uppercase font-black tracking-widest h-12">
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10">
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="explorer">Explorer</SelectItem>
                    <SelectItem value="commander">Commander</SelectItem>
                    <SelectItem value="founder">Founder</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1 lg:w-[140px] bg-black/50 border-white/10 text-xs uppercase font-black tracking-widest h-12">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={betaFilter} onValueChange={setBetaFilter}>
                  <SelectTrigger className="flex-1 lg:w-[140px] bg-black/50 border-white/10 text-xs uppercase font-black tracking-widest h-12">
                    <SelectValue placeholder="Beta" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10">
                    <SelectItem value="all">All Beta</SelectItem>
                    <SelectItem value="yes">Opted In</SelectItem>
                    <SelectItem value="no">Not Opted In</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="cockpit-panel rounded-xl border-white/5 bg-zinc-950/20 overflow-x-auto">
              <div className="min-w-[800px]">
                <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-6">Identity</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-4 text-center">Tier</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-4 text-center">Revenue</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-4 text-center">Onboarding</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-4 text-center">Beta</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-6 text-right">Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-zinc-500 font-mono text-xs italic">
                        Scanning database...
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-zinc-500 font-mono text-xs italic">
                        No records match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers.map((m) => {
                    const onboarding = onboardingMap[m.id];
                    return (
                      <TableRow key={m.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="py-6 px-6">
                          <div className="flex flex-col min-w-0">
                            <span className="font-black uppercase tracking-widest text-zinc-200 text-xs truncate">{m.name}</span>
                            <span className="text-[10px] font-mono text-zinc-600 truncate">{m.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-4">
                          <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest border-white/10 ${m.tier === 'founder' ? 'text-primary' : m.tier === 'commander' ? 'text-amber-400' : 'text-blue-400'}`}>
                            {m.tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-zinc-400 px-4">
                          ${m.revenue}
                        </TableCell>
                        <TableCell className="text-center px-4">
                          {m.onboarding_complete ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center justify-center gap-1.5 whitespace-nowrap">
                              <CheckCircle className="w-3 h-3 shrink-0" /> Complete
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 whitespace-nowrap">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center px-4">
                          {onboarding?.beta_opt_in ? (
                            <div className="w-2 h-2 rounded-full bg-purple-500 mx-auto shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-white/5 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[10px] text-zinc-600 py-6 px-6 whitespace-nowrap">
                          {new Date(m.purchase_date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="proofs" className="space-y-6">
          <div className="cockpit-panel rounded-xl border-white/5 bg-zinc-950/20 overflow-x-auto">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-6">Submitter</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-4">Tier / Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-4">Method / Ref</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-4">Notes</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-4 text-center">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-zinc-500 font-mono text-xs italic">
                        Scanning queue...
                      </TableCell>
                    </TableRow>
                  ) : paymentProofs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-zinc-500 font-mono text-xs italic">
                        No payment submissions found.
                      </TableCell>
                    </TableRow>
                  ) : paymentProofs.map((p) => (
                    <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="py-6 px-6">
                        <div className="flex flex-col min-w-0">
                          <span className="font-black uppercase tracking-widest text-zinc-200 text-xs truncate">{p.name}</span>
                          <span className="text-[10px] font-mono text-zinc-600 truncate">{p.email}</span>
                          <span className="text-[8px] text-zinc-700 mt-1 uppercase font-black">{new Date(p.submitted_at).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-col">
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest mb-1 w-fit">{p.tier}</Badge>
                          <span className="font-mono text-xs text-primary">${p.amount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{p.payment_method?.replace('_', ' ')}</span>
                          <span className="text-[9px] font-mono text-zinc-600 truncate max-w-[150px]">{p.payment_reference}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        {p.proof_notes ? (
                          <div className="group relative cursor-help">
                            <MessageSquare className="w-4 h-4 text-zinc-700" />
                            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-zinc-900 border border-white/10 rounded-lg text-[10px] italic leading-relaxed text-zinc-400 hidden group-hover:block z-50 shadow-2xl">
                              {p.proof_notes}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-800">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center px-4">
                        <Badge className={`text-[8px] font-black uppercase tracking-widest ${
                          p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                          p.status === 'rejected' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                          'bg-amber-500/20 text-amber-500 border-amber-500/30 animate-pulse'
                        }`}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-6 px-6">
                        {p.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="hud-outline" 
                              className="h-8 w-8 p-0 border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleRejectPayment(p)}
                              disabled={!!actionLoading}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="hud" 
                              className="h-8 px-3 text-[9px] font-black uppercase tracking-widest"
                              onClick={() => handleApprovePayment(p)}
                              disabled={!!actionLoading}
                            >
                              {actionLoading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 mr-1.5" />}
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono text-zinc-700 italic">
                            Reviewed {new Date(p.reviewed_at).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
          
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">
          <div className="text-center sm:text-left">Intelligence Grid Active • Data Refreshed Live</div>
          <div className="flex gap-6">
            <button disabled className="opacity-30 flex items-center gap-2 hover:text-zinc-400 transition-colors"><ChevronLeft className="w-4 h-4 shrink-0" /> Previous</button>
            <button disabled className="opacity-30 flex items-center gap-2 hover:text-zinc-400 transition-colors">Next <ChevronRight className="w-4 h-4 shrink-0" /></button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
