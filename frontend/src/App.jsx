import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidViewer from "./components/MermaidViewer";
import {
  Terminal, Shield, AlertTriangle, Layers,
  Download, Copy, Check, Sliders, History, Trash2,
  Sparkles, RefreshCw, Activity, ArrowUpRight, Key, X, Cpu, FileText, Code2, Package
} from "lucide-react";

export default function App() {
  const [idea, setIdea] = useState("A distributed ride-sharing system for autonomous drones in metropolitan areas");
  const [constraint, setConstraint] = useState("");
  const [showConstraint, setShowConstraint] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash-lite");
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
    const savedKey = localStorage.getItem("prdmachine_gemini_key");
    if (savedKey) {
      setApiKey(savedKey);
      setTempApiKey(savedKey);
    }
    const savedModel = localStorage.getItem("prdmachine_model");
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current && isForging) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [specMarkdown, isForging]);

  const saveApiKeyToStorage = () => {
    const trimmed = tempApiKey.trim();
    setApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem("prdmachine_gemini_key", trimmed);
    } else {
      localStorage.removeItem("prdmachine_gemini_key");
    }
    setShowKeyModal(false);
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    localStorage.setItem("prdmachine_model", model);
  };

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

    const apiBase = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;
    const params = new URLSearchParams();
    params.set("idea", idea);
    params.set("rounds", rounds);
    params.set("model", selectedModel);
    if (constraint.trim()) params.set("constraint", constraint.trim());
    if (apiKey.trim()) params.set("api_key", apiKey.trim());

    const url = `${apiBase}/api/rfc/stream?${params.toString()}`;

    let finalMarkdown = "";
    let finalChart = mermaidChart;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => setStatusMessage(`Active (${selectedModel})`);

    eventSource.onmessage = (event) => {
      try {
        let rawData = event.data;
        if (!rawData) return;
        if (rawData.startsWith("data:")) rawData = rawData.slice(5).trim();

        const payload = JSON.parse(rawData);

        if (payload.event === "error") {
          setStatusMessage("Execution Error");
          setIsForging(false);
          setAgentLogs((prev) => [
            ...prev,
            { agent: "system", text: `Error: ${payload.delta}` }
          ]);
          eventSource.close();
          return;
        }

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
            if (payload.delta) {
              finalChart = payload.delta;
              setMermaidChart(payload.delta);
              setAgentLogs((prev) => [
                ...prev,
                { agent: payload.agent, text: "Hardened topology diagram reconstructed." }
              ]);
            }
            break;
          case "agent_end":
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

  const handleCopyMarkdown = () => {
    if (!specMarkdown) return;
    navigator.clipboard.writeText(specMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(u);
    setShowExportMenu(false);
  };

  const handleExportMarkdown = () => {
    downloadFile(specMarkdown, `RFC-${Date.now()}.md`, "text/markdown");
  };

  const handleExportMermaid = () => {
    downloadFile(mermaidChart, `topology-${Date.now()}.mmd`, "text/vnd.mermaid");
  };

  const handleExportBundle = () => {
    const bundle = {
      specVersion: "1.0.0",
      timestamp: new Date().toISOString(),
      model: selectedModel,
      prompt: idea,
      constraint: constraint || null,
      rounds,
      markdownRFC: specMarkdown,
      mermaidTopology: mermaidChart,
      auditLogs: agentLogs
    };
    downloadFile(JSON.stringify(bundle, null, 2), `PRDMachine-Bundle-${Date.now()}.json`, "application/json");
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

        {/* Controls: Model Select, BYOK Key, Status, Archive */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-[#12151d] border border-white/[0.08] rounded-md px-2 py-1 text-xs font-mono text-zinc-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-transparent text-zinc-200 text-xs font-mono focus:outline-none cursor-pointer"
            >
              <option value="gemini-2.5-flash-lite" className="bg-[#12151d] text-zinc-200">Gemini 2.5 Flash Lite</option>
              <option value="gemini-flash-latest" className="bg-[#12151d] text-zinc-200">Gemini Flash Latest</option>
              <option value="gemini-pro-latest" className="bg-[#12151d] text-zinc-200">Gemini Pro Latest</option>
            </select>
          </div>

          <button
            onClick={() => {
              setTempApiKey(apiKey);
              setShowKeyModal(true);
            }}
            className={"flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono transition-all " + (
              apiKey 
                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                : "border-rose-500/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20"
            )}
            title="Configure Gemini API Key"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? "Key Set" : "Add Key"}</span>
          </button>

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

      {/* BYOK Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f121a] border border-white/[0.1] rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Bring Your Own Key (BYOK)</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed font-sans">
              Enter your Google Gemini API key. Stored only in <code className="text-zinc-300">localStorage</code>.
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="w-full bg-[#090b10] border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500 mb-5"
            />
            <div className="flex justify-end gap-2 text-xs font-mono">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 rounded-md border border-white/[0.08] text-zinc-400 hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={saveApiKeyToStorage}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Deck */}
      <div className="p-4 border-b border-white/[0.08] bg-[#0b0d12] flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your system or product architecture concept..."
            className="flex-1 bg-[#12151d] border border-white/[0.08] rounded-lg px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/50 transition-colors font-mono"
            onKeyDown={(e) => { if (e.key === "Enter") startDebateForge(); }}
          />

          <div className="flex items-center gap-2">
            <select
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="bg-[#12151d] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none"
            >
              <option value={1}>1 Round (Fast RFC)</option>
              <option value={2}>2 Rounds (Hardened)</option>
              <option value={3}>3 Rounds (Deep Consensus)</option>
            </select>

            <button
              onClick={() => setShowConstraint(!showConstraint)}
              className={"px-3 py-2.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 " + (
                showConstraint || constraint ? "border-rose-500/40 bg-rose-500/10 text-rose-300" : "border-white/[0.08] hover:bg-white/[0.05] text-zinc-400"
              )}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Constraint</span>
            </button>

            <button
              disabled={isForging || !idea.trim()}
              onClick={startDebateForge}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:opacity-90 disabled:opacity-40 text-white text-xs font-semibold tracking-wider uppercase font-mono flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isForging ? "Forging..." : "Forge RFC"}</span>
            </button>
          </div>
        </div>

        {showConstraint && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={constraint}
              onChange={(e) => setConstraint(e.target.value)}
              placeholder="Inject custom constraint (e.g. 'Must use Raft consensus and Rust with Zero-Copy network buffers')..."
              className="flex-1 bg-[#12151d] border border-rose-500/30 rounded-lg px-4 py-2 text-xs text-rose-200 placeholder-zinc-500 focus:outline-none font-mono"
            />
          </div>
        )}
      </div>

      {/* Main Workspace Split */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column: Live Markdown RFC */}
        <section className="w-1/2 border-r border-white/[0.08] flex flex-col h-full bg-[#08090c]">
          <div className="h-10 px-4 border-b border-white/[0.08] bg-[#0e1117] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Specification RFC Document</span>
            </div>
            <div className="flex items-center gap-1.5 relative">
              <button
                onClick={handleCopyMarkdown}
                disabled={!specMarkdown}
                className="p-1.5 hover:bg-white/[0.06] rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                title="Copy Markdown"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={!specMarkdown}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 disabled:opacity-30 transition-all"
                  title="Export Options"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Export</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-[#0f121a] border border-white/[0.1] rounded-lg shadow-2xl py-1 z-40 text-xs font-mono">
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/[0.06] text-zinc-200"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>RFC Markdown (.md)</span>
                    </button>
                    <button
                      onClick={handleExportMermaid}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/[0.06] text-zinc-200"
                    >
                      <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mermaid Graph (.mmd)</span>
                    </button>
                    <button
                      onClick={handleExportBundle}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/[0.06] text-zinc-200 border-t border-white/[0.06]"
                    >
                      <Package className="w-3.5 h-3.5 text-rose-400" />
                      <span>Complete Bundle (.json)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto font-sans text-sm text-zinc-300 leading-relaxed selection:bg-rose-500/20">
            {specMarkdown ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert max-w-none text-xs leading-6">
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
                      log.agent === "security" ? "text-emerald-400 bg-emerald-500/10" :
                      "text-rose-400 bg-rose-500/10"
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
