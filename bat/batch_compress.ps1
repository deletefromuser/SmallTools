param (
    # Parameter 1: Threshold for original files (Integer only, e.g., 2GB, 2G, 500MB, 500M)
    [Parameter(Mandatory=$false, Position=0)]
    [string]$MinSize = "2GB",

    # Parameter 2: Target MB per minute of video length (Default: 12MB/min)
    [Parameter(Mandatory=$false, Position=1)]
    [int]$MBPerMinute = 12
)

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# --- 1. Native Integer Size Parsing ---
try {
    $minSizeBytes = Invoke-Expression $MinSize
    if ($minSizeBytes -isnot [long] -and $minSizeBytes -isnot [int]) { throw "Invalid MinSize" }
} catch {
    Write-Error "[Args Error] Cannot parse size format. Use integer syntax like: 2G, 500M, 2GB"
    exit 1
}

# --- 2. Bitrate Calculations ---
$totalKbps = [math]::Round(($MBPerMinute * 1048576 * 8) / 60 / 1000)
$audioKbps = 96
$videoKbps = $totalKbps - $audioKbps

if ($videoKbps -lt 100) {
    Write-Error "[Config Error] The requested MB/min ($MBPerMinute MB) is too low to sustain video and audio."
    exit 1
}

$currentDir = Get-Location
$displayMinSizeGB = [math]::Round($minSizeBytes / 1GB, 2)

Write-Host "Scanning root directory: $currentDir" -ForegroundColor Cyan
Write-Host " -> Processing files larger than: $MinSize ($displayMinSizeGB GB)" -ForegroundColor Gray
Write-Host " -> Target Size Metric: $MBPerMinute MB per minute of video length (Calculated Target: ${videoKbps}k)" -ForegroundColor Yellow
Write-Host " -> Auto-Downscale: Yes (If > 720P -> Downscale to 720P)" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------"

$targetFiles = Get-ChildItem -Path $currentDir -Recurse -File -Include "*.mp4","*.mkv","*.avi","*.ts" | Where-Object {
    $_.Length -gt $minSizeBytes -and $_.Name -notlike "*_x265*"
}

if ($targetFiles.Count -eq 0) {
    Write-Host "No files found matching the filter criteria." -ForegroundColor Green
    exit 0
}

# START TOTAL BATCH TIMER
$totalScriptTimer = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($file in $targetFiles) {
    $OutputFile = Join-Path -Path $file.DirectoryName -ChildPath "$($file.BaseName)_x265$($file.Extension)"
    
    if (Test-Path -Path $OutputFile -PathType Leaf) {
        Write-Host "`n[SKIP] Already processed: $($file.Name)" -ForegroundColor Yellow
        continue
    }

    $currentSizeGB = [math]::Round($file.Length / 1GB, 2)
    Write-Host "`n[Task] Processing: $($file.Name) ($currentSizeGB GB)" -ForegroundColor Cyan
    Write-Host " -> Encoding started at: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray

    # --- 3. Robust Metadata Tracking via ffprobe (JSON Style) ---
    $width = 0
    $height = 0
    $vCodec = "unknown"
    $aCodec = "unknown"
    $sourceBitrateKbps = 0
    $ffprobeError = $null
    try {
        $ffprobeArgs = @("-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height", "-show_entries", "format=bit_rate", "-of", "json", $file.FullName)
        $ffprobeOut = & ffprobe $ffprobeArgs 2>&1
        
        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($ffprobeOut)) {
            $metadata = $ffprobeOut | ConvertFrom-Json
            
            # Isolate primary video and audio streams respectively
            $vStream = $metadata.streams | Where-Object { $_.codec_type -eq "video" } | Select-Object -First 1
            $aStream = $metadata.streams | Where-Object { $_.codec_type -eq "audio" } | Select-Object -First 1
            
            if ($vStream) {
                $vCodec = if ($vStream.codec_name) { $vStream.codec_name } else { "unknown" }
                $width  = if ($vStream.width) { [int]$vStream.width } else { 0 }
                $height = if ($vStream.height) { [int]$vStream.height } else { 0 }
            }
            if ($aStream) {
                $aCodec = if ($aStream.codec_name) { $aStream.codec_name } else { "unknown" }
            }
            
            # FIXED: Handle string-enclosed json number format safely using explicit conversions
            if ($metadata.format -and $metadata.format.bit_rate) {
                $rawBitrate = $metadata.format.bit_rate.ToString().Trim()
                if ($rawBitrate -match '^\d+$') {
                    $sourceBitrateKbps = [math]::Round(([long]$rawBitrate) / 1000)
                }
            }
            
            $resolutionDisplay = if ($width -gt 0 -and $height -gt 0) { "${width}x${height}" } else { "unknown" }
            $bitrateDisplay = if ($sourceBitrateKbps -gt 0) { "${sourceBitrateKbps}k" } else { "unknown" }
            
            Write-Host " -> Source Properties: Resolution [$resolutionDisplay] | Video [$vCodec] | Audio [$aCodec] | Total Bitrate: [$bitrateDisplay]" -ForegroundColor Gray
        } else {
            $ffprobeError = $ffprobeOut
            throw "ffprobe failed"
        }
    } catch {
        Write-Host " -> [Warning] Failed to detect stream metadata automatically." -ForegroundColor Yellow
        if ($ffprobeError) {
            Write-Host "    Reason: $ffprobeError" -ForegroundColor Gray
        }
        Write-Host "    Defaulting to safe mode: Processing without forced downscaling or bitrate capping." -ForegroundColor Gray
    }

    # --- 4. Dynamic Bitrate Capping Logic ---
    $activeVideoKbps = $videoKbps
    if ($sourceBitrateKbps -gt 0) {
        # Calculate original video portion estimate (Total original bitrate minus allocated transcode audio bitrate)
        $sourceVideoKbps = $sourceBitrateKbps - $audioKbps
        if ($sourceVideoKbps -lt 100) { $sourceVideoKbps = 100 } 

        if ($videoKbps -gt $sourceVideoKbps) {
            $activeVideoKbps = $sourceVideoKbps
            Write-Host " -> [Notice] Target bitrate (${videoKbps}k) exceeds original source video bitrate (${sourceVideoKbps}k)." -ForegroundColor Yellow
            Write-Host "    Capping encoding target to match source: ${activeVideoKbps}k" -ForegroundColor Yellow
        }
    }

    $maxKbps = [math]::Round($activeVideoKbps * 1.35)
    $bufKbps = $activeVideoKbps * 2

    # --- 5. Dynamic Scale Arguments Construction ---
    $vfParam = @()
    if ($height -gt 720) {
        Write-Host " -> Detected Resolution: ${height}P (> 720P). Adding downscale filter." -ForegroundColor Magenta
        $vfParam = @("-vf", "scale_cuda=-2:720")
    } elseif ($height -gt 0) {
        Write-Host " -> Detected Resolution: ${height}P (<= 720P). Keeping original resolution." -ForegroundColor Gray
    }

    Write-Host " -> Encoding with NVIDIA GPU acceleration..." -ForegroundColor Green
    
    # START INDIVIDUAL VIDEO TIMER
    $videoTimer = [System.Diagnostics.Stopwatch]::StartNew()

    # Execute Transcode Pipeline using final calculated active bitrates
    ffmpeg -loglevel warning -hwaccel cuda -hwaccel_device 0 -hwaccel_output_format cuda -extra_hw_frames 8 -threads 1 -i $file.FullName $vfParam -c:v hevc_nvenc -b:v "${activeVideoKbps}k" -maxrate "${maxKbps}k" -bufsize "${bufKbps}k" -preset p5 -c:a aac -b:a "${audioKbps}k" -y $OutputFile

    # STOP INDIVIDUAL VIDEO TIMER
    $videoTimer.Stop()
    $elapsedVideo = $videoTimer.Elapsed

    if ($LASTEXITCODE -eq 0) {
        $newSize = (Get-Item $OutputFile).Length
        $savedBytes = $file.Length - $newSize
        $savedMB = [math]::Round($savedBytes / 1MB, 2)
        
        # Format the time nicely into mm:ss or hh:mm:ss
        $timeString = "{0:00}m {1:00}s" -f $elapsedVideo.Minutes, $elapsedVideo.Seconds
        if ($elapsedVideo.Hours -gt 0) { $timeString = "{0}h " -f $elapsedVideo.Hours + $timeString }

        if ($savedBytes -gt 0) {
            Write-Host "[SUCCESS] Done in $timeString! Reduced file size by ${savedMB} MB." -ForegroundColor Green
        } else {
            Write-Host "[NOTICE] Complete in $timeString, but file size didn't shrink." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[FAILED] FFmpeg execution crashed after processing for $($elapsedVideo.Minutes)m $($elapsedVideo.Seconds)s." -ForegroundColor Red
    }
    
    # Display running total of how long the whole script session has been active
    $currentTotalElapsed = $totalScriptTimer.Elapsed

    $hours   = [math]::Truncate($currentTotalElapsed.TotalHours).ToString("00")
    $minutes = $currentTotalElapsed.Minutes.ToString("00")
    $seconds = $currentTotalElapsed.Seconds.ToString("00")

    Write-Host " -> Total session run time so far: ${hours}h ${minutes}m ${seconds}s" -ForegroundColor Gray
    Write-Host "--------------------------------------------------------"
}

# STOP TOTAL BATCH TIMER
$totalScriptTimer.Stop()
$finalTotalElapsed = $totalScriptTimer.Elapsed

$fHours   = [math]::Truncate($finalTotalElapsed.TotalHours).ToString("00")
$fMinutes = $finalTotalElapsed.Minutes.ToString("00")
$fSeconds = $finalTotalElapsed.Seconds.ToString("00")
$finalTimeString = "${fHours}h ${fMinutes}m ${fSeconds}s"

Write-Host "`nAll batch process targets complete!" -ForegroundColor Green
Write-Host "Total Processing Duration: $finalTimeString" -ForegroundColor Cyan