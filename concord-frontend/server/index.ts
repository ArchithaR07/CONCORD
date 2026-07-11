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

  // Helper function to robustly locate backend engine outputs
  const getOutputDir = () => {
    const possiblePaths = [
      path.resolve(process.cwd(), "..", "concord-a2 (1)", "concord-a2", "outputs"),
      path.resolve(process.cwd(), "concord-a2 (1)", "concord-a2", "outputs"),
      path.resolve(__dirname, "..", "..", "concord-a2 (1)", "concord-a2", "outputs"),
      path.resolve(__dirname, "..", "concord-a2 (1)", "concord-a2", "outputs"),
      path.resolve(process.cwd(), "..", "CONCORD-A2", "sample_data", "output"),
      path.resolve(process.cwd(), "CONCORD-A2", "sample_data", "output"),
      path.resolve(__dirname, "..", "..", "CONCORD-A2", "sample_data", "output"),
      path.resolve(__dirname, "..", "CONCORD-A2", "sample_data", "output"),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return "c:\\Users\\lenovo\\OneDrive\\Desktop\\concord\\CONCORD\\concord-a2 (1)\\concord-a2\\outputs";
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

  // API Route: Upload and Run Pipeline
  app.post("/api/upload", upload.array("files"), async (req, res) => {
    try {
      console.log("Files uploaded. Triggering A1 and A2 pipelines...");
      
      const a1Dir = path.resolve(__dirname, "..", "..", "a1build");
      const a2Dir = path.resolve(__dirname, "..", "..", "concord-a2 (1)", "concord-a2");
      
      // Step 1: Run A1 pipeline
      console.log("Running A1 pipeline...");
      await runCommand("..\\venv\\Scripts\\python run_a1_pipeline.py", a1Dir);
      
      // Step 2: Copy obligations_embedded.json to A2 outputs as obligations.json
      console.log("Copying A1 outputs to A2 inputs...");
      const a1OutDir = path.join(a1Dir, "outputs");
      const a2OutDir = path.join(a2Dir, "outputs");
      if (!fs.existsSync(a2OutDir)) fs.mkdirSync(a2OutDir, { recursive: true });
      fs.copyFileSync(
        path.join(a1OutDir, "obligations_embedded.json"),
        path.join(a2OutDir, "obligations.json")
      );
      
      // Step 3: Run A2 pipeline
      console.log("Running A2 pipeline...");
      await runCommand("..\\venv\\Scripts\\python scripts\\run_pipeline.py", a2Dir);
      
      console.log("Pipelines completed successfully.");
      res.json({ message: "Pipelines executed successfully" });
    } catch (err: any) {
      console.error("Pipeline execution failed:", err);
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
      const data = await readJsonFile("staleness_rollup.json") || await readJsonFile("staleness_by_document.json");
      if (!data) return res.status(404).json({ error: "staleness data not found" });
      const mapped = data.map((d: any) => ({
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
          (f.obligation_id_1 && f.obligation_id_1.toLowerCase().includes(q)) ||
          (f.obligation_id_2 && f.obligation_id_2.toLowerCase().includes(q))
        );
      }

      const total = findings.length;

      const lim = limit ? parseInt(String(limit), 10) : 50;
      const off = offset ? parseInt(String(offset), 10) : 0;
      const paginated = findings.slice(off, off + lim);

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
