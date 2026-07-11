import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PolicyNode {
  id: string;
  label: string;
  confidence: "high" | "medium" | "low";
  isKeystone?: boolean;
  category?: string;
}

export interface PolicyEdge {
  source: string;
  target: string;
  type: "conflict" | "redundancy" | "related";
  confidence: "high" | "medium" | "low";
}

interface PolicyGraphProps {
  nodes: PolicyNode[];
  edges: PolicyEdge[];
  onNodeClick?: (nodeId: string) => void;
  className?: string;
  height?: number;
}

const confidenceColors = {
  high: "#a6e3a1",
  medium: "#f9cc24",
  low: "#ff6b6b",
};

export function PolicyGraph({
  nodes,
  edges,
  onNodeClick,
  className,
  height = 600,
}: PolicyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = height;

    ctx.fillStyle = "oklch(0.12 0.02 280)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const positions = calculateNodePositions(nodes, canvas.width, height);

    edges.forEach((edge) => {
      const sourcePos = positions[edge.source];
      const targetPos = positions[edge.target];

      if (!sourcePos || !targetPos) return;

      ctx.strokeStyle = confidenceColors[edge.confidence];
      ctx.lineWidth = edge.type === "conflict" ? 2 : 1;
      ctx.globalAlpha = edge.type === "conflict" ? 0.8 : 0.4;

      if (edge.type === "conflict") {
        ctx.setLineDash([5, 5]);
      }

      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });

    nodes.forEach((node) => {
      const pos = positions[node.id];
      if (!pos) return;

      const isSelected = selectedNode === node.id;
      const isHovered = hoveredNode === node.id;
      const radius = node.isKeystone ? 20 : 15;

      if (node.isKeystone) {
        ctx.fillStyle = confidenceColors[node.confidence];
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = confidenceColors[node.confidence];
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.strokeStyle = "oklch(0.92 0.01 280)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [nodes, edges, selectedNode, hoveredNode, height]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const positions = calculateNodePositions(nodes, canvas.width, height);

    for (const node of nodes) {
      const pos = positions[node.id];
      if (!pos) continue;

      const distance = Math.sqrt(
        Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
      );
      if (distance < 25) {
        setSelectedNode(node.id);
        onNodeClick?.(node.id);
        return;
      }
    }

    setSelectedNode(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const positions = calculateNodePositions(nodes, canvas.width, height);

    for (const node of nodes) {
      const pos = positions[node.id];
      if (!pos) continue;

      const distance = Math.sqrt(
        Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
      );
      if (distance < 25) {
        setHoveredNode(node.id);
        canvas.style.cursor = "pointer";
        return;
      }
    }

    setHoveredNode(null);
    canvas.style.cursor = "default";
  };

  return (
    <div className={cn("relative w-full rounded-lg overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        className="w-full bg-gradient-to-br from-slate-950 to-slate-900"
      />

      <div className="absolute bottom-4 left-4 glass-card p-4">
        <p className="text-xs font-semibold text-foreground mb-3">Legend</p>
        <div className="space-y-2">
          {Object.entries(confidenceColors).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground capitalize">
                {level}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function calculateNodePositions(
  nodes: PolicyNode[],
  width: number,
  height: number
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    positions[node.id] = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });

  return positions;
}
