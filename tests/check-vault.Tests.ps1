Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceScriptPath = Join-Path $repoRoot 'scripts\check-vault.ps1'

function New-IsolatedVault {
  $vaultRoot = Join-Path $TestDrive ([guid]::NewGuid().ToString())
  $scriptsRoot = Join-Path $vaultRoot 'scripts'
  $cardsRoot = Join-Path $vaultRoot 'papers\cards'
  $notesRoot = Join-Path $vaultRoot 'papers\notes'
  $questionsRoot = Join-Path $vaultRoot 'questions'

  New-Item -ItemType Directory -Path $scriptsRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $cardsRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $notesRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $questionsRoot -Force | Out-Null

  $scriptPath = Join-Path $scriptsRoot 'check-vault.ps1'
  if (Test-Path $sourceScriptPath) {
    Copy-Item -Path $sourceScriptPath -Destination $scriptPath -Force
  }

  return @{
    VaultRoot = $vaultRoot
    ScriptPath = $scriptPath
    CardsRoot = $cardsRoot
    NotesRoot = $notesRoot
    QuestionsRoot = $questionsRoot
  }
}

function Set-VaultFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  [System.IO.File]::WriteAllText($Path, $Content, (New-Object System.Text.UTF8Encoding($false)))
}

function New-CanonicalCardContent {
  param(
    [Parameter(Mandatory = $true)][string]$PaperId,
    [Parameter(Mandatory = $true)][string]$Title
  )

  return @"
---
type: paper-card
paper_id: $PaperId
title: $Title
---

# $Title

## Navigation
- Paper note: [$Title note](../notes/$PaperId-note.md)
"@
}

function New-CanonicalNoteContent {
  param(
    [Parameter(Mandatory = $true)][string]$PaperId,
    [Parameter(Mandatory = $true)][string]$Title
  )

  return @"
---
type: paper-note
paper_id: $PaperId
---

# $Title Note

## Navigation
- Paper card: [$Title card](../cards/$PaperId.md)
"@
}

function Invoke-CheckVault {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Vault
  )

  $powershellPath = Join-Path $PSHOME 'powershell.exe'
  $escapedVaultRoot = $Vault.VaultRoot.Replace("'", "''")
  $command = "Set-Location -LiteralPath '$escapedVaultRoot'; ./scripts/check-vault.ps1"
  $output = & $powershellPath -NoProfile -ExecutionPolicy Bypass -Command $command 2>&1

  return @{
    ExitCode = $LASTEXITCODE
    Output = @($output)
  }
}

Describe 'scripts/check-vault.ps1' {
  It 'passes for a canonical isolated vault' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content (New-CanonicalCardContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content (New-CanonicalNoteContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.QuestionsRoot 'tracking.md') -Content @"
# Tracking

## Related Papers
- [PI0.7](../papers/cards/pi07.md)
"@

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 0
    ($result.Output -join "`n") | Should Match '^Vault check passed\.$'
  }

  It 'detects a missing note for a card' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content (New-CanonicalCardContent -PaperId 'pi07' -Title 'PI0.7')

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Missing note for card: pi07'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 1 issue\(s\)\.'
  }

  It 'detects missing mutual links between a card and its note' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content @"
---
type: paper-card
paper_id: pi07
title: PI0.7
---

# PI0.7
"@
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content @"
---
type: paper-note
paper_id: pi07
---

# PI0.7 Note
"@

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Card missing note link: pi07'
    ($result.Output -join "`n") | Should Match '\[ERROR\] Note missing card link: pi07'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 2 issue\(s\)\.'
  }

  It 'rejects plain-text target mentions that are not markdown links' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content @"
---
type: paper-card
paper_id: pi07
title: PI0.7
---

# PI0.7

Reference path: ../notes/pi07-note.md
"@
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content @"
---
type: paper-note
paper_id: pi07
---

# PI0.7 Note

Reference path: ../cards/pi07.md
"@

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Card missing note link: pi07'
    ($result.Output -join "`n") | Should Match '\[ERROR\] Note missing card link: pi07'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 2 issue\(s\)\.'
  }

  It 'detects a missing card for a note' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content (New-CanonicalNoteContent -PaperId 'pi07' -Title 'PI0.7')

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Missing card for note: pi07'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 1 issue\(s\)\.'
  }

  It 'detects missing required card frontmatter' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content @"
---
type: paper-card
paper_id: pi07
---

# PI0.7

## Navigation
- Paper note: [PI0.7 note](../notes/pi07-note.md)
"@
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content (New-CanonicalNoteContent -PaperId 'pi07' -Title 'PI0.7')

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Card missing required frontmatter: pi07\.md'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 1 issue\(s\)\.'
  }

  It 'detects non-canonical question targets' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content (New-CanonicalCardContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content (New-CanonicalNoteContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.QuestionsRoot 'tracking.md') -Content @"
# Tracking

## Related Papers
- [PI0.7 note](../papers/notes/pi07-note.md)
"@

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Question contains non-canonical paper target: tracking\.md'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 1 issue\(s\)\.'
  }

  It 'detects question links to cards outside the canonical papers path' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content (New-CanonicalCardContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content (New-CanonicalNoteContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.QuestionsRoot 'tracking.md') -Content @"
# Tracking

## Related Papers
- [PI0.7](../cards/pi07.md)
"@

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Question contains non-canonical paper target: tracking\.md'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 1 issue\(s\)\.'
  }

  It 'detects question links to notes outside the canonical papers path' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content (New-CanonicalCardContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content (New-CanonicalNoteContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.QuestionsRoot 'tracking.md') -Content @"
# Tracking

## Related Papers
- [PI0.7 note](../notes/pi07-note.md)
"@

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Question contains non-canonical paper target: tracking\.md'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 1 issue\(s\)\.'
  }

  It 'detects question links to non-canonical markdown targets with fragments' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content (New-CanonicalCardContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content (New-CanonicalNoteContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.QuestionsRoot 'tracking.md') -Content @"
# Tracking

## Related Papers
- [PI0.7 note section](../notes/pi07-note.md#section)
"@

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Question contains non-canonical paper target: tracking\.md'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 1 issue\(s\)\.'
  }

  It 'detects question links to Windows absolute local markdown targets' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content (New-CanonicalCardContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content (New-CanonicalNoteContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.QuestionsRoot 'tracking.md') -Content @"
# Tracking

## Related Papers
- [PI0.7 external copy](C:\temp\foo.md)
"@

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Question contains non-canonical paper target: tracking\.md'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 1 issue\(s\)\.'
  }

  It 'detects question links to canonical paper cards with fragments' {
    Test-Path $sourceScriptPath | Should Be $true

    $vault = New-IsolatedVault
    Set-VaultFile -Path (Join-Path $vault.CardsRoot 'pi07.md') -Content (New-CanonicalCardContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.NotesRoot 'pi07-note.md') -Content (New-CanonicalNoteContent -PaperId 'pi07' -Title 'PI0.7')
    Set-VaultFile -Path (Join-Path $vault.QuestionsRoot 'tracking.md') -Content @"
# Tracking

## Related Papers
- [PI0.7 section](../papers/cards/pi07.md#section)
"@

    $result = Invoke-CheckVault -Vault $vault

    $result.ExitCode | Should Be 1
    ($result.Output -join "`n") | Should Match '\[ERROR\] Question contains non-canonical paper target: tracking\.md'
    ($result.Output -join "`n") | Should Match 'Vault check failed with 1 issue\(s\)\.'
  }
}
