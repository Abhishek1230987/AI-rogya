# PowerShell script to test medical report upload

$apiUrl = "http://localhost:5000/api/medical/upload-report"
$token = "YOUR_JWT_TOKEN_HERE"  # Replace with actual token
$testFilePath = "C:\temp\test-report.txt"

# Create test directory if doesn't exist
if (-not (Test-Path "C:\temp")) {
    New-Item -ItemType Directory -Path "C:\temp" -Force | Out-Null
}

# Create test file
Write-Host "Creating test file at $testFilePath"
@"
Patient ID: TEST001
Date: $(Get-Date)
Symptoms: Testing upload functionality
Blood Pressure: 120/80
Heart Rate: 72 bpm
"@ | Out-File -FilePath $testFilePath -Encoding UTF8

Write-Host "Test file created"
Write-Host ""
Write-Host "Uploading to: $apiUrl"
Write-Host "Token: $token"
Write-Host ""

# Test upload
try {
    $fileStream = [System.IO.File]::OpenRead($testFilePath)
    $boundary = [System.Guid]::NewGuid().ToString()
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    Write-Host "Making request..."
    $response = Invoke-WebRequest `
        -Uri $apiUrl `
        -Method POST `
        -Headers $headers `
        -InFile $testFilePath `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -ErrorAction Stop
    
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Response Body:" $response.Content
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}
finally {
    if ($fileStream) {
        $fileStream.Close()
    }
}

Write-Host ""
Write-Host "Test complete"
