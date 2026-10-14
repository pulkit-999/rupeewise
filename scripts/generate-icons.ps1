if (-not (Test-Path public/icons)) {
    New-Item -ItemType Directory -Force -Path public/icons | Out-Null
}

Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$filePath, [bool]$maskable) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Emerald linear gradient background
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 16, 185, 129) # Emerald 500
    $c2 = [System.Drawing.Color]::FromArgb(255, 4, 120, 87)   # Emerald 700
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)

    if ($maskable) {
        $g.FillRectangle($brush, $rect)
    } else {
        $radius = [int]($size * 0.22)
        $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $radius * 2
        $path2.AddArc(0, 0, $d, $d, 180, 90)
        $path2.AddArc($size - $d, 0, $d, $d, 270, 90)
        $path2.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
        $path2.AddArc(0, $size - $d, $d, $d, 90, 90)
        $path2.CloseFigure()
        $g.FillPath($brush, $path2)
    }

    # Draw Indian Rupee Symbol (₹ - Unicode 0x20B9)
    $fontSize = [int]($size * 0.52)
    $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rupeeChar = [char]0x20B9
    $g.DrawString($rupeeChar, $font, $whiteBrush, [float]($size / 2), [float]($size / 2), $sf)

    $bmp.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $filePath"
}

Generate-Icon 192 "public/icons/icon-192.png" $false
Generate-Icon 512 "public/icons/icon-512.png" $false
Generate-Icon 192 "public/icons/icon-maskable-192.png" $true
Generate-Icon 512 "public/icons/icon-maskable-512.png" $true
Generate-Icon 180 "public/icons/apple-touch-icon.png" $false

