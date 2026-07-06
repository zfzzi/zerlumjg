$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$scriptPath = Join-Path $repoRoot "scripts\search-desktop-markdown.mjs"

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
  & $nodeCommand.Source $scriptPath @args
  exit $LASTEXITCODE
}

$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if (Test-Path -LiteralPath $bundledNode) {
  & $bundledNode $scriptPath @args
  exit $LASTEXITCODE
}

throw "Node.js was not found. Install Node.js or run with Codex desktop bundled dependencies available."
