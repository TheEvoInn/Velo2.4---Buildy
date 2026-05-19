import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Rocket, 
  ShieldCheck, 
  Zap, 
  Mail, 
  LayoutDashboard,
  ChevronRight,
  Briefcase,
  Telescope,
  ShoppingBag,
  Cpu,
  Fingerprint,
  Activity,
  History,
  Grid,
  Store,
  ShieldAlert,
  Bot,
  BookOpen,
  LogOut,
  CircleUserRound,
  Menu,
  X,
  Wallet,
  Archive,
  Library,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Core UI Components (Eager)
import { VeloThemeProvider } from "@/components/velo/VeloThemeProvider";
import { ViewAsSwitcher, PreviewModeBanner } from "@/components/velo/AdminPreviewControls";

// Module Components (Lazy Loaded)
const CloneBay = React.lazy(() => import("@/components/velo/CloneBay").then(m => ({ default: m.CloneBay })));
const SecureCore = React.lazy(() => import("@/components/velo/SecureCore").then(m => ({ default: m.SecureCore })));
const ActionEngine = React.lazy(() => import("@/components/velo/ActionEngine").then(m => ({ default: m.ActionEngine })));
const CommsDeck = React.lazy(() => import("@/components/velo/CommsDeck").then(m => ({ default: m.CommsDeck })));
const BlackBoxRecorder = React.lazy(() => import("@/components/velo/BlackBoxRecorder").then(m => ({ default: m.BlackBoxRecorder })));
const FreelanceStation = React.lazy(() => import("@/components/velo/FreelanceStation").then(m => ({ default: m.FreelanceStation })));
const ContinuityCore = React.lazy(() => import("@/components/velo/ContinuityCore").then(m => ({ default: m.ContinuityCore })));
const TradeBay = React.lazy(() => import("@/components/velo/TradeBay").then(m => ({ default: m.TradeBay })));
const StarshipLaunchSequence = React.lazy(() => import("@/components/velo/StarshipLaunchSequence").then(m => ({ default: m.StarshipLaunchSequence })));
const CommandBridge = React.lazy(() => import("@/components/velo/CommandBridge").then(m => ({ default: m.CommandBridge })));
const GalaxyScanner = React.lazy(() => import("@/components/velo/GalaxyScanner").then(m => ({ default: m.GalaxyScanner })));
const DockingControl = React.lazy(() => import("@/components/velo/DockingControl").then(m => ({ default: m.DockingControl })));
const CommandOfficer = React.lazy(() => import("@/components/velo/CommandOfficer").then(m => ({ default: m.CommandOfficer })));
const KnowledgePlaybookReview = React.lazy(() => import("@/components/velo/KnowledgePlaybookReview").then(m => ({ default: m.KnowledgePlaybookReview })));
const MissionMonitor = React.lazy(() => import("@/components/velo/MissionMonitor").then(m => ({ default: m.MissionMonitor })));
const InvitationAcceptancePortal = React.lazy(() => import("@/components/velo/InvitationAcceptancePortal").then(m => ({ default: m.InvitationAcceptancePortal })));
const MissionControlDashboard = React.lazy(() => import("@/components/velo/MissionControlDashboard").then(m => ({ default: m.MissionControlDashboard })));
const InteractiveOnboardingGuide = React.lazy(() => import("@/components/velo/InteractiveOnboardingGuide").then(m => ({ default: m.InteractiveOnboardingGuide })));
const GoogleConnectPreparationHelper = React.lazy(() => import("@/components/velo/GoogleConnectPreparationHelper").then(m => ({ default: m.GoogleConnectPreparationHelper })));
const VeloWallet = React.lazy(() => import("@/components/velo/VeloWallet").then(m => ({ default: m.VeloWallet })));
const UserContentArchive = React.lazy(() => import("@/components/velo/UserContentArchive").then(m => ({ default: m.UserContentArchive })));
const MarketDeck = React.lazy(() => import("@/components/velo/MarketDeck").then(m => ({ default: m.MarketDeck })));

import { 
  AutopilotProfile, 
  AutopilotPermission, 
  AutopilotMission,
  VeloDevopsCommand,
  VeloMemberInvitation,
  MarketingMember,
  User 
} from "@/entities";
import { 
  requiresOnboarding,
  getAccessContext, 
  canEnterCommandCenter,
  filterMenuItems, 
  isSensitiveModule,
  isEssentialModule,
  handleTelemetryError,
  findScopedProfile,
  getViewAsMode,
  setViewAsMode,
  isRealAdmin
} from "@/lib/velo/accessControl";

export default function MissionControl() {
  const [activeModule, setActiveModule] = useState<string>("dashboard");

  // Normalize module IDs to handle legacy or varied naming conventions
  const normalizeModuleId = (id: string | null): string => {
    if (!id) return "dashboard";
    const cleanId = id.toLowerCase().trim();
    
    const walletAliases = ["wallet", "velo-wallet", "wallet-dashboard", "income-wallet", "financial-core", "payment-hub"];
    if (walletAliases.includes(cleanId)) return "wallet";
    
    const archiveAliases = ["content-archive", "work-archive", "user-archive", "library", "artifact-gallery"];
    if (archiveAliases.includes(cleanId)) return "content-archive";

    return cleanId;
  };

  const handleModuleChange = (id: string) => {
    if (id === "store-redirect") {
      window.location.href = "/store";
      return;
    }
    const normalizedId = normalizeModuleId(id);
    setActiveModule(normalizedId);
    
    // Update URL without full page reload for better state preservation
    const url = new URL(window.location.href);
    url.searchParams.set("module", normalizedId);
    window.history.pushState({}, "", url.toString());
    
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1280) {
      setIsSidebarOpen(false);
    }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1280);
  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminBypass, setIsAdminBypass] = useState(false);
  const [isInvitationRoute, setIsInvitationRoute] = useState(false);
  const [isMarketingMember, setIsMarketingMember] = useState(false);
  const [isInvitedMember, setIsInvitedMember] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [viewAsMode, setViewAsModeState] = useState(getViewAsMode());
  const [readiness, setReadiness] = useState({
    profile: false,
    permissions: 0,
    pendingMissions: 0,
    stagedCommands: 0,
    pendingInvitations: 0,
    onboardingComplete: false
  });

  useEffect(() => {
    // Robust data migration for Dawn Vernor's email correction
    import("@/lib/velo/backPayAutomation").then(m => {
      m.fixDawnVernorData().then(() => {
        // Ensure the actual records exist after migration
        m.ensureDawnBackPayRecords();
      });
      
      // Notification trigger for the final email correction audit
      if (!localStorage.getItem('velo_notified_dawn_audit_resolved')) {
        m.sendDawnUpdateNotification().then(res => {
          if (res.success) {
            localStorage.setItem('velo_notified_dawn_audit_resolved', 'true');
          }
        });
      }

      // Send Dawn the Ollama setup guide once
      if (!localStorage.getItem('velo_sent_dawn_ollama_guide')) {
        m.sendDawnOllamaSetupGuide().then(res => {
          if (res.success) {
            localStorage.setItem('velo_sent_dawn_ollama_guide', 'true');
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    // Sync activeModule with URL param if present
    const params = new URLSearchParams(window.location.search);
    const moduleParam = params.get("module");
    if (moduleParam) {
      setActiveModule(normalizeModuleId(moduleParam));
    }

    // Check for invitation route immediately
    const path = window.location.pathname;
    if (path.includes("/invite") || path.includes("/invitation") || path.includes("/accept-invite")) {
      setIsInvitationRoute(true);
    }

    const checkAccessAndTelemetry = async () => {
      try {
        // Identity & Access Check (Sequential for safety)
        const me = await User.me().catch(() => null);
        setAuthUser(me);

        let profiles: any[] = [];
        let marketingRecord = null;
        let invitationRecord = null;
        
        if (me) {
          // Check for marketing membership
          const marketingMembers = await MarketingMember.list().catch(() => []);
          marketingRecord = marketingMembers.find((m: any) => m.email?.toLowerCase() === me.email?.toLowerCase());
          setIsMarketingMember(!!marketingRecord);
          
          // Check for platform invitation
          const invitations = await VeloMemberInvitation.list().catch(() => []);
          const activeStatuses = ["sent", "pending", "accepted", "active"];
          invitationRecord = invitations.find((i: any) => 
            i.email?.toLowerCase() === me.email?.toLowerCase() && 
            activeStatuses.includes(i.status?.toLowerCase())
          );
          setIsInvitedMember(!!invitationRecord);
          
          profiles = await AutopilotProfile.list().catch(() => []);
        }
        
        const mainProfile = findScopedProfile(me, profiles);
        setProfile(mainProfile);

        // Check if tutorial should be auto-opened
        if (mainProfile) {
          const accessCtx = getAccessContext(me, mainProfile, !!marketingRecord, !!invitationRecord);
          
          // Safe metadata parsing
          let onboardingMetadata: any = {};
          if (typeof mainProfile.onboarding_metadata === 'string') {
            try {
              onboardingMetadata = JSON.parse(mainProfile.onboarding_metadata);
            } catch (e) {
              console.warn("Failed to parse onboarding_metadata string:", e);
            }
          } else {
            onboardingMetadata = mainProfile.onboarding_metadata || {};
          }

          if ((accessCtx.onboardingComplete || accessCtx.isBeta) && !onboardingMetadata?.tutorialProgress?.completed) {
            setIsTutorialOpen(true);
          }
        }
        
        const access = getAccessContext(me, mainProfile, !!marketingRecord, !!invitationRecord);
        
        // Gated Telemetry Loading based on effective access
        if (me && access.role === "admin") {
          // Full Admin Telemetry
          const [perms, missions, cmds, invites] = await Promise.all([
            AutopilotPermission.list().catch(() => []),
            AutopilotMission.list().catch(() => []),
            VeloDevopsCommand.list().catch(() => []),
            VeloMemberInvitation.list().catch(() => [])
          ]);
          
          setReadiness({
            profile: !!mainProfile,
            permissions: (perms || []).filter((p: any) => p.status === "active").length,
            pendingMissions: (missions || []).filter((m: any) => m.status === "pending").length,
            stagedCommands: (cmds || []).filter((c: any) => c.status === "staged").length,
            pendingInvitations: (invites || []).filter((i: any) => i.status === "sent").length,
            onboardingComplete: access.onboardingComplete
          });
        } else if (me && access.role === "user") {
          setReadiness({
            profile: !!mainProfile,
            permissions: 0,
            pendingMissions: 0,
            stagedCommands: 0,
            pendingInvitations: 0,
            onboardingComplete: access.onboardingComplete
          });
        } else {
          setReadiness({
            profile: false,
            permissions: 0,
            pendingMissions: 0,
            stagedCommands: 0,
            pendingInvitations: 0,
            onboardingComplete: false
          });
        }
      } catch (error) {
        handleTelemetryError("Main Control Deck", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccessAndTelemetry();
    
    // Listen for view-as mode changes
    const handleViewAsChanged = () => {
      setViewAsModeState(getViewAsMode());
      checkAccessAndTelemetry();
    };
    window.addEventListener("velo_view_as_changed", handleViewAsChanged);

    const interval = setInterval(checkAccessAndTelemetry, 20000); // Slower interval for main deck
    return () => {
      clearInterval(interval);
      window.removeEventListener("velo_view_as_changed", handleViewAsChanged);
    };
  }, []);

  const access = getAccessContext(authUser, profile, isMarketingMember, isInvitedMember);
  const isAdmin = access.role === 'admin';
  const isRealAdminUser = isRealAdmin(authUser, profile);
  
  const navigationConfig = isAdmin ? [
    {
      label: "Mission Operations",
      items: [
        { id: "dashboard", label: "Mission Control", icon: LayoutDashboard, color: "text-primary" },
        { id: "autopilot", label: "Autopilot", icon: Bot, color: "text-primary" },
      ]
    },
    {
      label: "Opportunity Engine",
      items: [
        { id: "galaxy-scanner", label: "Galaxy Scanner", icon: Telescope, color: "text-blue-400" },
        { id: "freelance-station", label: "Freelance", icon: Briefcase, color: "text-blue-400" },
        { id: "trade-bay", label: "Commerce Hub", icon: ShoppingBag, color: "text-emerald-400" },
        { id: "market-deck", label: "Market Deck", icon: BarChart3, color: "text-amber-400" },
      ]
    },
    {
      label: "My Work & Profile",
      items: [
        { id: "wallet", label: "Wallet", icon: Wallet, color: "text-emerald-400" },
        { id: "content-archive", label: "Work Archive", icon: Archive, color: "text-blue-400" },
        { id: "comms-deck", label: "Comms Deck", icon: Mail, color: "text-sky-400" },
        { id: "mission-monitor", label: "Mission Monitor", icon: Activity, color: "text-emerald-400" },
        { id: "action-engine", label: "Review Center", icon: Zap, color: "text-purple-400", badge: readiness.pendingMissions },
        { id: "continuity-core", label: "Connection Hub", icon: ShieldCheck, color: "text-emerald-400" },
        { id: "playbook-review", label: "Playbook Review", icon: BookOpen, color: "text-purple-400" },
        { id: "docking-control", label: "Connected Platforms", icon: Rocket, color: "text-amber-400" },
        { id: "clone-bay", label: "My Digital Clone", icon: Cpu, color: "text-amber-400" },
        { id: "onboarding", label: "Launch Checklist", icon: Rocket, color: "text-primary" },
        { id: "secure-core", label: "Security Vault", icon: ShieldCheck, color: "text-emerald-400" },
        { id: "google-prep", label: "Google Prep Helper", icon: Fingerprint, color: "text-blue-400" },
      ]
    },
    {
      label: "Admin Tools",
      items: [
        { id: "command-bridge", label: "Admin Bridge", icon: ShieldAlert, color: "text-red-400", badge: (readiness.stagedCommands + readiness.pendingInvitations) || 0 },
        { id: "black-box", label: "Audit Log", icon: History, color: "text-zinc-500" },
      ]
    }
  ] : [
    {
      label: "Operations",
      items: [
        { id: "dashboard", label: "Mission Control", icon: LayoutDashboard, color: "text-primary" },
        { id: "autopilot", label: "Autopilot", icon: Bot, color: "text-primary" },
      ]
    },
    {
      label: "Find & Work",
      items: [
        { id: "galaxy-scanner", label: "Find Work", icon: Telescope, color: "text-blue-400" },
        { id: "freelance-station", label: "Work Desk", icon: Briefcase, color: "text-blue-400" },
        { id: "mission-monitor", label: "Progress", icon: Activity, color: "text-emerald-400" },
        { id: "action-engine", label: "Review Center", icon: Zap, color: "text-purple-400", badge: readiness.pendingMissions },
      ]
    },
    {
      label: "Settings & Connections",
      items: [
        { id: "continuity-core", label: "Connection Hub", icon: ShieldCheck, color: "text-emerald-400" },
        { id: "docking-control", label: "Platform Hub", icon: Rocket, color: "text-amber-400" },
        { id: "google-prep", label: "Google Prep Helper", icon: Fingerprint, color: "text-blue-400" },
      ]
    },
    {
      label: "My Results",
      items: [
        { id: "wallet", label: "Wallet", icon: Wallet, color: "text-emerald-400" },
        { id: "content-archive", label: "Saved Work", icon: Archive, color: "text-blue-400" },
        { id: "clone-bay", label: "My Profile", icon: CircleUserRound, color: "text-amber-400" },
      ]
    },
    {
      label: "Market & Offers",
      items: [
        { id: "trade-bay", label: "Products & Offers", icon: ShoppingBag, color: "text-emerald-400" },
        { id: "market-deck", label: "Market Deck", icon: BarChart3, color: "text-amber-400" },
        { id: "store-redirect", label: "My Store", icon: Store, color: "text-indigo-400" },
      ]
    }
  ];

  const filteredSections = filterMenuItems(navigationConfig, access);

  const renderModule = () => {
    // Central guard for sensitive modules
    if (isSensitiveModule(activeModule) && access.role !== 'admin') {
      return (
        <Card className="cockpit-panel-responsive border-red-500/20 bg-red-500/5 text-center py-16 sm:py-24">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-6 shrink-0" />
          <h2 className="text-xl sm:text-2xl font-black text-white mb-3 uppercase tracking-tight italic">Security Override Required</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm sm:text-base italic leading-relaxed px-4">This department contains sensitive ship telemetry. Access is reserved for Authorized Station Administrators.</p>
          <Button variant="hud-outline" size="lg" className="h-14 px-10 uppercase tracking-widest" onClick={() => setActiveModule("dashboard")}>Return to Control Deck</Button>
        </Card>
      );
    }

    // Autopilot-first guard: Redirect non-essential modules for regular users
    if (access.role !== 'admin' && !isEssentialModule(activeModule)) {
      return (
        <Card className="cockpit-panel-responsive border-white/10 bg-black/40 text-center py-16 sm:py-24">
          <Bot className="w-12 h-12 text-primary mx-auto mb-6 shrink-0 animate-float" />
          <h2 className="text-xl sm:text-2xl font-black text-white mb-3 uppercase italic tracking-tight">Autopilot Control</h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto text-sm sm:text-base font-medium italic leading-relaxed px-4">
            VELO Autopilot handles that for you. Tell it what you want done and it will stage everything for your review.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="hud" size="lg" className="h-14 px-10 uppercase tracking-widest" onClick={() => setActiveModule("autopilot")}>Talk to Autopilot</Button>
            <Button variant="hud-outline" size="lg" className="h-14 px-10 uppercase tracking-widest text-zinc-500" onClick={() => setActiveModule("dashboard")}>Go to Dashboard</Button>
          </div>
        </Card>
      );
    }

    // Onboarding guard
    if (requiresOnboarding(access) && !['onboarding'].includes(activeModule)) {
      return (
        <Card className="cockpit-panel-responsive border-white/10 bg-black/40 text-center py-16 sm:py-24">
          <Rocket className="w-12 h-12 text-primary mx-auto mb-6 shrink-0 animate-float" />
          <h2 className="text-xl sm:text-2xl font-black text-white mb-3 uppercase italic tracking-tight">Launch Sequence Required</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm sm:text-base font-medium italic leading-relaxed px-4">Complete your starship launch checklist before accessing specialized mission departments.</p>
          <Button variant="hud" size="lg" className="h-14 px-10 uppercase tracking-widest" onClick={() => setActiveModule("onboarding")}>Initiate Launch Sequence</Button>
        </Card>
      );
    }

    return (
      <React.Suspense fallback={<div className="flex items-center justify-center p-20"><RefreshCw className="w-10 h-10 text-primary animate-spin opacity-30" /></div>}>
        {(() => {
          switch (activeModule) {
            case "autopilot": return <CommandOfficer onNavigate={handleModuleChange} onStartTutorial={() => setIsTutorialOpen(true)} />;
            case "mission-monitor": return <MissionMonitor onNavigate={handleModuleChange} />;
            case "clone-bay": return <CloneBay onNavigate={handleModuleChange} />;
            case "secure-core": return <SecureCore onNavigate={handleModuleChange} />;
            case "action-engine": return <ActionEngine onNavigate={handleModuleChange} />;
            case "comms-deck": return <CommsDeck />;
            case "black-box": return <BlackBoxRecorder />;
            case "freelance-station": return <FreelanceStation onNavigate={handleModuleChange} />;
            case "continuity-core": return <ContinuityCore onNavigate={handleModuleChange} />;
            case "playbook-review": return <KnowledgePlaybookReview />;
            case "trade-bay": return <TradeBay onNavigate={handleModuleChange} />;
            case "command-bridge": return <CommandBridge onNavigate={handleModuleChange} />;
            case "galaxy-scanner": return <GalaxyScanner onNavigate={handleModuleChange} />;
            case "market-deck": return <MarketDeck onNavigate={handleModuleChange} />;
            case "docking-control": return <DockingControl onNavigate={handleModuleChange} />;
            case "onboarding": return <StarshipLaunchSequence onComplete={() => {
              handleModuleChange("dashboard");
              setTimeout(() => window.location.reload(), 500);
            }} />;
            case "google-prep": return <GoogleConnectPreparationHelper onNavigate={handleModuleChange} />;
            case "wallet": return <VeloWallet onNavigate={handleModuleChange} />;
            case "content-archive": return <UserContentArchive onNavigate={handleModuleChange} />;
            default: return (
              <MissionControlDashboard 
                onNavigate={handleModuleChange} 
                readiness={readiness} 
                profile={profile} 
                access={access} 
                onStartTutorial={() => setIsTutorialOpen(true)}
              />
            );
          }
        })()}
      </React.Suspense>
    );
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-4 text-center">
        <div className="depth-grid" />
        <div className="scanline-overlay" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-8 relative z-10"
        >
          <div className="relative">
            <Rocket className="w-16 h-16 sm:w-20 sm:h-20 text-primary animate-float shrink-0" />
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse-neon" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] sm:text-[11px] uppercase font-black tracking-[0.4em] text-primary">Synchronizing Core Systems</p>
            <div className="w-48 sm:w-64 h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
              <motion.div 
                className="h-full bg-primary shadow-[0_0_15px_rgba(0,242,255,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Handle Invitation Route
  if (isInvitationRoute) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden p-4 sm:p-6 text-center">
        <div className="depth-grid pointer-events-none opacity-[0.03]" />
        <div className="scanline-overlay" />
        <div className="max-w-4xl w-full relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.4)] shrink-0">
              <Rocket className="text-black w-8 h-8" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white leading-none uppercase italic">VELO <span className="text-primary">Station</span></h1>
              <p className="hud-label-xs text-primary/40 mt-3 italic">Orbital Reception</p>
            </div>
          </div>
          <React.Suspense fallback={<div className="flex items-center justify-center p-20"><RefreshCw className="w-10 h-10 text-primary animate-spin opacity-30" /></div>}>
            <InvitationAcceptancePortal />
          </React.Suspense>
        </div>
      </div>
    );
  }

  // Handle Public Access / Non-Member Gating
  const isAuthorized = canEnterCommandCenter(access);
  if (access.role === 'public' || !isAuthorized) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col relative overflow-hidden px-4 text-center">
        <div className="depth-grid pointer-events-none opacity-[0.03]" />
        <div className="scanline-overlay" />

        {isRealAdminUser && (
          <div className="absolute top-0 left-0 w-full z-50">
            <div className="px-4 sm:px-10 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl">
              <ViewAsSwitcher 
                currentMode={viewAsMode} 
                activeModule={activeModule}
                onModuleChange={setActiveModule}
              />
            </div>
            <PreviewModeBanner currentMode={viewAsMode} />
          </div>
        )}
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10 overflow-y-auto">
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-3xl bg-primary flex items-center justify-center shadow-[0_0_60px_rgba(0,242,255,0.2)] mb-8 sm:mb-10 relative z-10 shrink-0">
            <Rocket className="w-8 h-8 sm:w-12 sm:h-12 text-black" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 sm:mb-6 uppercase italic relative z-10 leading-none">Clearance <span className="text-primary text-glow-cyan">Required</span></h1>
          <p className="text-zinc-400 max-w-sm mb-8 sm:mb-12 text-base sm:text-lg font-medium leading-relaxed relative z-10 italic">
            VELO access requires either a formal invitation or an active Access Pass purchase. Sign in with the same email used for your purchase.
          </p>
          <div className="flex flex-col gap-4 w-full max-w-[320px] relative z-10 pb-12">
            <Button 
              asChild
              variant="hud"
              className="h-16 uppercase font-black tracking-widest text-sm"
            >
              <a href="/marketing/home">Explore Access Passes</a>
            </Button>
            <Button 
              variant="hud-ghost"
              className="h-12 uppercase font-black tracking-widest text-[11px] text-zinc-500 hover:text-white"
              onClick={() => authUser ? User.logout() : User.login()}
            >
              {authUser ? "Sign Out & Switch Identity" : "Member Sign In"}
            </Button>
            <p className="hud-label-xs text-zinc-600 mt-8 italic">
              Velo Station Intelligence • Clearance Level Alpha
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle Required Onboarding
  if (requiresOnboarding(access) && !isAdminBypass) {
    return (
      <VeloThemeProvider>
        {isRealAdminUser && (
          <div className="fixed top-0 left-0 w-full z-[100]">
            <div className="px-4 sm:px-10 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl">
              <ViewAsSwitcher 
                currentMode={viewAsMode} 
                activeModule={activeModule}
                onModuleChange={setActiveModule}
              />
            </div>
            <PreviewModeBanner currentMode={viewAsMode} />
          </div>
        )}
        <React.Suspense fallback={<div className="flex items-center justify-center p-20"><RefreshCw className="w-10 h-10 text-primary animate-spin opacity-30" /></div>}>
          <StarshipLaunchSequence onComplete={() => window.location.reload()} />
        </React.Suspense>
      </VeloThemeProvider>
    );
  }

  return (
    <VeloThemeProvider>
      <div className="flex h-screen bg-background text-zinc-300 overflow-hidden font-sans selection:bg-primary/30 relative">
        {/* Immersive Starfield Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="star-field" />
          <div className="depth-grid pointer-events-none opacity-[0.05]" />
          <div className="scanline-overlay" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-background/80 to-background" />
        </div>

        {/* Mobile Header */}
        <header className="xl:hidden fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6">
          <div className="flex items-center gap-4 cursor-pointer min-w-0" onClick={() => handleModuleChange("dashboard")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Rocket className="text-black w-5 h-5 shrink-0" />
            </div>
            <h1 className="text-lg font-black tracking-tighter text-white italic uppercase leading-none truncate">VELO <span className="text-primary">OS</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
            {isRealAdminUser && (
              <ViewAsSwitcher 
                currentMode={viewAsMode} 
                activeModule={activeModule}
                onModuleChange={setActiveModule}
                compact={true}
              />
            )}
            <Button variant="hud-ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="h-10 w-10 shrink-0">
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </header>
        
        {/* Sidebar - The HUD Command Rail */}
        <aside className={`hud-rail w-72 transition-all duration-500 z-50 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} xl:relative xl:translate-x-0 absolute inset-y-0 left-0 pt-20 xl:pt-0`}>
          <div className="p-8 hidden xl:flex items-center gap-5 relative overflow-hidden mb-4 group cursor-pointer" onClick={() => handleModuleChange("dashboard")}>
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.4)] shrink-0 relative z-10 group-hover:scale-110 transition-transform">
                <Rocket className="text-black w-7 h-7 shrink-0" />
              </div>
              <div className="scanning-ring w-12 h-12 absolute inset-0 border border-primary/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="relative z-10 min-w-0">
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none italic uppercase truncate">VELO <span className="text-primary">OS</span></h1>
              <p className="text-[10px] uppercase font-black tracking-[0.4em] text-primary/40 mt-2 truncate">v2.4 Core Sync</p>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-10 pb-12">
              {filteredSections.map((section) => (
                <div key={section.label} className="space-y-3">
                  <div className="hud-section-header px-4">
                    {section.label}
                  </div>
                  <nav className="space-y-1">
                    {section.items.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleModuleChange(item.id);
                          if (window.innerWidth < 1280) setIsSidebarOpen(false);
                        }}
                        className={`w-full hud-nav-item group rounded-xl px-4 py-3 flex items-center gap-4 transition-all duration-300 ${activeModule === item.id ? "active bg-primary/10" : "hover:bg-white/[0.03] hover:translate-x-1"}`}
                      >
                        <item.icon className={`w-5 h-5 shrink-0 transition-all duration-300 ${activeModule === item.id ? item.color : "text-zinc-500 group-hover:text-zinc-200"}`} />
                        <span className={`nav-label text-[11px] font-black uppercase tracking-widest text-left flex-1 truncate ${activeModule === item.id ? "text-primary" : "text-zinc-500"}`}>{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <Badge className="bg-primary text-black text-[10px] px-1.5 h-4 min-w-[18px] font-black border-none shadow-[0_0_15px_rgba(0,242,255,0.4)] animate-pulse shrink-0">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-xl">
            <Button 
              variant="hud-ghost" 
              className="w-full justify-start gap-4 h-12 text-zinc-500 hover:text-white px-5 rounded-xl uppercase font-black tracking-widest text-[11px]"
              onClick={() => User.logout()}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className="truncate">Abort Session</span>
            </Button>
          </div>
        </aside>

        {/* Main Mission Viewport */}
        <main className={`flex-1 relative ${activeModule === 'autopilot' ? 'overflow-hidden' : 'hud-scroll-container'} z-10 pt-16 xl:pt-0`}>
          {isRealAdminUser && (
            <div className="sticky top-0 left-0 w-full z-40">
              <div className={`px-4 sm:px-10 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl ${viewAsMode !== 'admin' ? 'hidden xl:flex' : 'flex'}`}>
                <div className="flex items-center gap-6">
                  <ViewAsSwitcher 
                    currentMode={viewAsMode} 
                    activeModule={activeModule}
                    onModuleChange={setActiveModule}
                  />
                </div>
                {viewAsMode !== 'admin' && (
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 italic">
                    Administrative Override Active
                  </p>
                )}
              </div>
              <PreviewModeBanner currentMode={viewAsMode} />
            </div>
          )}
          
          <div className={`${activeModule === 'autopilot' ? 'p-0 h-full' : 'hud-container-padded safe-bottom-padding'} min-w-0 ${isRealAdminUser ? "xl:pt-10" : ""}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full max-w-full"
              >
                {renderModule()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Persistent Onboarding Guide Trigger */}
        {access.onboardingComplete && (
          <React.Suspense fallback={null}>
            <InteractiveOnboardingGuide isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} activeModule={activeModule} />
          </React.Suspense>
        )}
      </div>
    </VeloThemeProvider>
  );
}
