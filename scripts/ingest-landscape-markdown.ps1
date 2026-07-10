param(
  [Parameter(Position = 0)]
  [string]$SourceFolder
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$builder = Join-Path $scriptRoot "build-landscape-markdown-index.mjs"

if ([string]::IsNullOrWhiteSpace($SourceFolder)) {
  node $builder
} else {
  node $builder $SourceFolder
}
