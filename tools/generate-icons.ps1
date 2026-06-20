param(
  [Parameter(Mandatory = $true)]
  [string]$SvgPath,

  [Parameter(Mandatory = $true)]
  [string]$OutDir,

  # Where to write favicon.ico and favicon.png (site root is best).
  [Parameter(Mandatory = $false)]
  [string]$FaviconDir = ""
)

$ErrorActionPreference = "Stop"

function Assert-File([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "File not found: $Path"
  }
}

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Get-EdgePath() {
  $candidates = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  $cmd = Get-Command msedge -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  throw "Microsoft Edge (msedge.exe) not found."
}

function Build-IconHtml([string]$SvgContent, [string]$OutHtmlPath) {
@"
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>
      html, body { margin:0; width:100%; height:100%; background:#ffffff; }
      .wrap { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
      .wrap svg { width:100%; height:100%; display:block; }
    </style>
  </head>
  <body>
    <div class="wrap">
      $SvgContent
    </div>
  </body>
</html>
"@ | Set-Content -LiteralPath $OutHtmlPath -Encoding UTF8
}

function Render-Png([string]$EdgeExe, [string]$HtmlPath, [int]$Size, [string]$OutPngPath) {
  $absHtml = [System.IO.Path]::GetFullPath($HtmlPath)
  $url = ("file:///" + ($absHtml -replace "\\", "/"))
  $absOut = [System.IO.Path]::GetFullPath($OutPngPath)
  $outDir = Split-Path -Parent $absOut
  Ensure-Dir $outDir
  $args = @(
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--virtual-time-budget=1500",
    "--force-device-scale-factor=1",
    ("--window-size={0},{0}" -f $Size),
    ("--screenshot={0}" -f $absOut),
    $url
  )
  & $EdgeExe @args | Out-Null
  if (-not (Test-Path -LiteralPath $absOut)) {
    throw "Edge did not produce screenshot: $absOut"
  }
}

Assert-File $SvgPath
Ensure-Dir $OutDir

$edge = Get-EdgePath
$svgRaw = Get-Content -LiteralPath $SvgPath -Raw

# Strip XML declaration if present to avoid HTML parsing oddities.
$svg = ($svgRaw -replace "^\s*<\?xml[^>]*\?>\s*", "").Trim()

$tmpDir = Join-Path $OutDir "_gen"
Ensure-Dir $tmpDir
$htmlPath = Join-Path $tmpDir "icon.html"
Build-IconHtml -SvgContent $svg -OutHtmlPath $htmlPath

function Resize-Png([string]$InPath, [int]$Size, [string]$OutPath) {
  Add-Type -AssemblyName System.Drawing
  $src = [System.Drawing.Bitmap]::FromFile($InPath)
  try {
    $dst = New-Object System.Drawing.Bitmap($Size, $Size)
    try {
      $g = [System.Drawing.Graphics]::FromImage($dst)
      try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.Clear([System.Drawing.Color]::White)
        $g.DrawImage($src, 0, 0, $Size, $Size)
      } finally {
        $g.Dispose()
      }
      $outDir2 = Split-Path -Parent $OutPath
      Ensure-Dir $outDir2
      $dst.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $dst.Dispose()
    }
  } finally {
    $src.Dispose()
  }
}

# Render once at high resolution, then downscale with System.Drawing.
$master512 = Join-Path $tmpDir "master-512.png"
Render-Png -EdgeExe $edge -HtmlPath $htmlPath -Size 512 -OutPngPath $master512

Copy-Item -LiteralPath $master512 -Destination (Join-Path $OutDir "icon-512.png") -Force
Copy-Item -LiteralPath $master512 -Destination (Join-Path $OutDir "maskable-512.png") -Force

Resize-Png -InPath $master512 -Size 192 -OutPath (Join-Path $OutDir "icon-192.png")
Resize-Png -InPath $master512 -Size 192 -OutPath (Join-Path $OutDir "maskable-192.png")
Resize-Png -InPath $master512 -Size 180 -OutPath (Join-Path $OutDir "apple-touch-icon.png")

$faviconPng256 = Join-Path $tmpDir "favicon-256.png"
Resize-Png -InPath $master512 -Size 256 -OutPath $faviconPng256
$favicon32 = Join-Path $tmpDir "favicon-32.png"
Resize-Png -InPath $master512 -Size 32 -OutPath $favicon32

Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile($faviconPng256)
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
try {
  $favDir = $FaviconDir
  if (-not $favDir) { $favDir = (Split-Path -Parent $OutDir) }
  Ensure-Dir $favDir

  $icoOut = Join-Path $favDir "favicon.ico"
  $pngOut = Join-Path $favDir "favicon.png"

  $fs = New-Object System.IO.FileStream($icoOut, [System.IO.FileMode]::Create)
  try { $icon.Save($fs) } finally { $fs.Close() }

  Copy-Item -LiteralPath $favicon32 -Destination $pngOut -Force
} finally {
  $icon.Dispose()
  $bmp.Dispose()
}

Write-Host "Generated icons into: $OutDir"
Write-Host "Generated favicons: $(Join-Path $favDir 'favicon.ico'), $(Join-Path $favDir 'favicon.png')"
