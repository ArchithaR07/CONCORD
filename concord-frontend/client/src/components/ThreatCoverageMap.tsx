import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";

export default function ThreatCoverageMap() {
  const [findings, setFindings] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/crucible")
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setFindings(data.data ?? data))
      .catch((err) => console.error(err));
  }, []);

  if (findings.length === 0) return null;

  return (
    <Card className="col-span-full border-red-500/20 bg-red-500/5 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              CRUCIBLE Threat-Mapped Adequacy
            </CardTitle>
            <CardDescription>
              Uncovered MITRE ATT&CK techniques across the operative policy corpus.
            </CardDescription>
          </div>
          <Badge variant="destructive">{findings.length} COVERAGE GAPS</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {findings.map((f, i) => (
            <div key={i} className="p-4 border border-red-500/30 bg-background rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-lg">{f.technique_name}</h4>
                  <p className="text-sm text-muted-foreground font-mono">{f.technique_id} • {f.tactic}</p>
                </div>
                <Badge variant="outline" className="text-red-500 border-red-500">{f.severity}</Badge>
              </div>
              <p className="text-sm mt-3">{f.gap_reason}</p>
              <div className="mt-4 p-3 bg-muted/50 rounded-md border text-sm">
                <span className="font-semibold text-primary mr-2">Proposed Fix:</span>
                <span className="italic">{f.suggested_draft_clause}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
