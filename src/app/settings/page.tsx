"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Home, Link2, Unlink2, Loader2, ArrowLeft, Edit2, X, Check, MapPin, Briefcase } from "lucide-react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

type GearItem = { id: string; name: string };
type Integration = { id: string; provider: string; status: string };

type UserProfile = {
  id: string;
  name: string;
  homeAddress: string;
  workAddress: string;
  gearItems: GearItem[];
  integrations: Integration[];
};

export default function SettingsDashboard() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [newGear, setNewGear] = useState("");
  const [address, setAddress] = useState("");
  const [workAddress, setWorkAddress] = useState("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingWorkAddress, setIsEditingWorkAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProfile(data);
        setAddress(data.homeAddress || "");
        setWorkAddress(data.workAddress || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Settings error:", err);
      });
  }, []);

  const handleUpdateAddress = async (type: 'home' | 'work') => {
    try {
      setSavingAddress(true);
      const body = type === 'home' ? { homeAddress: address } : { workAddress: workAddress };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save to database");
      if (type === 'home') setIsEditingAddress(false);
      else setIsEditingWorkAddress(false);
    } catch (err) {
      console.error(err);
      alert("Error saving address. Please check your connection.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleAddGear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGear.trim()) return;
    
    const res = await fetch("/api/settings/gear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGear.trim() }),
    });
    const added = await res.json();
    setProfile(p => p ? { ...p, gearItems: [...p.gearItems, added] } : null);
    setNewGear("");
  };

  const handleRemoveGear = async (id: string) => {
    await fetch(`/api/settings/gear?id=${id}`, { method: "DELETE" });
    setProfile(p => p ? { ...p, gearItems: p.gearItems.filter(g => g.id !== id) } : null);
  };

  const toggleIntegration = (id: string, provider: string) => {
    if (provider === "google_calendar") {
      if (session) {
        signOut();
      } else {
        signIn("google");
      }
      return;
    }
    
    // Mock toggle for other UI purposes
    setProfile(p => p ? {
      ...p,
      integrations: p.integrations.map(i => 
        i.id === id ? { ...i, status: i.status === "connected" ? "disconnected" : "connected" } : i
      )
    } : null);
  };

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="relative">
          <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
          <Loader2 className="w-10 h-10 animate-spin text-blue-400 relative" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black text-slate-100 p-4 md:p-12 font-sans selection:bg-blue-500/30">
      
      {/* Ambient background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        
        <header className="flex items-center justify-between pb-8 border-b border-white/10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Settings Hub</h1>
            <p className="text-slate-400 mt-2 font-medium">Configure your environment and integrations.</p>
          </div>
          <Link href="/exit" className="group flex items-center gap-2 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full border border-white/10 transition-all backdrop-blur-md hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to HUD
          </Link>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          
          <div className="space-y-8">
            {/* Locations Section */}
            <section className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl hover:border-white/20 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6 text-white">
                <MapPin className="w-6 h-6 text-blue-400" />
                Key Locations
              </h2>
              
              <div className="space-y-6">
                {/* Home Address */}
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <Home className="w-4 h-4 text-slate-400" /> Home
                    </div>
                    {!isEditingAddress && (
                      <button 
                        onClick={() => setIsEditingAddress(true)}
                        className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {isEditingAddress ? (
                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <input 
                        type="text" 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-black/60 border border-blue-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-slate-600"
                        placeholder="Enter full home address..."
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setAddress(profile.homeAddress || "");
                            setIsEditingAddress(false);
                          }}
                          className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleUpdateAddress('home')}
                          disabled={savingAddress}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50"
                        >
                          {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white text-lg font-medium leading-relaxed">
                      {address ? address : <span className="text-slate-600 italic">No address set. Click edit to add.</span>}
                    </p>
                  )}
                </div>

                {/* Work Address */}
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <Briefcase className="w-4 h-4 text-slate-400" /> Work / Office
                    </div>
                    {!isEditingWorkAddress && (
                      <button 
                        onClick={() => setIsEditingWorkAddress(true)}
                        className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {isEditingWorkAddress ? (
                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <input 
                        type="text" 
                        value={workAddress}
                        onChange={(e) => setWorkAddress(e.target.value)}
                        className="w-full bg-black/60 border border-blue-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-slate-600"
                        placeholder="Enter full work address..."
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setWorkAddress(profile.workAddress || "");
                            setIsEditingWorkAddress(false);
                          }}
                          className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleUpdateAddress('work')}
                          disabled={savingAddress}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50"
                        >
                          {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white text-lg font-medium leading-relaxed">
                      {workAddress ? workAddress : <span className="text-slate-600 italic">No work address set. Click edit to add.</span>}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Integrations Section */}
            <section className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl hover:border-white/20 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6 text-white">
                <Link2 className="w-6 h-6 text-purple-400" />
                Connected Services
              </h2>
              <div className="space-y-3">
                {profile.integrations.map(integration => {
                  const isGoogle = integration.provider === "google_calendar";
                  const isConnected = isGoogle ? !!session : integration.status === "connected";
                  const providerNames: Record<string, string> = {
                    "google_calendar": "Google Calendar",
                    "home_assistant": "Home Assistant",
                    "weather_api": "Weather API",
                    "tesla_api": "Tesla (API)"
                  };
                  return (
                    <div key={integration.id} className="flex items-center justify-between bg-black/40 border border-white/5 p-4 rounded-2xl hover:border-white/10 transition-colors">
                      <div className="font-medium text-slate-200">
                        {providerNames[integration.provider] || integration.provider}
                        {isGoogle && session?.user?.email && (
                          <div className="text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1">
                            <Check className="w-3 h-3" /> {session.user.email}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => toggleIntegration(integration.id, integration.provider)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                          isConnected 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                            : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {isConnected ? (
                          <><Link2 className="w-3.5 h-3.5" /> Connected</>
                        ) : (
                          <><Unlink2 className="w-3.5 h-3.5" /> Connect</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Gear Checklist Section */}
          <section className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl hover:border-white/20 transition-all duration-300 flex flex-col h-[650px] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            <h2 className="text-xl font-bold mb-2 text-white flex items-center gap-3">
              <span className="p-2 bg-amber-500/20 rounded-lg text-amber-400">🎒</span>
              Custom Gear
            </h2>
            <p className="text-sm text-slate-400 mb-8 font-medium">
              Mandatory physical items required for exit clearance.
            </p>
            
            <form onSubmit={handleAddGear} className="flex gap-3 mb-8 relative z-10">
              <input 
                type="text" 
                value={newGear}
                onChange={(e) => setNewGear(e.target.value)}
                placeholder="e.g. Sunglasses, Badge..."
                className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all text-white placeholder:text-slate-600 shadow-inner"
              />
              <button 
                type="submit"
                disabled={!newGear.trim()}
                className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] disabled:shadow-none"
              >
                <Plus className="w-5 h-5" /> Add
              </button>
            </form>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              <ul className="space-y-3">
                {profile.gearItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-3">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
                      <Plus className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="font-medium">No custom gear added.</p>
                    <p className="text-xs text-slate-600">Items added here will be strictly enforced by the AI.</p>
                  </div>
                ) : (
                  profile.gearItems.map((gear) => (
                    <li key={gear.id} className="group flex items-center justify-between bg-black/40 border border-white/5 p-4 rounded-2xl hover:border-white/20 hover:bg-white/5 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500/50 group-hover:bg-amber-400 transition-colors"></div>
                        <span className="text-white font-semibold tracking-wide">{gear.name}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveGear(gear.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 active:scale-95"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
