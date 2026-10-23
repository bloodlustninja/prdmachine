import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from "lucide-react";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: "#08090d",
    primaryColor: "#1e2238",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#3b82f6",
    lineColor: "#64748b",
    secondaryColor: "#181a24",
    tertiaryColor: "#0f111a",
    fontFamily: "JetBrains Mono"
  },
  securityLevel: "loose",
});

export default function MermaidViewer({ chart }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState("");
  const [zoom, setZoom] = useState(1);
  const [renderError, setRenderError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      if (!chart || !chart.trim()) return;

      try {
        setRenderError(null);
        const uniqueId = "mermaid-svg-" + Date.now();
        const { svg } = await mermaid.render(uniqueId, chart);
        if (isMounted) setSvgContent(svg);
      } catch (err) {
        if (isMounted) setRenderError("Compiling architecture topology...");
      }
    };

    renderChart();
    return () => { isMounted = false; };
  }, [chart]);

  const downloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "topology-" + Date.now() + ".svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#050608] bg-dot-matrix overflow-hidden select-none">
      {/* Blueprint Grid Overlay Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
        <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Interactive Topology Core</span>
      </div>

      {/* Floating Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-zinc-950/80 border border-white/[0.08] p-1.5 rounded-xl backdrop-blur-xl shadow-2xl">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
          title="Zoom In"
          className="p-1.5 hover:bg-white/[0.06] text-zinc-400 hover:text-white rounded-lg transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          title="Zoom Out"
          className="p-1.5 hover:bg-white/[0.06] text-zinc-400 hover:text-white rounded-lg transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom(1)}
          title="Reset Zoom"
          className="p-1.5 hover:bg-white/[0.06] text-zinc-400 hover:text-white rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <div className="h-3.5 w-[1px] bg-white/[0.08] mx-1" />
        <button
          onClick={downloadSvg}
          title="Download SVG"
          className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-mono transition-colors"
        >
          <Download className="w-3 h-3" />
          <span className="text-[11px]">SVG</span>
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 w-full h-full flex items-center justify-center overflow-auto p-8">
        {renderError ? (
          <div className="text-xs text-zinc-600 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-700 animate-ping"></span>
            {renderError}
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ transform: "scale(" + zoom + ")", transformOrigin: "center center", transition: "transform 0.15s ease-out" }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:drop-shadow-[0_0_25px_rgba(59,130,246,0.06)]"
          />
        )}
      </div>
    </div>
  );
}
