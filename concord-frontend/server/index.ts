import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure a1build/data/policies exists
const A1_POLICIES_DIR = path.resolve(__dirname, "..", "..", "a1build", "data", "policies");
if (!fs.existsSync(A1_POLICIES_DIR)) {
  fs.mkdirSync(A1_POLICIES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, A1_POLICIES_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Helper function to locate the unified a1build outputs directory
  const getOutputDir = () => {
    const candidates = [
      path.resolve(__dirname, "..", "..", "a1build", "outputs"),
      path.resolve(process.cwd(), "..", "a1build", "outputs"),
      path.resolve(process.cwd(), "a1build", "outputs"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return path.resolve(__dirname, "..", "..", "a1build", "outputs");
  };

  const readJsonFile = (filename: string) => {
    const dir = getOutputDir();
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  };

  // Run shell command wrapped in a Promise
  const runCommand = (command: string, cwd: string) => {
    return new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing ${command}:`, error);
          console.error(stderr);
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  };

  // API Route: Upload and Run Unified Pipeline
  app.post("/api/upload", upload.array("files"), async (req, res) => {
    try {
      console.log("Files uploaded. Triggering unified CONCORD pipeline...");
      const a1Dir = path.resolve(__dirname, "..", "..", "a1build");
      // Run unified pipeline (L0 through L16)
      await runCommand(`venv\\Scripts\\python run_pipeline.py`, a1Dir);
      console.log("Unified pipeline completed successfully.");
      res.json({ message: "Unified pipeline executed successfully" });
    } catch (err: any) {
      console.error("Pipeline execution failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Inventory (List uploaded files)
  app.get("/api/inventory", (req, res) => {
    try {
      if (fs.existsSync(A1_POLICIES_DIR)) {
        const files = fs.readdirSync(A1_POLICIES_DIR).filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.pdf'));
        res.json({ files });
      } else {
        res.json({ files: [] });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Scores
  app.get("/api/scores", async (_req, res) => {
    try {
      const data = await readJsonFile("scores.json");
      if (!data) return res.status(404).json({ error: "scores.json not found" });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Staleness Rollup
  app.get("/api/staleness", async (_req, res) => {
    try {
      const data = await readJsonFile("staleness.json") || await readJsonFile("staleness_rollup.json") || await readJsonFile("staleness_by_document.json");
      if (!data) return res.status(404).json({ error: "staleness data not found" });
      const arr = Array.isArray(data) ? data : [];
      const mapped = arr.map((d: any) => ({
        ...d,
        doc_staleness_status: d.doc_staleness_status || d.staleness_status
      }));
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Graph Export
  app.get("/api/graph", async (_req, res) => {
    try {
      const data = await readJsonFile("graph_export.json");
      if (!data) return res.status(404).json({ error: "graph_export.json not found" });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Resolved Findings
  app.get("/api/findings", async (req, res) => {
    try {
      const data = await readJsonFile("resolved_findings.json");
      if (!data) return res.status(404).json({ error: "resolved_findings.json not found" });
      
      let findings = Array.isArray(data) ? data : [];

      const { type, severity, precedence_basis, query, limit, offset } = req.query;

      if (type) {
        findings = findings.filter(f => f.finding_type === type);
      }
      if (severity) {
        findings = findings.filter(f => f.severity === severity);
      }
      if (precedence_basis) {
        findings = findings.filter(f => f.precedence_resolution?.precedence_basis === precedence_basis);
      }
      if (query) {
        const q = String(query).toLowerCase();
        findings = findings.filter(f => 
          (f.policy_a && f.policy_a.toLowerCase().includes(q)) ||
          (f.policy_b && f.policy_b.toLowerCase().includes(q)) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          (f.obligation_id_a && f.obligation_id_a.toLowerCase().includes(q)) ||
          (f.obligation_id_b && f.obligation_id_b.toLowerCase().includes(q))
        );
      }

      const total = findings.length;
      const lim = limit ? parseInt(String(limit), 10) : 50;
      const off = offset ? parseInt(String(offset), 10) : 0;
      const paginated = findings.slice(off, off + lim);

      res.json({ total, limit: lim, offset: off, data: paginated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: CRUCIBLE Threat Coverage Gaps (L15)
  app.get("/api/crucible", async (_req, res) => {
    try {
      const data = await readJsonFile("crucible_findings.json");
      if (!data) return res.status(404).json({ error: "crucible_findings.json not found" });
      const findings = Array.isArray(data) ? data : [];
      res.json({ total: findings.length, data: findings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: SYNOD Compiled Document (L16)
  app.get("/api/compiled", async (_req, res) => {
    try {
      const data = await readJsonFile("compiled_document.json");
      if (!data) return res.status(404).json({ error: "compiled_document.json not found" });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Obligations
  app.get("/api/obligations", async (req, res) => {
    try {
      const data = await readJsonFile("obligations.json");
      if (!data) return res.status(404).json({ error: "obligations.json not found" });

      let obligations = Array.isArray(data) 
        ? data 
        : (data && Array.isArray(data.obligations) ? data.obligations : []);

      const { query, limit, offset, stale, topic, policy } = req.query;

      if (stale !== undefined) {
        const isStale = stale === "true";
        const rollupData = await readJsonFile("staleness_rollup.json") || await readJsonFile("staleness_by_document.json") || [];
        const rollup = rollupData.map((d: any) => ({
          ...d,
          doc_staleness_status: d.doc_staleness_status || d.staleness_status
        }));
        obligations = obligations.filter((o: any) => {
          const matchingRollup = rollup.find((r: any) => r.doc_id === o.doc_id);
          const rollupStatus = matchingRollup?.doc_staleness_status;
          const obligationStale = rollupStatus === "STALE" || rollupStatus === "RETIRED";
          return isStale ? obligationStale : !obligationStale;
        });
      }

      if (topic) {
        obligations = obligations.filter((o: any) => o.topic === topic);
      }

      if (policy) {
        obligations = obligations.filter((o: any) => o.policy === policy);
      }

      if (query) {
        const q = String(query).toLowerCase();
        obligations = obligations.filter((o: any) => 
          (o.id && o.id.toLowerCase().includes(q)) ||
          (o.policy && o.policy.toLowerCase().includes(q)) ||
          (o.raw_text && o.raw_text.toLowerCase().includes(q))
        );
      }

      const total = obligations.length;

      const lim = limit ? parseInt(String(limit), 10) : 50;
      const off = offset ? parseInt(String(offset), 10) : 0;
      const paginated = obligations.slice(off, off + lim);

      res.json({
        total,
        limit: lim,
        offset: off,
        data: paginated
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: ECHO Assistant
  app.post("/api/echo", async (req, res) => {
    try {
      const { question } = req.body;
      const q = (question || "").toLowerCase();
      let answer = "I processed your query against the CONCORD graph.";
      let details = "No specific overlaps or insights were triggered by your parameters.";

      // Load data
      const findings = await readJsonFile("resolved_findings.json") || [];
      const stalenessData = await readJsonFile("staleness_by_document.json") || await readJsonFile("staleness.json") || [];
      const crucible = await readJsonFile("crucible_findings.json") || [];
      
      // Heuristics
      if (q.includes("stale") || q.includes("old") || q.includes("decay")) {
        const staleDocs = stalenessData.filter((d: any) => d.staleness_status === "STALE" || d.doc_staleness_status === "STALE");
        answer = `I found ${staleDocs.length} stale policy documents in the active workspace.`;
        details = `Stale documents: ${staleDocs.map((d: any) => d.doc_id || d.policy).slice(0, 5).join(", ")}${staleDocs.length > 5 ? "..." : ""}. These documents have exceeded the decay cutoff window.`;
      } 
      else if (q.includes("override") || q.includes("precedence")) {
        const overrides = findings.filter((f: any) => f.finding_type === "CONFLICT" && f.precedence_resolution && f.precedence_resolution.governing_policy);
        if (overrides.length > 0) {
          const c = overrides[0];
          answer = `Found active precedence resolution: ${c.precedence_resolution.governing_policy} overrides other conflicting documents.`;
          details = `Reasoning: ${c.precedence_resolution.reasoning || "Resolved via structural precedence rules."}`;
        } else {
          answer = "No active overrides found in the current graph.";
        }
      }
      else if (q.includes("conflict") || q.includes("contradiction")) {
        const conflicts = findings.filter((f: any) => f.finding_type === "CONFLICT");
        if (conflicts.length > 0) {
          const c = conflicts[0];
          answer = `I found ${conflicts.length} unresolved or resolved conflicts. For example, ${c.policy_a} conflicts with ${c.policy_b}.`;
          details = `Reasoning: ${c.description || c.voice_explanation || "Conflict detected due to semantic overlap and contradictory mandates."}`;
        } else {
          answer = "No active conflicts found in the current graph.";
        }
      }
      else if (q.includes("redundant") || q.includes("duplicate")) {
        const red = findings.filter((f: any) => f.finding_type === "REDUNDANT");
        if (red.length > 0) {
          answer = `I detected ${red.length} redundancies in the policy hierarchy.`;
          details = `For example, between ${red[0].policy_a} and ${red[0].policy_b}: ${red[0].description}`;
        } else {
          answer = "No active redundancies found.";
        }
      }
      else if (q.includes("threat") || q.includes("mitre") || q.includes("crucible")) {
        if (crucible.length > 0) {
          answer = `I found ${crucible.length} MITRE ATT&CK coverage gaps in the operative policies.`;
          details = `Top gap: ${crucible[0].threat_actor || crucible[0].technique} - ${crucible[0].proposed_remediation}`;
        } else {
          answer = "No active threat gaps detected by CRUCIBLE.";
        }
      }
      else {
        // generic search
        const hits = findings.filter((f: any) => 
          JSON.stringify(f).toLowerCase().includes(q.replace(/[^a-z0-9]/g, ' ').trim().split(' ')[0])
        );
        if (hits.length > 0) {
          answer = `I found ${hits.length} related findings based on your query.`;
          details = `Top match involves ${hits[0].policy_a} and ${hits[0].policy_b}: ${hits[0].description}`;
        } else {
          answer = "I processed your query against the CONCORD graph.";
          details = "No specific overlaps or insights were triggered by your parameters. Try asking about 'conflicts', 'staleness', 'overrides', or 'threats'.";
        }
      }

      res.json({ answer, details });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
