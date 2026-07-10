param(
  [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
  [string[]]$Query
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$searcher = Join-Path $scriptRoot "search-landscape-markdown.mjs"
node $searcher @Query
