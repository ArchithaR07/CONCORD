$file = "client\src\pages\Home.tsx"
$content = Get-Content $file -Raw

# Alert/status tiles
$content = $content -replace 'themeMode === "light" \? "bg-\[#ff6b6b\]/5 border-\[#ff6b6b\]/15 shadow-\[0_0_15px_rgba\(255,107,107,0\.05\)\]" : "bg-\[#ff6b6b\]/10 border-\[#ff6b6b\]/20 shadow-\[0_0_15px_rgba\(255,107,107,0\.1\)\]"', '"bg-[#ff6b6b]/10 border-[#ff6b6b]/20 shadow-[0_0_15px_rgba(255,107,107,0.1)]"'

# Inline muted panels
$content = $content -replace 'themeMode === "light" \? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white/5 border-white/5 text-white"', '"bg-muted border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200 text-slate-900 shadow-inner" : "bg-white/5 border-white/5 text-white"', '"bg-muted/50 border-border text-foreground shadow-inner"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-black/40 text-slate-400"', '"bg-muted text-foreground border border-border"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200 text-slate-850" : "bg-white/5 border-white/5 text-white"', '"bg-muted/50 border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/5 text-slate-300"', '"bg-muted/50 border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"', '"bg-muted border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/10 text-slate-350"', '"bg-muted/50 border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/10 text-slate-200"', '"bg-muted/50 border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100 border-slate-200 text-slate-500" : "bg-white/5 border-white/5 text-slate-400"', '"bg-muted border-border text-muted-foreground"'
$content = $content -replace 'themeMode === "light" \? "bg-slate-100 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"', '"bg-muted border-border text-foreground"'
$content = $content -replace 'themeMode === "light" \? "border-slate-200 bg-slate-100 text-slate-500" : "border-white/10 bg-black/40 text-slate-550"', '"border-border bg-muted text-muted-foreground"'

# Amber accent
$content = $content -replace 'themeMode === "light" \? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-500/10 border-amber-500/20 text-amber-300"', '"bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-300"'
$content = $content -replace 'themeMode === "light" \? "bg-amber-50/50 border-amber-200 text-amber-800" : "bg-amber-500/5 border-amber-500/20 text-amber-400"', '"bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"'

# Green accent
$content = $content -replace 'themeMode === "light" \? "bg-green-50 border-green-200 text-green-800" : "bg-green-500/10 border-green-500/20 text-green-400"', '"bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"'

# Red accent
$content = $content -replace 'themeMode === "light" \? "bg-red-50/50 border-red-200 text-red-800" : "bg-red-500/5 border-red-500/20 text-red-400"', '"bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"'
$content = $content -replace 'themeMode === "light" \? "bg-red-50 border-red-200 text-red-800" : "bg-red-500/10 border-red-500/20 text-red-450 animate-pulse"', '"bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400 animate-pulse"'

# Text remaining variants
$content = $content -replace 'themeMode === "light" \? "text-slate-655" : "text-slate-400"', '"text-muted-foreground"'
$content = $content -replace '\$\{themeMode === "light" \? "text-slate-800 text-sm" : "text-white text-sm"\}', '"text-foreground text-sm"'
$content = $content -replace 'themeMode === "light" \? "text-slate-800 text-sm" : "text-white text-sm"', '"text-foreground text-sm"'

# Canvas graph colors
$content = $content -replace '\(themeMode === "light" \? "rgba\(203, 213, 225, 0\.4\)" : "rgba\(51, 65, 85, 0\.4\)"\)', '(document.documentElement.classList.contains("light") ? "rgba(203, 213, 225, 0.4)" : "rgba(51, 65, 85, 0.4)")'
$content = $content -replace '\(themeMode === "light" \? "#f1f5f9" : "#1e293b"\)', '(document.documentElement.classList.contains("light") ? "#f1f5f9" : "#1e293b")'
$content = $content -replace '\(themeMode === "light" \? "#334155" : "#cbd5e1"\)', '(document.documentElement.classList.contains("light") ? "#334155" : "#cbd5e1")'

$content | Set-Content $file -NoNewline
Write-Host "Second pass complete."
Write-Host "Remaining themeMode occurrences: $((Select-String -Path $file -Pattern 'themeMode').Count)"
