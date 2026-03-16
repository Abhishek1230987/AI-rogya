# Categorize markdown files and move them to appropriate directories
$guidelines = @{
    'guides' = @('QUICK_START', 'SETUP', 'DEPLOYMENT', 'README', 'GUIDE', 'ACTION_CHECKLIST', 'START_HERE', 'READY_TO')
    'features' = @('AUDIO', 'MEDICAL_REPORT', 'SOS_', 'VOICE', 'VIDEO_CALL', 'HOSPITAL', 'CONSULTATION', 'MULTILINGUAL', 'GUEST_CONSULTATION', 'OCR', 'TELEGRAM')
    'architecture' = @('IMPLEMENTATION', 'SYSTEM_', 'ARCHITECTURE', 'STRUCTURE', 'ANALYSIS_', 'API_ENDPOINT')
    'cloud-services' = @('GOOGLE_CLOUD', 'GOOGLE_WARNING', 'TELEGRAM_', 'AWS_')
    'development' = @('CODE_STANDARD', 'TESTING_', 'DEBUGGING', 'CONTRIBUTING', 'DEVELOPMENT')
}

$docsPath = ".\docs"

Get-ChildItem -Path . -Name "*.md" -File | Where-Object { $_ -notmatch '^(PROJECT_|ANALYSIS_|QUICK_ACTION_|MASTER_)' } | ForEach-Object {
    $file = $_
    $moved = $false
    
    foreach ($category in $guidelines.Keys) {
        foreach ($keyword in $guidelines[$category]) {
            if ($file -like "*$keyword*") {
                Move-Item -Path ".\$file" -Destination "$docsPath\$category\" -ErrorAction SilentlyContinue
                Write-Host "✓ Moved $file → docs/$category/"
                $moved = $true
                break
            }
        }
        if ($moved) { break }
    }
    
    if (-not $moved) {
        Move-Item -Path ".\$file" -Destination "$docsPath\guides\" -ErrorAction SilentlyContinue
        Write-Host "→ Moved $file → docs/guides/ (default)"
    }
}

Write-Host "`n✅ Documentation organization complete!"
