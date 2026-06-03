param(
  [string]$LogoPath = ""
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $LogoPath) {
  $LogoPath = Join-Path $ProjectRoot "public\fbply-logo.png"
}

$LogoPath = Resolve-Path $LogoPath
$PublicRoot = Join-Path $ProjectRoot "public"
$ResourcesRoot = Join-Path $ProjectRoot "resources"
$AndroidResRoot = Join-Path $ProjectRoot "android\app\src\main\res"
$Navy = [System.Drawing.ColorTranslator]::FromHtml("#0B1020")
$CardColor = [System.Drawing.ColorTranslator]::FromHtml("#F8FAFC")
$Blue = [System.Drawing.ColorTranslator]::FromHtml("#1D4ED8")
$Text = [System.Drawing.ColorTranslator]::FromHtml("#F8FAFC")

function New-Bitmap([int]$Width, [int]$Height, [System.Drawing.Color]$Fill) {
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
  $bitmap.SetResolution(144, 144)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear($Fill)
  $graphics.Dispose()
  return $bitmap
}

function New-TransparentBitmap([int]$Width, [int]$Height) {
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bitmap.SetResolution(144, 144)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.Dispose()
  return $bitmap
}

function New-RoundedPath([System.Drawing.RectangleF]$Rect, [float]$Radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($Rect.X, $Rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rect.X, $Rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-FitImage($Graphics, $Image, [System.Drawing.RectangleF]$Target) {
  $scale = [Math]::Min($Target.Width / $Image.Width, $Target.Height / $Image.Height)
  $width = $Image.Width * $scale
  $height = $Image.Height * $scale
  $x = $Target.X + (($Target.Width - $width) / 2)
  $y = $Target.Y + (($Target.Height - $height) / 2)
  $Graphics.DrawImage($Image, [System.Drawing.RectangleF]::new($x, $y, $width, $height))
}

function Save-Png($Image, [string]$Path) {
  $directory = Split-Path $Path
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }
  $Image.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Copy-Crop($Image, [System.Drawing.Rectangle]$Rect) {
  $bitmap = New-TransparentBitmap $Rect.Width $Rect.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($Image, [System.Drawing.Rectangle]::new(0, 0, $Rect.Width, $Rect.Height), $Rect, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  return $bitmap
}

function Remove-WhiteBackground($Image) {
  $bitmap = New-TransparentBitmap $Image.Width $Image.Height
  for ($x = 0; $x -lt $Image.Width; $x++) {
    for ($y = 0; $y -lt $Image.Height; $y++) {
      $pixel = $Image.GetPixel($x, $y)
      if ($pixel.R -gt 244 -and $pixel.G -gt 244 -and $pixel.B -gt 244) {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
      } else {
        $bitmap.SetPixel($x, $y, $pixel)
      }
    }
  }
  return $bitmap
}

function Get-ContentBounds($Image, [int]$Padding) {
  $minX = $Image.Width
  $minY = $Image.Height
  $maxX = 0
  $maxY = 0

  for ($x = 0; $x -lt $Image.Width; $x++) {
    for ($y = 0; $y -lt $Image.Height; $y++) {
      $pixel = $Image.GetPixel($x, $y)
      if (-not ($pixel.R -gt 246 -and $pixel.G -gt 246 -and $pixel.B -gt 246)) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  $minX = [Math]::Max(0, $minX - $Padding)
  $minY = [Math]::Max(0, $minY - $Padding)
  $maxX = [Math]::Min($Image.Width - 1, $maxX + $Padding)
  $maxY = [Math]::Min($Image.Height - 1, $maxY + $Padding)
  return [System.Drawing.Rectangle]::new($minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1)
}

function New-LauncherIcon([int]$Size, $Mark, [bool]$TransparentBackground) {
  if ($TransparentBackground) {
    $bitmap = New-TransparentBitmap $Size $Size
  } else {
    $bitmap = New-Bitmap $Size $Size $Navy
  }

  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $cardSize = $Size * 0.74
  $card = [System.Drawing.RectangleF]::new(($Size - $cardSize) / 2, ($Size - $cardSize) / 2, $cardSize, $cardSize)
  $path = New-RoundedPath $card ($Size * 0.16)
  $brush = New-Object System.Drawing.SolidBrush($CardColor)
  $graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()

  $markRect = [System.Drawing.RectangleF]::new($Size * 0.20, $Size * 0.22, $Size * 0.60, $Size * 0.56)
  Draw-FitImage $graphics $Mark $markRect
  $graphics.Dispose()
  return $bitmap
}

function New-SplashImage([int]$Width, [int]$Height, $Logo) {
  $bitmap = New-Bitmap $Width $Height $Navy
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $cardSize = [Math]::Min($Width, $Height) * 0.54
  $card = [System.Drawing.RectangleF]::new(($Width - $cardSize) / 2, ($Height - $cardSize) / 2, $cardSize, $cardSize)
  $path = New-RoundedPath $card ([Math]::Max(28, $cardSize * 0.08))
  $brush = New-Object System.Drawing.SolidBrush($CardColor)
  $graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()

  Draw-FitImage $graphics $Logo ([System.Drawing.RectangleF]::new($card.X + ($cardSize * 0.08), $card.Y + ($cardSize * 0.08), $cardSize * 0.84, $cardSize * 0.84))
  $graphics.Dispose()
  return $bitmap
}

function New-FeatureGraphic($Mark) {
  $bitmap = New-Bitmap 1024 500 $Navy
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $icon = New-LauncherIcon 260 $Mark $false
  $graphics.DrawImage($icon, [System.Drawing.RectangleF]::new(94, 120, 260, 260))
  $icon.Dispose()

  $titleFont = New-Object System.Drawing.Font("Segoe UI", 62, [System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font("Segoe UI", 23, [System.Drawing.FontStyle]::Regular)
  $titleBrush = New-Object System.Drawing.SolidBrush($Text)
  $bodyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#B7C4D8"))
  $accentPen = New-Object System.Drawing.Pen($Blue, 6)

  $graphics.DrawString("FBPly", $titleFont, $titleBrush, 410, 140)
  $graphics.DrawString("Calm purchase planning", $bodyFont, $bodyBrush, 414, 262)
  $graphics.DrawLine($accentPen, 414, 324, 690, 324)

  $accentPen.Dispose()
  $bodyBrush.Dispose()
  $titleBrush.Dispose()
  $bodyFont.Dispose()
  $titleFont.Dispose()
  $graphics.Dispose()
  return $bitmap
}

function New-WebMark([int]$Size, $Mark, [bool]$TransparentBackground) {
  if ($TransparentBackground) {
    $bitmap = New-TransparentBitmap $Size $Size
  } else {
    $bitmap = New-Bitmap $Size $Size ([System.Drawing.Color]::White)
  }

  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $padding = $Size * 0.06
  Draw-FitImage $graphics $Mark ([System.Drawing.RectangleF]::new($padding, $padding, $Size - ($padding * 2), $Size - ($padding * 2)))
  $graphics.Dispose()
  return $bitmap
}

$logo = [System.Drawing.Image]::FromFile($LogoPath)
$logoContent = Copy-Crop $logo (Get-ContentBounds $logo 44)
$mark = Copy-Crop $logo (Get-ContentBounds $logo 24)
$markTransparent = Remove-WhiteBackground $mark

$webMark = New-WebMark 512 $markTransparent $true
Save-Png $webMark (Join-Path $PublicRoot "fbply-f-mark.png")

$favicon = New-WebMark 96 $markTransparent $false
Save-Png $favicon (Join-Path $PublicRoot "favicon.png")

$sourceIcon = New-LauncherIcon 1024 $markTransparent $false
Save-Png $sourceIcon (Join-Path $ResourcesRoot "android\icon.png")

$sourceSplash = New-SplashImage 2732 2732 $logoContent
Save-Png $sourceSplash (Join-Path $ResourcesRoot "android\splash.png")

$storeIcon = New-LauncherIcon 512 $markTransparent $false
Save-Png $storeIcon (Join-Path $ResourcesRoot "play-store\icon-512.png")

$featureGraphic = New-FeatureGraphic $markTransparent
Save-Png $featureGraphic (Join-Path $ResourcesRoot "play-store\feature-graphic.png")

$legacySizes = @{
  "mipmap-mdpi" = 48
  "mipmap-hdpi" = 72
  "mipmap-xhdpi" = 96
  "mipmap-xxhdpi" = 144
  "mipmap-xxxhdpi" = 192
}

$foregroundSizes = @{
  "mipmap-mdpi" = 108
  "mipmap-hdpi" = 162
  "mipmap-xhdpi" = 216
  "mipmap-xxhdpi" = 324
  "mipmap-xxxhdpi" = 432
}

foreach ($entry in $legacySizes.GetEnumerator()) {
  $icon = New-LauncherIcon $entry.Value $markTransparent $false
  Save-Png $icon (Join-Path $AndroidResRoot "$($entry.Key)\ic_launcher.png")
  Save-Png $icon (Join-Path $AndroidResRoot "$($entry.Key)\ic_launcher_round.png")
  $icon.Dispose()
}

foreach ($entry in $foregroundSizes.GetEnumerator()) {
  $foreground = New-LauncherIcon $entry.Value $markTransparent $true
  Save-Png $foreground (Join-Path $AndroidResRoot "$($entry.Key)\ic_launcher_foreground.png")
  $foreground.Dispose()
}

$splashSizes = @{
  "drawable" = @(1024, 1024)
  "drawable-port-mdpi" = @(320, 480)
  "drawable-port-hdpi" = @(480, 720)
  "drawable-port-xhdpi" = @(640, 960)
  "drawable-port-xxhdpi" = @(960, 1440)
  "drawable-port-xxxhdpi" = @(1280, 1920)
  "drawable-land-mdpi" = @(480, 320)
  "drawable-land-hdpi" = @(720, 480)
  "drawable-land-xhdpi" = @(960, 640)
  "drawable-land-xxhdpi" = @(1440, 960)
  "drawable-land-xxxhdpi" = @(1920, 1280)
}

foreach ($entry in $splashSizes.GetEnumerator()) {
  $splash = New-SplashImage $entry.Value[0] $entry.Value[1] $logoContent
  Save-Png $splash (Join-Path $AndroidResRoot "$($entry.Key)\splash.png")
  $splash.Dispose()
}

$featureGraphic.Dispose()
$storeIcon.Dispose()
$sourceSplash.Dispose()
$sourceIcon.Dispose()
$favicon.Dispose()
$webMark.Dispose()
$markTransparent.Dispose()
$mark.Dispose()
$logoContent.Dispose()
$logo.Dispose()

Write-Host "FBPly Android assets generated."
