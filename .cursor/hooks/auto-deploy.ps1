# Runs when an agent turn ends: type-check, commit all changes, push main so Netlify redeploys.
# A failed type-check skips the push so a broken build never reaches the live site.
$null = [Console]::In.ReadToEnd()
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

function Done([string]$message) {
  if ($message) { [Console]::Error.WriteLine("[auto-deploy] $message") }
  Write-Output "{}"
  exit 0
}

$branch = (git branch --show-current).Trim()
if ($branch -ne "main") { Done "branch '$branch' is not main; skipped" }

$changes = git status --porcelain
if (-not $changes) { Done "no changes" }

npx tsc --noEmit -p tsconfig.json --pretty false *> $null
if ($LASTEXITCODE -ne 0) { Done "type-check failed; not pushing" }

git add -A
git commit -m "update site changes" *> $null
if ($LASTEXITCODE -ne 0) { Done "nothing committed" }

git push origin main *> $null
if ($LASTEXITCODE -ne 0) { Done "push failed" }

Done "pushed to origin/main"
