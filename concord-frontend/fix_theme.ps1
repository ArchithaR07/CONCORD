$file = "client\src\pages\Home.tsx"
$content = Get-Content $file -Raw

# === ROOT WRAPPER ===
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 text-slate-900" : "bg-\[#070712\] text-foreground"', '"bg-background text-foreground"'

# === NAVBAR ===
$content = $content -replace 'themeMode === "light" \? "bg-white/90 border-slate-200 text-slate-900" : "bg-\[#070712\]/80 border-white/10 text-white"', '"bg-background/80 border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"', '"bg-muted border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100 border border-slate-200 hover:bg-slate-200" : "bg-white/5 border border-white/10 hover:bg-white/10"', '"bg-muted border border-border hover:bg-secondary"'

# === TEXT COLORS - white vs slate-900 ===
$content = $content -replace '\$\{themeMode === "light" \? "text-slate-900" : "text-white"\}', '"text-foreground"'
$content = $content -replace 'themeMode === "light" \? "text-slate-900" : "text-white"', '"text-foreground"'

# === TEXT COLORS - slate-600 vs slate-400 ===
$content = $content -replace '\$\{themeMode === "light" \? "text-slate-600" : "text-slate-400"\}', '"text-muted-foreground"'
$content = $content -replace 'themeMode === "light" \? "text-slate-600" : "text-slate-400"', '"text-muted-foreground"'

# === TEXT COLORS - slate-500 vs slate-400 ===
$content = $content -replace '\$\{themeMode === "light" \? "text-slate-500" : "text-slate-400"\}', '"text-muted-foreground"'
$content = $content -replace 'themeMode === "light" \? "text-slate-500" : "text-slate-400"', '"text-muted-foreground"'

# === TEXT COLORS - slate-800 vs white ===
$content = $content -replace '\$\{themeMode === "light" \? "text-slate-800" : "text-white"\}', '"text-foreground"'
$content = $content -replace 'themeMode === "light" \? "text-slate-800" : "text-white"', '"text-foreground"'

# === TEXT COLORS - slate-700 vs slate-300 ===
$content = $content -replace '\$\{themeMode === "light" \? "text-slate-700" : "text-slate-300"\}', '"text-foreground/80"'
$content = $content -replace 'themeMode === "light" \? "text-slate-700" : "text-slate-300"', '"text-foreground/80"'

# === CARD BACKGROUNDS - white/slate-50 vs slate-900/60 ===
$content = $content -replace 'themeMode === "light" \? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"', '"bg-card border-border text-card-foreground shadow-sm"'
$content = $content -replace 'themeMode === "light" \? "bg-white border-slate-200 text-slate-900" : "bg-slate-900/60 border-white/10 text-white"', '"bg-card border-border text-card-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-white border-slate-200" : "bg-slate-900/60 border-white/10"', '"bg-card border-border"'

# === CARD BACKGROUNDS - white/slate-50 ===
$content = $content -replace 'themeMode === "light" \? "bg-white border-slate-200" : "bg-white/5 border-white/10"', '"bg-card border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-white border-slate-200 text-slate-900" : "bg-white/5 border-white/10 text-white"', '"bg-card border-border text-card-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-white border-slate-200 text-slate-800" : "bg-slate-900/95 border-white/10 text-white"', '"bg-card border-border text-card-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-white border-slate-200" : "bg-slate-900/95 border-white/10"', '"bg-card border-border"'

# === MUTED SURFACE BG ===
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/5 border-white/5 text-slate-400"', '"bg-muted/50 border-border text-muted-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/10 text-slate-400"', '"bg-muted/50 border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/10 text-slate-200"', '"bg-muted/50 border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"', '"bg-muted/50 border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/10"', '"bg-muted/50 border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100/50 border-slate-200" : "bg-black/30 border-white/5"', '"bg-muted/30 border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"', '"bg-muted border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"', '"bg-muted border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100/50 border-slate-200" : "bg-white/5 border-white/5"', '"bg-muted/50 border-border"'

# === Dark inner panels ===
$content = $content -replace 'themeMode === "light" \? "bg-white border-slate-200" : "bg-black/30 border-white/5"', '"bg-card border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-white border-slate-200" : "bg-black/40 border-white/5"', '"bg-card border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-white border border-slate-200" : "bg-black/40"', '"bg-card border border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-white border border-slate-200" : "bg-black/40 border-white/5"', '"bg-card border border-border"'

# === HOVER / ACCENT SURFACES ===
$content = $content -replace 'themeMode === "light" \? "bg-cyan-50/50 border-cyan-200" : "bg-cyan-500/10 border-cyan-500/20"', '"bg-primary/5 border-primary/20"'
$content = $content -replace 'themeMode === "light" \? "bg-cyan-50 border-cyan-200" : "bg-cyan-500/10 border-cyan-500/20"', '"bg-primary/5 border-primary/20"'

# === BORDER only ===
$content = $content -replace 'themeMode === "light" \? "border-slate-200" : "border-white/10"', '"border-border"'
$content = $content -replace 'themeMode === "light" \? "border-slate-200" : "border-white/5"', '"border-border"'
$content = $content -replace 'themeMode === "light" \? "border-slate-100" : "border-white/5"', '"border-border"'

# === INPUT FIELD ===
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"', '"bg-input border-border text-foreground"'

# === SVG fill ===
$content = $content -replace 'themeMode === "light" \? "rgba\(15,23,42,0\.8\)" : "rgba\(255,255,255,0\.6\)"', '"currentColor"'

# === REMAINING SIMPLE bg-white patterns ===
$content = $content -replace 'themeMode === "light" \? "bg-white" : "bg-slate-900"', '"bg-card"'
$content = $content -replace 'themeMode === "light" \? "bg-white" : "bg-slate-900/60"', '"bg-card"'
$content = $content -replace 'themeMode === "light" \? "text-slate-650" : "text-slate-400"', '"text-muted-foreground"'

$content | Set-Content $file -NoNewline
Write-Host "Bulk theme replacement complete."
Write-Host "Remaining themeMode occurrences: $((Select-String -Path $file -Pattern 'themeMode').Count)"
