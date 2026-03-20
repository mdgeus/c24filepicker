Add-Type -AssemblyName System.Drawing

$src = Join-Path (Get-Location) "c24 blok logo.png"
$outDir = Join-Path (Get-Location) "build"
$out = Join-Path $outDir "icon.ico"

if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$bmp = New-Object System.Drawing.Bitmap($src)
$resized = New-Object System.Drawing.Bitmap 256, 256
$graphics = [System.Drawing.Graphics]::FromImage($resized)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($bmp, 0, 0, 256, 256)

$iconHandle = $resized.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$fileStream = [System.IO.File]::Open($out, [System.IO.FileMode]::Create)
$icon.Save($fileStream)
$fileStream.Close()

$icon.Dispose()
$graphics.Dispose()
$resized.Dispose()
$bmp.Dispose()

Write-Output $out
