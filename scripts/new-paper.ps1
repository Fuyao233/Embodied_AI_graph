param(
  [Parameter(Mandatory = $true)][string]$PaperId,
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$AlphaXiv,
  [string]$Year = "",
  [string]$Pdf = "",
  [string]$Code = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$normalizedPaperId = $PaperId.Trim().ToLowerInvariant()
$normalizedTitle = $Title.Trim()
$normalizedAlphaXiv = $AlphaXiv.Trim()
$normalizedYear = $Year.Trim()
$normalizedPdf = $Pdf.Trim()
$normalizedCode = $Code.Trim()

if ($normalizedPaperId -notmatch '^[a-z0-9][a-z0-9.-]*$') {
  throw "PaperId must match ^[a-z0-9][a-z0-9.-]*$"
}

if (-not $normalizedTitle) {
  throw "Title must not be empty or whitespace"
}

if (-not $normalizedAlphaXiv) {
  throw "AlphaXiv must not be empty or whitespace"
}

$cardPath = Join-Path $PSScriptRoot "..\papers\cards\$normalizedPaperId.md"
$notePath = Join-Path $PSScriptRoot "..\papers\notes\$normalizedPaperId-note.md"
$cardTemplatePath = Join-Path $PSScriptRoot '..\templates\paper-card.md'
$noteTemplatePath = Join-Path $PSScriptRoot '..\templates\paper-note.md'

if ((Test-Path $cardPath) -or (Test-Path $notePath)) {
  throw "Paper already exists: $normalizedPaperId"
}

$created = Get-Date -Format 'yyyy-MM-dd'

$templateValues = @{
  '{{paper_id}}' = $normalizedPaperId
  '{{title}}' = $normalizedTitle
  '{{year}}' = $normalizedYear
  '{{alphaxiv}}' = $normalizedAlphaXiv
  '{{pdf}}' = $normalizedPdf
  '{{code}}' = $normalizedCode
  '{{created}}' = $created
  '{{date:YYYY-MM-DD}}' = $created
}

function Render-Template {
  param(
    [Parameter(Mandatory = $true)][string]$TemplatePath,
    [Parameter(Mandatory = $true)][hashtable]$Values
  )

  $content = Get-Content -Path $TemplatePath -Raw
  foreach ($placeholder in $Values.Keys) {
    $content = $content.Replace($placeholder, $Values[$placeholder])
  }

  return $content
}

function Write-Utf8NoBomFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$cardContent = Render-Template -TemplatePath $cardTemplatePath -Values $templateValues
$noteContent = Render-Template -TemplatePath $noteTemplatePath -Values $templateValues

Write-Utf8NoBomFile -Path $cardPath -Content $cardContent
Write-Utf8NoBomFile -Path $notePath -Content $noteContent

Write-Host "Created:"
Write-Host "  $cardPath"
Write-Host "  $notePath"
Write-Host "Paper view will pick up the new card automatically."
