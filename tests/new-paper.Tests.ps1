Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceScriptPath = Join-Path $repoRoot 'scripts\new-paper.ps1'
$sourceCardTemplatePath = Join-Path $repoRoot 'templates\paper-card.md'
$sourceNoteTemplatePath = Join-Path $repoRoot 'templates\paper-note.md'

function New-IsolatedVault {
  $vaultRoot = Join-Path $TestDrive ([guid]::NewGuid().ToString())
  $scriptsRoot = Join-Path $vaultRoot 'scripts'
  $cardsRoot = Join-Path $vaultRoot 'papers\cards'
  $notesRoot = Join-Path $vaultRoot 'papers\notes'
  $templatesRoot = Join-Path $vaultRoot 'templates'

  New-Item -ItemType Directory -Path $scriptsRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $cardsRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $notesRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $templatesRoot -Force | Out-Null

  $scriptPath = Join-Path $scriptsRoot 'new-paper.ps1'
  if (Test-Path $sourceScriptPath) {
    Copy-Item -Path $sourceScriptPath -Destination $scriptPath -Force
  }

  $cardTemplatePath = Join-Path $templatesRoot 'paper-card.md'
  if (Test-Path $sourceCardTemplatePath) {
    Copy-Item -Path $sourceCardTemplatePath -Destination $cardTemplatePath -Force
  }

  $noteTemplatePath = Join-Path $templatesRoot 'paper-note.md'
  if (Test-Path $sourceNoteTemplatePath) {
    Copy-Item -Path $sourceNoteTemplatePath -Destination $noteTemplatePath -Force
  }

  return @{
    VaultRoot = $vaultRoot
    ScriptPath = $scriptPath
    CardsRoot = $cardsRoot
    NotesRoot = $notesRoot
    CardTemplatePath = $cardTemplatePath
    NoteTemplatePath = $noteTemplatePath
  }
}

function Test-HasUtf8Bom {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($bytes.Length -lt 3) {
    return $false
  }

  return ($bytes[0] -eq 0xEF) -and ($bytes[1] -eq 0xBB) -and ($bytes[2] -eq 0xBF)
}

Describe 'scripts/new-paper.ps1' {
  It 'renders the templates into both files with normalized lowercase paper_id and mutual links' {
    Test-Path $sourceScriptPath | Should Be $true
    Test-Path $sourceCardTemplatePath | Should Be $true
    Test-Path $sourceNoteTemplatePath | Should Be $true

    $vault = New-IsolatedVault
    $cardTemplateContent = Get-Content $vault.CardTemplatePath -Raw
    $noteTemplateContent = Get-Content $vault.NoteTemplatePath -Raw
    Set-Content -Path $vault.CardTemplatePath -Value ($cardTemplateContent.TrimEnd() + "`r`n`r`n<!-- card-template-sentinel -->`r`n") -Encoding Ascii
    Set-Content -Path $vault.NoteTemplatePath -Value ($noteTemplateContent.TrimEnd() + "`r`n`r`n<!-- note-template-sentinel -->`r`n") -Encoding Ascii

    & $vault.ScriptPath `
      -PaperId ' PI07 ' `
      -Title 'PI0.7' `
      -AlphaXiv 'https://www.alphaxiv.org/overview/xxxx' `
      -Year '2026' `
      -Pdf 'https://example.com/pi07.pdf' `
      -Code 'https://github.com/example/pi07'

    $cardPath = Join-Path $vault.CardsRoot 'pi07.md'
    $notePath = Join-Path $vault.NotesRoot 'pi07-note.md'
    $today = Get-Date -Format 'yyyy-MM-dd'

    Test-Path $cardPath | Should Be $true
    Test-Path $notePath | Should Be $true

    $cardContent = Get-Content $cardPath -Raw
    $noteContent = Get-Content $notePath -Raw

    $cardContent | Should Match '<!-- card-template-sentinel -->'
    $noteContent | Should Match '<!-- note-template-sentinel -->'
    $cardContent | Should Match 'paper_id: pi07'
    $cardContent | Should Match 'title: PI0\.7'
    $cardContent | Should Match 'year: 2026'
    $cardContent | Should Match 'alphaxiv: https://www\.alphaxiv\.org/overview/xxxx'
    $cardContent | Should Match 'pdf: https://example\.com/pi07\.pdf'
    $cardContent | Should Match 'code: https://github\.com/example/pi07'
    $cardContent | Should Match "created: $today"
    $cardContent | Should Match '\[PI0\.7 note\]\(\.\./notes/pi07-note\.md\)'
    $cardContent | Should Match '## Core Insight'
    $cardContent | Should Match '## References'
    $cardContent | Should Match '- AlphaXiv: https://www\.alphaxiv\.org/overview/xxxx'
    $cardContent | Should Match '- PDF: https://example\.com/pi07\.pdf'
    $cardContent | Should Match '- Code: https://github\.com/example/pi07'
    $cardContent | Should Not Match '\{\{'

    $noteContent | Should Match 'paper_id: pi07'
    $noteContent | Should Match "created: $today"
    $noteContent | Should Match '# PI0\.7 Note'
    $noteContent | Should Match '\[PI0\.7 card\]\(\.\./cards/pi07\.md\)'
    $noteContent | Should Match '## Reading Notes'
    $noteContent | Should Match '## Follow-up'
    $noteContent | Should Not Match '\{\{'
  }

  It 'fails when the paper already exists' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    $existingCardPath = Join-Path $vault.CardsRoot 'pi07.md'
    New-Item -ItemType File -Path $existingCardPath -Force | Out-Null

    {
      & $vault.ScriptPath `
        -PaperId 'PI07' `
        -Title 'PI0.7' `
        -AlphaXiv 'https://www.alphaxiv.org/overview/xxxx' `
        -ErrorAction Stop
    } | Should Throw 'Paper already exists: pi07'
  }

  It 'fails validation for invalid paper ids' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault

    {
      & $vault.ScriptPath `
        -PaperId 'bad id' `
        -Title 'PI0.7' `
        -AlphaXiv 'https://www.alphaxiv.org/overview/xxxx' `
        -ErrorAction Stop
    } | Should Throw 'PaperId must match ^[a-z0-9][a-z0-9.-]*$'
  }

  It 'fails validation for whitespace-only titles' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault

    {
      & $vault.ScriptPath `
        -PaperId 'pi07' `
        -Title '   ' `
        -AlphaXiv 'https://www.alphaxiv.org/overview/xxxx' `
        -ErrorAction Stop
    } | Should Throw 'Title must not be empty or whitespace'
  }

  It 'fails validation for whitespace-only AlphaXiv values' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault

    {
      & $vault.ScriptPath `
        -PaperId 'pi07' `
        -Title 'PI0.7' `
        -AlphaXiv '   ' `
        -ErrorAction Stop
    } | Should Throw 'AlphaXiv must not be empty or whitespace'
  }

  It 'writes generated markdown as utf-8 without a bom' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault

    & $vault.ScriptPath `
      -PaperId 'pi07' `
      -Title 'PI0.7' `
      -AlphaXiv 'https://www.alphaxiv.org/overview/xxxx'

    $cardPath = Join-Path $vault.CardsRoot 'pi07.md'
    $notePath = Join-Path $vault.NotesRoot 'pi07-note.md'

    (Test-HasUtf8Bom -Path $cardPath) | Should Be $false
    (Test-HasUtf8Bom -Path $notePath) | Should Be $false
  }
}
