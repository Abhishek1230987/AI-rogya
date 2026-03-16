# CRITICAL: Drive C is Full (0 GB Free)

## The Problem

- Drive C: 0 GB free
- Drive E (Project): 38 GB free ✓
- Node/npm uses C: for temporary files
- This causes "ENOSPC" errors

## IMMEDIATE FIX NEEDED

### Step 1: Clear Windows Temp Files

**Run as Administrator PowerShell:**

```powershell
# Stop any npm/node processes first
taskkill /F /IM node.exe
taskkill /F /IM npm.cmd

# Clear temp folder
Remove-Item C:\Windows\Temp\* -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item C:\Users\$env:USERNAME\AppData\Local\Temp\* -Recurse -Force -ErrorAction SilentlyContinue

# Run Disk Cleanup
cleanmgr
```

### Step 2: Clear npm Cache

```bash
npm cache clean --force
```

### Step 3: Delete node_modules and Reinstall

```bash
cd e:\E-Consultancy\server
rmdir /s /q node_modules
npm install

cd e:\E-Consultancy\client
rmdir /s /q node_modules
npm install
```

### Step 4: Try Starting Server Again

```bash
cd e:\E-Consultancy\server
npm run dev
```

## Check Disk Space After Cleanup

```powershell
Get-Volume | Select-Object DriveLetter, @{N='FreeGB';E={[math]::Round($_.SizeRemaining/1GB,2)}}
```

Target: C: drive should have **at least 2GB free**

## If Still Full

### Clear Browser Cache

- Chrome: `C:\Users\[User]\AppData\Local\Google\Chrome\User Data\Default\Cache`
- Firefox: `C:\Users\[User]\AppData\Local\Mozilla\Firefox\Profiles\*\cache`

### Delete Old Windows Backups

```powershell
# List recovery space (could be 10+ GB)
Get-Volume -DriveLetter C | Select-Object DriveLetter, SizeRemaining

# Clear Windows Update cache
Remove-Item C:\Windows.old -Recurse -Force
```

### Move npm Cache to E: Drive

```bash
# Set npm cache to E: drive
npm config set cache "e:\.npm-cache"

# Verify
npm config get cache
```

## After Freeing Space

1. **Restart Servers**

   ```bash
   # Terminal 1
   cd e:\E-Consultancy\server
   npm run dev

   # Terminal 2
   cd e:\E-Consultancy\client
   npm run dev
   ```

2. **Test Upload**
   - Go to Medical Reports
   - Upload an image
   - Should work now!

## Prevention

### Configure npm to use less temp space

```bash
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 120000
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
```

### Set Node to use E: for temp files

```powershell
# Create TEMP directory on E: drive
mkdir E:\Temp

# Set environment variables
$env:TEMP = "E:\Temp"
$env:TMP = "E:\Temp"

# Persist for future sessions
[Environment]::SetEnvironmentVariable("TEMP", "E:\Temp", "User")
[Environment]::SetEnvironmentVariable("TMP", "E:\Temp", "User")
```

## Commands to Run NOW

**Copy-paste this entire block in PowerShell (Run as Administrator):**

```powershell
Write-Host "Stopping Node processes..."
taskkill /F /IM node.exe 2>$null
taskkill /F /IM npm.cmd 2>$null
Start-Sleep -Seconds 2

Write-Host "Clearing Windows temp..."
Remove-Item C:\Windows\Temp\* -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Clearing npm cache..."
npm cache clean --force

Write-Host "Check disk space:"
Get-Volume C | Select-Object DriveLetter, @{N='FreeGB';E={[math]::Round($_.SizeRemaining/1GB,2)}}

Write-Host "Done! You need at least 2GB free on C:"
Write-Host "If less than 2GB, run Disk Cleanup manually"
```

## After Cleanup - What to Do

1. You should have **2-5 GB free** on C:
2. Then restart server
3. Then try OCR upload
4. Should work!

---

**Status Check:**

- C: drive 0 GB ← THIS IS THE PROBLEM
- E: drive 38 GB ← Project files here (OK)

**Solution:** Free up 2-5 GB on C: drive, then restart

Let me know once you've cleared space and I'll help you test the upload!
