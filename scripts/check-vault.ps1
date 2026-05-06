Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-MarkdownFiles {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Filter
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return @()
  }

  return @(Get-ChildItem -LiteralPath $Path -Filter $Filter -File | Sort-Object Name)
}

function Test-CardFrontmatter {
  param(
    [Parameter(Mandatory = $true)][string]$Content
  )

  $frontmatterMatch = [regex]::Match($Content, '(?s)\A---\r?\n(.*?)\r?\n---')
  if (-not $frontmatterMatch.Success) {
    return $false
  }

  $frontmatter = $frontmatterMatch.Groups[1].Value
  $hasRequiredType = [regex]::IsMatch($frontmatter, '(?mi)^type:\s*paper-card\s*$')
  $hasPaperId = [regex]::IsMatch($frontmatter, '(?mi)^paper_id:\s*\S.*$')
  $hasTitle = [regex]::IsMatch($frontmatter, '(?mi)^title:\s*\S.*$')

  return $hasRequiredType -and $hasPaperId -and $hasTitle
}

function Test-QuestionHasNonCanonicalPaperTarget {
  param(
    [Parameter(Mandatory = $true)][string]$Content
  )

  foreach ($target in @(Get-MarkdownLinkTargets -Content $Content)) {
    if ((Test-LocalMarkdownFileTarget -Target $target) -and $target -notmatch '^\.\./papers/cards/[a-z0-9][a-z0-9.-]*\.md$') {
      return $true
    }
  }

  return $false
}

function Get-MarkdownLinkTargets {
  param(
    [Parameter(Mandatory = $true)][string]$Content
  )

  $targets = New-Object System.Collections.Generic.List[string]
  $matches = [regex]::Matches($Content, '\[[^\]]+\]\(([^)\s]+)(?:\s+[^)]*)?\)')
  foreach ($match in $matches) {
    $targets.Add($match.Groups[1].Value)
  }

  return $targets
}

function Test-LocalMarkdownFileTarget {
  param(
    [Parameter(Mandatory = $true)][string]$Target
  )

  if ($Target.StartsWith('#')) {
    return $false
  }

  if ($Target -match '^[a-zA-Z]:[\\/]') {
    return $Target -match '(?i)\.md(?:#.*)?$'
  }

  if ($Target -match '^[a-z][a-z0-9+.-]*:') {
    return $false
  }

  return $Target -match '(?i)\.md(?:#.*)?$'
}
$cardsRoot = Join-Path $PSScriptRoot '..\papers\cards'
$notesRoot = Join-Path $PSScriptRoot '..\papers\notes'
$questionsRoot = Join-Path $PSScriptRoot '..\questions'

$cardFiles = Get-MarkdownFiles -Path $cardsRoot -Filter '*.md'
$noteFiles = Get-MarkdownFiles -Path $notesRoot -Filter '*-note.md'
$questionFiles = Get-MarkdownFiles -Path $questionsRoot -Filter '*.md'

$cardsById = @{}
foreach ($cardFile in $cardFiles) {
  $cardsById[[System.IO.Path]::GetFileNameWithoutExtension($cardFile.Name)] = $cardFile
}

$notesById = @{}
foreach ($noteFile in $noteFiles) {
  $noteId = [System.IO.Path]::GetFileNameWithoutExtension($noteFile.Name) -replace '-note$', ''
  $notesById[$noteId] = $noteFile
}

$issues = New-Object System.Collections.Generic.List[string]

foreach ($cardId in @($cardsById.Keys | Sort-Object)) {
  if (-not $notesById.ContainsKey($cardId)) {
    $issues.Add("[ERROR] Missing note for card: $cardId")
  }

  $cardFile = $cardsById[$cardId]
  $cardContent = Get-Content -LiteralPath $cardFile.FullName -Raw
  $cardLinkTargets = @(Get-MarkdownLinkTargets -Content $cardContent)
  if ("../notes/$cardId-note.md" -notin $cardLinkTargets) {
    $issues.Add("[ERROR] Card missing note link: $cardId")
  }

  if (-not (Test-CardFrontmatter -Content $cardContent)) {
    $issues.Add("[ERROR] Card missing required frontmatter: $($cardFile.Name)")
  }
}

foreach ($noteId in @($notesById.Keys | Sort-Object)) {
  if (-not $cardsById.ContainsKey($noteId)) {
    $issues.Add("[ERROR] Missing card for note: $noteId")
  }

  $noteFile = $notesById[$noteId]
  $noteContent = Get-Content -LiteralPath $noteFile.FullName -Raw
  $noteLinkTargets = @(Get-MarkdownLinkTargets -Content $noteContent)
  if ("../cards/$noteId.md" -notin $noteLinkTargets) {
    $issues.Add("[ERROR] Note missing card link: $noteId")
  }
}

foreach ($questionFile in $questionFiles) {
  $questionContent = Get-Content -LiteralPath $questionFile.FullName -Raw
  if (Test-QuestionHasNonCanonicalPaperTarget -Content $questionContent) {
    $issues.Add("[ERROR] Question contains non-canonical paper target: $($questionFile.Name)")
  }
}

if ($issues.Count -gt 0) {
  foreach ($issue in $issues) {
    $issue
  }

  "Vault check failed with $($issues.Count) issue(s)."
  exit 1
}

'Vault check passed.'
exit 0
