import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export default function CompiledDocumentView() {
  const [doc, setDoc] = useState<any>(null);

  useEffect(() => {
    fetch("/api/compiled")
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setDoc(data))
      .catch((err) => console.error(err));
  }, []);

  if (!doc) return null;

  return (
    <Card className="col-span-full border-primary/20 shadow-lg mt-8">
      <CardHeader className="bg-primary/5 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              L16 SYNOD Compiled Document
            </CardTitle>
            <CardDescription className="text-base mt-2">
              The living, self-validating policy document compiled from the resolved graph.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="text-green-500 border-green-500 bg-green-500/10">
              {doc.self_validation?.status}
            </Badge>
            <span className="text-xs text-muted-foreground">Generated: {new Date(doc.generated_at).toLocaleString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="-mt-4">
        <div className="space-y-6">
          {doc.sections?.map((sec: any, i: number) => (
            <div key={i} className="p-6 border rounded-xl bg-card shadow-sm relative">
              {sec.status === "PROPOSED_UNRATIFIED" && (
                <div className="absolute -top-3 -right-3">
                  <Badge variant="destructive" className="shadow-sm border-2 border-background">
                    PROPOSED — NOT RATIFIED
                  </Badge>
                </div>
              )}
              
              <h4 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                {sec.topic.replace(/_/g, " ")}
              </h4>
              <p className="text-lg leading-relaxed">{sec.compiled_text}</p>
              
              <div className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground">
                {sec.footnotes?.map((fn: string, j: number) => (
                  <p key={j} className="mb-1">[{j + 1}] {fn}</p>
                ))}
              </div>

              {sec.status === "PROPOSED_UNRATIFIED" && (
                <div className="mt-4 flex gap-3 pt-4">
                  <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">Approve</Button>
                  <Button variant="outline" size="sm">Amend</Button>
                  <Button variant="ghost" size="sm" className="text-destructive">Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
