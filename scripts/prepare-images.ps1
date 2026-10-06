Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$sourceDir = Join-Path $PSScriptRoot '..\pictures'
$outputDir = Join-Path $PSScriptRoot '..\docs\images'
$contactSheetPath = Join-Path $PSScriptRoot '..\contact-sheet.jpg'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$files = Get-ChildItem -LiteralPath $sourceDir -Filter '*.jpg' | Sort-Object Name
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$quality = [System.Drawing.Imaging.Encoder]::Quality
$encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
$encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new($quality, [long]82)

$tileWidth = 230
$tileHeight = 215
$columns = 5
$rows = [math]::Ceiling($files.Count / $columns)
$sheet = [System.Drawing.Bitmap]::new($tileWidth * $columns, $tileHeight * $rows)
$sheetGraphics = [System.Drawing.Graphics]::FromImage($sheet)
$sheetGraphics.Clear([System.Drawing.Color]::White)
$sheetGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font = [System.Drawing.Font]::new('Arial', 12)

for ($i = 0; $i -lt $files.Count; $i++) {
    $file = $files[$i]
    $source = [System.Drawing.Image]::FromFile($file.FullName)
    try {
        $orientation = 1
        if ($source.PropertyIdList -contains 274) {
            $orientation = [int]$source.GetPropertyItem(274).Value[0]
        }
        switch ($orientation) {
            3 { $source.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
            6 { $source.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
            8 { $source.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
        }

        $scale = [math]::Min(1.0, 1600.0 / [math]::Max($source.Width, $source.Height))
        $width = [int][math]::Round($source.Width * $scale)
        $height = [int][math]::Round($source.Height * $scale)
        $image = [System.Drawing.Bitmap]::new($width, $height)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($image)
            try {
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($source, 0, 0, $width, $height)
            } finally { $graphics.Dispose() }
            $outputPath = Join-Path $outputDir $file.Name
            $image.Save($outputPath, $encoder, $encoderParams)
        } finally { $image.Dispose() }

        $column = $i % $columns
        $row = [math]::Floor($i / $columns)
        $thumbX = $column * $tileWidth + 8
        $thumbY = $row * $tileHeight + 8
        $thumbW = $tileWidth - 16
        $thumbH = $tileHeight - 38
        $thumbScale = [math]::Max($thumbW / $source.Width, $thumbH / $source.Height)
        $scaledW = $source.Width * $thumbScale
        $scaledH = $source.Height * $thumbScale
        $sheetGraphics.SetClip([System.Drawing.Rectangle]::new($thumbX, $thumbY, $thumbW, $thumbH))
        $sheetGraphics.DrawImage($source, [int]($thumbX + ($thumbW - $scaledW) / 2), [int]($thumbY + ($thumbH - $scaledH) / 2), [int]$scaledW, [int]$scaledH)
        $sheetGraphics.ResetClip()
        $sheetGraphics.DrawString($file.Name, $font, [System.Drawing.Brushes]::Black, [float]$thumbX, [float]($thumbY + $thumbH + 4))
        Write-Output "$($file.Name) $($source.Width)x$($source.Height) orientation=$orientation"
    } finally { $source.Dispose() }
}

$sheet.Save($contactSheetPath, $encoder, $encoderParams)
$font.Dispose()
$sheetGraphics.Dispose()
$sheet.Dispose()
$encoderParams.Dispose()
