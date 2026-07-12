import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { exec } from "child_process";
import multer from "multer";
import express from "express";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // API Endpoints middleware
      server.middlewares.use("/api", (req, res, next) => {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const pathname = url.pathname;

        // Helper function to locate the unified a1build outputs directory
        const getOutputDir = () => {
          const candidates = [
            path.resolve(PROJECT_ROOT, "..", "a1build", "outputs"),
            path.resolve(PROJECT_ROOT, "a1build", "outputs"),
          ];
          for (const p of candidates) {
            if (fs.existsSync(p)) return p;
          }
          return path.resolve(PROJECT_ROOT, "..", "a1build", "outputs");
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

        const sendJson = (data: any) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(data));
        };

        const sendError = (status: number, message: string) => {
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        };

        try {
          if (pathname === "/upload" || pathname === "/upload/") {
            const A1_POLICIES_DIR = path.resolve(PROJECT_ROOT, "..", "a1build", "data", "policies");
            if (!fs.existsSync(A1_POLICIES_DIR)) fs.mkdirSync(A1_POLICIES_DIR, { recursive: true });

            const upload = multer({
              storage: multer.diskStorage({
                destination: (_r, _f, cb) => cb(null, A1_POLICIES_DIR),
                filename: (_r, f, cb) => cb(null, f.originalname)
              })
            });

            // multer expects express req/res
            upload.array("files")(req as any, res as any, async (err: any) => {
              if (err) return sendError(500, err.message);

              const runCommand = (cmd: string, cwd: string) => new Promise((resolve, reject) => {
                exec(cmd, { cwd }, (e, stdout, stderr) => {
                  if (e) reject(e);
                  else resolve(stdout);
                });
              });

              try {
                const a1Dir = path.resolve(PROJECT_ROOT, "..", "a1build");
                await runCommand(`venv\\Scripts\\python run_pipeline.py`, a1Dir);
                return sendJson({ message: "Unified pipeline executed successfully" });
              } catch (e: any) {
                return sendError(500, e.message);
              }
            });
            return;
          }

          if (pathname === "/inventory" || pathname === "/inventory/") {
            const A1_POLICIES_DIR = path.resolve(PROJECT_ROOT, "..", "a1build", "data", "policies");
            try {
              if (fs.existsSync(A1_POLICIES_DIR)) {
                const files = fs.readdirSync(A1_POLICIES_DIR).filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.pdf'));
                return sendJson({ files });
              } else {
                return sendJson({ files: [] });
              }
            } catch (err: any) {
              return sendError(500, err.message);
            }
          }

          if (pathname === "/scores" || pathname === "/scores/") {
            const data = readJsonFile("scores.json");
            if (!data) return sendError(404, "scores.json not found");
            return sendJson(data);
          }

          if (pathname === "/staleness" || pathname === "/staleness/") {
            const data = readJsonFile("staleness.json") || readJsonFile("staleness_rollup.json") || readJsonFile("staleness_by_document.json");
            if (!data) return sendError(404, "staleness data not found");
            const arr = Array.isArray(data) ? data : [];
            const mapped = arr.map((d: any) => ({ ...d, doc_staleness_status: d.doc_staleness_status || d.staleness_status }));
            return sendJson(mapped);
          }

          if (pathname === "/graph" || pathname === "/graph/") {
            const data = readJsonFile("graph_export.json");
            if (!data) return sendError(404, "graph_export.json not found");
            return sendJson(data);
          }

          if (pathname === "/findings" || pathname === "/findings/") {
            const data = readJsonFile("resolved_findings.json");
            if (!data) return sendError(404, "resolved_findings.json not found");
            let findings = Array.isArray(data) ? data : [];

            const type = url.searchParams.get("type");
            const severity = url.searchParams.get("severity");
            const precedence_basis = url.searchParams.get("precedence_basis");
            const query = url.searchParams.get("query");
            const limit = url.searchParams.get("limit");
            const offset = url.searchParams.get("offset");

            if (type) {
              findings = findings.filter((f: any) => f.finding_type === type);
            }
            if (severity) {
              findings = findings.filter((f: any) => f.severity === severity);
            }
            if (precedence_basis) {
              findings = findings.filter((f: any) => f.precedence_resolution?.precedence_basis === precedence_basis);
            }
            if (query) {
              const q = query.toLowerCase();
              findings = findings.filter((f: any) => 
                (f.policy_a && f.policy_a.toLowerCase().includes(q)) ||
                (f.policy_b && f.policy_b.toLowerCase().includes(q)) ||
                (f.description && f.description.toLowerCase().includes(q)) ||
                (f.obligation_id_a && f.obligation_id_a.toLowerCase().includes(q)) ||
                (f.obligation_id_b && f.obligation_id_b.toLowerCase().includes(q))
              );
            }

            const total = findings.length;
            const lim = limit ? parseInt(limit, 10) : 50;
            const off = offset ? parseInt(offset, 10) : 0;
            const paginated = findings.slice(off, off + lim);

            return sendJson({
              total,
              limit: lim,
              offset: off,
              data: paginated
            });
          }

          if (pathname === "/obligations" || pathname === "/obligations/") {
            const data = readJsonFile("obligations.json");
            if (!data) return sendError(404, "obligations.json not found");
            let obligations = Array.isArray(data) ? data : [];

            const query = url.searchParams.get("query");
            const limit = url.searchParams.get("limit");
            const offset = url.searchParams.get("offset");
            const stale = url.searchParams.get("stale");
            const topic = url.searchParams.get("topic");
            const policy = url.searchParams.get("policy");

            if (stale !== null) {
              const isStale = stale === "true";
              const rollup = readJsonFile("staleness_rollup.json") || [];
              obligations = obligations.filter((o: any) => {
                const matchingRollup = rollup.find((r: any) => r.doc_id === o.doc_id);
                const rollupStatus = matchingRollup?.doc_staleness_status;
                const obligationStale = rollupStatus === "STALE" || rollupStatus === "RETIRED" || o.last_reviewed !== null;
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
              const q = query.toLowerCase();
              obligations = obligations.filter((o: any) => 
                (o.id && o.id.toLowerCase().includes(q)) ||
                (o.policy && o.policy.toLowerCase().includes(q)) ||
                (o.raw_text && o.raw_text.toLowerCase().includes(q))
              );
            }

            const total = obligations.length;
            const lim = limit ? parseInt(limit, 10) : 50;
            const off = offset ? parseInt(offset, 10) : 0;
            const paginated = obligations.slice(off, off + lim);

            return sendJson({
              total,
              limit: lim,
              offset: off,
              data: paginated
            });
          }

          if (pathname === "/crucible" || pathname === "/crucible/") {
            const data = readJsonFile("crucible_findings.json");
            if (!data) return sendError(404, "crucible_findings.json not found");
            const findings = Array.isArray(data) ? data : [];
            return sendJson({ total: findings.length, data: findings });
          }

          if (pathname === "/compiled" || pathname === "/compiled/") {
            const data = readJsonFile("compiled_document.json");
            if (!data) return sendError(404, "compiled_document.json not found");
            return sendJson(data);
          }

          if (pathname === "/echo" || pathname === "/echo/") {
            if (req.method !== "POST") return sendError(405, "Method not allowed");
            
            let body = "";
            req.on("data", chunk => body += chunk.toString());
            req.on("end", () => {
              try {
                const { question } = JSON.parse(body);
                const q = (question || "").toLowerCase();
                let answer = "I processed your query against the CONCORD graph.";
                let details = "No specific overlaps or insights were triggered by your parameters.";

                const findings = readJsonFile("resolved_findings.json") || [];
                const stalenessData = readJsonFile("staleness_by_document.json") || readJsonFile("staleness.json") || [];
                const crucible = readJsonFile("crucible_findings.json") || [];

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
                sendJson({ answer, details });
              } catch (e: any) {
                sendError(500, e.message);
              }
            });
            return;
          }

          return next();
        } catch (err: any) {
          return sendError(500, err.message);
        }
      });

      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }

        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        try {
          const forgeUrl = new URL("v1/storage/presign/get", forgeBaseUrl + "/");
          forgeUrl.searchParams.set("path", key);

          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginStorageProxy()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
