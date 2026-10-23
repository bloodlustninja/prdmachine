import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidViewer from "./components/MermaidViewer";
import { 
  Terminal, Shield, AlertTriangle, Layers, 
  Download, Copy, Check, Sliders, History, Trash2, 
  Sparkles, RefreshCw, Activity, ArrowUpRight 
} from "lucide-react";

export default function App() {
  const [idea, setIdea] = useState("A distributed ride-sharing system for autonomous drones in metropolitan areas");
  const [constraint, setConstraint] = useState("");
  const [showConstraint, setShowConstraint] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [rounds, setRounds] = useState(1);
  const [isForging, setIsForging] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [specMarkdown, setSpecMarkdown] = useState("");
  const [statusMessage, setStatusMessage] = useState("Engine Idle");
  const [copied, setCopied] = useState(false);
  const [savedSpecs, setSavedSpecs] = useState([]);
  const [mermaidChart, setMermaidChart] = useState(
    "graph TD\n  Client[Edge Ingress] --> Gateway[API Gateway]\n  Gateway --> Orchestrator[Consensus Engine]\n  Orchestrator --> DB[(State Ledger)]"
  );
  const [agentLogs, setAgentLogs] = useState([]);

  const eventSourceRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem("prdmachine_history");
    if (raw) {
      try { setSavedSpecs(JSON.parse(raw)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current && isForging) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [specMarkdown, isForging]);

  const saveToHistory = (markdown, chart, prompt) => {
    const item = {
      id: Date.now(),
      title: prompt.slice(0, 50) + (prompt.length > 50 ? "..." : ""),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      markdown,
      chart
    };
    const updated = [item, ...savedSpecs.slice(0, 9)];
    setSavedSpecs(updated);
    localStorage.setItem("prdmachine_history", JSON.stringify(updated));
  };

  const startDebateForge = () => {
    if (!idea.trim() || isForging) return;
    if (eventSourceRef.current) eventSourceRef.current.close();

    setIsForging(true);
    setSpecMarkdown("");
    setAgentLogs([]);
    setCurrentAgent(null);
    setStatusMessage("Assembling Agent Mesh...");

    const params = new URLSearchParams();
    params.set("idea", idea);
    params.set("rounds", rounds);
    if (constraint.trim()) params.set("constraint", constraint.trim());

    const url = "http://localhost:8000/api/rfc/stream?" + params.toString();

    let finalMarkdown = "";
    let finalChart = mermaidChart;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => setStatusMessage("Consensus Stream Active");

    eventSource.onmessage = (event) => {
      try {
        let rawData = event.data;
        if (!rawData) return;
        if (rawData.startsWith("data:")) rawData = rawData.slice(5).trim();

        const payload = JSON.parse(rawData);

        switch (payload.event) {
          case "agent_start":
            setCurrentAgent(payload.agent);
            setAgentLogs((prev) => [
              ...prev,
              { agent: payload.agent, text: "Floor yielded to " + payload.agent.toUpperCase() + " (Round " + payload.round_index + ")" }
            ]);
            break;
          case "spec_delta":
            finalMarkdown += payload.delta || "";
            setSpecMarkdown((prev) => prev + (payload.delta || ""));
            break;
          case "mermaid_update":
            if (payload.delta && payload.delta.trim()) {
              finalChart = payload.delta.trim();
              setMermaidChart(payload.delta.trim());
            }
            break;
          case "agent_end":
            setAgentLogs((prev) => [
              ...prev,
              { agent: payload.agent, text: "Completed turn review." }
            ]);
            break;
          case "run_complete":
            setIsForging(false);
            setCurrentAgent(null);
            setStatusMessage("Consensus Reached");
            saveToHistory(finalMarkdown, finalChart, idea);
            eventSource.close();
            break;
          default:
            break;
        }
      } catch (err) {}
    };

    eventSource.onerror = () => {
      setIsForging(false);
      setStatusMessage("Stream Closed");
      if (finalMarkdown) saveToHistory(finalMarkdown, finalChart, idea);
      eventSource.close();
    };
  };

  const copyToClipboard = () => {
    if (!specMarkdown) return;
    navigator.clipboard.writeText(specMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    if (!specMarkdown) return;
    const blob = new Blob([specMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "RFC-" + Date.now() + ".md";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#08090c] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-rose-500/20 selection:text-rose-200">
      
      {/* Top Header */}
      <header className="h-14 border-b border-white/[0.08] bg-[#0d0f15] px-5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-rose-500 p-[1px] flex items-center justify-center">
            <div className="w-full h-full bg-[#0d0f15] rounded-[7px] flex items-center justify-center">
              <Terminal className="w-4 h-4 text-zinc-100" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold tracking-wider text-sm text-white">PRDMachine</span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase px-1.5 py-0.5 rounded border border-white/[0.1] bg-white/[0.03]">
              v0.4.0
            </span>
          </div>
        </div>

        {/* Real-time Agent Badges */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className={"flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all duration-300 " + (
            currentAgent === "architect" 
              ? "bg-blue-500/10 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]" 
              : "border-white/[0.06] text-zinc-500 bg-white/[0.02]"
          )}>
            <span className={"w-1.5 h-1.5 rounded-full " + (currentAgent === "architect" ? "bg-blue-400 animate-ping" : "bg-zinc-700")} />
            <Layers className="w-3.5 h-3.5" />
            <span>Aegis (Architect)</span>
          </div>

          <div className={"flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all duration-300 " + (
            currentAgent === "chaos" 
              ? "bg-amber-500/10 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]" 
              : "border-white/[0.06] text-zinc-500 bg-white/[0.02]"
          )}>
            <span className={"w-1.5 h-1.5 rounded-full " + (currentAgent === "chaos" ? "bg-amber-400 animate-ping" : "bg-zinc-700")} />
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Vortex (Chaos)</span>
          </div>

          <div className={"flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all duration-300 " + (
            currentAgent === "security" 
              ? "bg-emerald-500/10 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
              : "border-white/[0.06] text-zinc-500 bg-white/[0.02]"
          )}>
            <span className={"w-1.5 h-1.5 rounded-full " + (currentAgent === "security" ? "bg-emerald-400 animate-ping" : "bg-zinc-700")} />
            <Shield className="w-3.5 h-3.5" />
            <span>Sentinel (Security)</span>
          </div>
        </div>

        {/* Status & Vault */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 px-3 py-1.5 rounded-md border border-white/[0.08] bg-white/[0.02]">
            <Activity className={"w-3.5 h-3.5 " + (isForging ? "text-rose-400 animate-spin" : "text-emerald-400")} />
            <span>{statusMessage}</span>
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.08] hover:bg-white/[0.05] text-xs text-zinc-300 transition-colors font-mono"
          >
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span>Archive ({savedSpecs.length})</span>
          </button>
        </div>
      </header>

      {/* Control Deck */}
      <section className="px-6 py-4 border-b border-white/[0.08] bg-[#0e1117] shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                className="w-full bg-[#141824] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono shadow-inner"
                placeholder="Describe your distributed system, architecture, or protocol requirement..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) startDebateForge(); }}
                disabled={isForging}
              />
            </div>

            <button
              onClick={() => setShowConstraint(!showConstraint)}
              className={"flex items-center gap-1.5 px-4 py-3 rounded-xl border text-xs font-mono transition-all " + (
                showConstraint || constraint
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-sm"
                  : "border-white/[0.08] bg-[#141824] text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Constraints</span>
            </button>

            <div className="flex items-center gap-2 bg-[#141824] border border-white/[0.08] px-3.5 py-3 rounded-xl text-xs font-mono">
              <span className="text-zinc-500">Epochs:</span>
              <select
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                disabled={isForging}
                className="bg-transparent text-indigo-400 font-bold focus:outline-none cursor-pointer"
              >
                <option value={1} className="bg-[#141824]">1 Round</option>
                <option value={2} className="bg-[#141824]">2 Rounds</option>
                <option value={3} className="bg-[#141824]">3 Rounds</option>
              </select>
            </div>

            <button
              onClick={startDebateForge}
              disabled={isForging}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-rose-600 hover:from-indigo-600 hover:to-rose-700 text-white font-medium text-xs tracking-wider uppercase disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
            >
              {isForging ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Forging...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Forge RFC</span>
                </>
              )}
            </button>
          </div>

          {showConstraint && (
            <div className="flex items-center gap-2 bg-amber-500/[0.05] border border-amber-500/20 px-3.5 py-2.5 rounded-xl">
              <span className="text-[11px] font-mono uppercase font-bold text-amber-400 whitespace-nowrap">
                Hard Boundary:
              </span>
              <input
                type="text"
                className="flex-1 bg-transparent border-none text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none font-mono"
                placeholder="e.g. Zero-Trust mTLS between all nodes, strictly no Redis, HIPAA 256-bit encryption..."
                value={constraint}
                onChange={(e) => setConstraint(e.target.value)}
                disabled={isForging}
              />
            </div>
          )}
        </div>
      </section>

      {/* Main Workspace Panels */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Saved Specs Drawer */}
        {showHistory && (
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-[#0d0f15]/95 border-r border-white/[0.08] z-20 flex flex-col backdrop-blur-xl shadow-2xl">
            <div className="p-4 border-b border-white/[0.08] flex justify-between items-center text-xs font-mono tracking-wider uppercase text-zinc-400">
              <span>RFC Archive</span>
              {savedSpecs.length > 0 && (
                <button 
                  onClick={() => { setSavedSpecs([]); localStorage.removeItem("prdmachine_history"); }}
                  className="text-zinc-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {savedSpecs.length === 0 ? (
                <div className="text-xs text-zinc-600 p-4 font-mono">No previous specs cached in local vault.</div>
              ) : (
                savedSpecs.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSpecMarkdown(item.markdown);
                      setMermaidChart(item.chart);
                      setStatusMessage("Archived Spec Restored");
                    }}
                    className="p-3 rounded-lg bg-[#141824]/60 hover:bg-white/[0.05] cursor-pointer text-xs border border-white/[0.04] transition-all group"
                  >
                    <div className="font-mono text-zinc-200 line-clamp-2 leading-relaxed group-hover:text-white">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-2 flex items-center justify-between">
                      <span>{item.timestamp}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Left Column: Markdown Canvas */}
        <section className="w-1/2 border-r border-white/[0.08] flex flex-col h-full bg-[#08090c]">
          <div className="h-10 px-4 border-b border-white/[0.08] bg-[#0e1117] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Specification Canvas</span>
            </div>

            {specMarkdown && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-white/[0.08] hover:bg-white/[0.05] text-[11px] font-mono text-zinc-300 transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-[11px] font-mono text-indigo-300 transition-all"
                >
                  <Download className="w-3 h-3" />
                  <span>Export .md</span>
                </button>
              </div>
            )}
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 text-sm leading-relaxed font-sans text-zinc-300 prose prose-invert max-w-none prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-white/[0.08] prose-h2:pb-2 prose-h3:text-sm prose-code:font-mono prose-code:text-indigo-300"
          >
            {specMarkdown ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {specMarkdown}
              </ReactMarkdown>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-zinc-500">
                  <Terminal className="w-6 h-6" />
                </div>
                <div className="font-mono text-xs text-zinc-500 tracking-wide">
                  Waiting for generation trigger. Click "Forge RFC" above.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Reactive Topology Canvas */}
        <section className="w-1/2 flex flex-col h-full bg-[#08090c]">
          <div className="h-10 px-4 border-b border-white/[0.08] bg-[#0e1117] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Reactive Topology Canvas</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Interactive SVG Core</span>
          </div>

          <div className="flex-1 overflow-hidden relative bg-[#090b10]">
            <MermaidViewer chart={mermaidChart} />
          </div>

          {/* Audit Stream Console */}
          <footer className="h-36 border-t border-white/[0.08] bg-[#0d0f15] p-3.5 overflow-y-auto font-mono text-[11px] text-zinc-400 shrink-0">
            <div className="flex items-center justify-between text-[10px] tracking-wider uppercase text-zinc-500 mb-2 font-bold">
              <span>Consensus Audit Trail</span>
              <span>Event Stream</span>
            </div>
            <div className="space-y-1.5">
              {agentLogs.length === 0 ? (
                <div className="text-zinc-600 italic">No network events recorded yet.</div>
              ) : (
                agentLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-zinc-600 select-none">-</span>
                    <span className={"font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded " + (
                      log.agent === "architect" ? "text-blue-400 bg-blue-500/10" :
                      log.agent === "chaos" ? "text-amber-400 bg-amber-500/10" :
                      "text-emerald-400 bg-emerald-500/10"
                    )}>
                      {log.agent}
                    </span>
                    <span className="text-zinc-300">{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
