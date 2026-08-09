$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputPath = Join-Path $root 'risk-exploration-user-guide-draft.pptx'
$contentPath = Join-Path $PSScriptRoot 'risk-exploration-user-guide-content.json'
$content = [System.IO.File]::ReadAllText($contentPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json

function Rgb([int]$r, [int]$g, [int]$b) { return $r + (256 * $g) + (65536 * $b) }
$navy = Rgb 0 32 91; $blue = Rgb 40 105 230; $paleBlue = Rgb 237 245 255; $orange = Rgb 255 158 27
$ink = Rgb 19 35 61; $muted = Rgb 91 111 140; $line = Rgb 214 225 240; $white = Rgb 255 255 255
$green = Rgb 20 142 104; $paleGreen = Rgb 233 249 243; $paleOrange = Rgb 255 247 232; $red = Rgb 196 57 63; $paleRed = Rgb 255 240 241

function AddText($slide, [string]$text, [double]$x, [double]$y, [double]$w, [double]$h, [double]$size = 16, [int]$color = $ink, [bool]$bold = $false, [string]$align = 'left') {
  $shape = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $frame = $shape.TextFrame; $frame.MarginLeft = 0; $frame.MarginRight = 0; $frame.MarginTop = 0; $frame.MarginBottom = 0; $frame.WordWrap = -1; $frame.AutoSize = 0
  $frame.TextRange.Text = $text
  $font = $frame.TextRange.Font; $font.Name = 'Malgun Gothic'; $font.NameFarEast = 'Malgun Gothic'; $font.Size = $size; $font.Bold = $bold; $font.Color.RGB = $color
  if ($align -eq 'center') { $frame.TextRange.ParagraphFormat.Alignment = 2 } elseif ($align -eq 'right') { $frame.TextRange.ParagraphFormat.Alignment = 3 }
  $shape
}

function AddBox($slide, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fill, [int]$border = $line) {
  $shape = $slide.Shapes.AddShape(5, $x, $y, $w, $h); $shape.Fill.Solid(); $shape.Fill.ForeColor.RGB = $fill; $shape.Line.ForeColor.RGB = $border; $shape.Line.Weight = 1; $shape
}

function AddLine($slide, [double]$x1, [double]$y1, [double]$x2, [double]$y2, [int]$color = $line, [double]$weight = 1.2) {
  $shape = $slide.Shapes.AddLine($x1, $y1, $x2, $y2); $shape.Line.ForeColor.RGB = $color; $shape.Line.Weight = $weight; $shape
}

function AddPill($slide, [string]$text, [double]$x, [double]$y, [double]$w, [int]$fill = $paleBlue, [int]$color = $blue) {
  AddBox $slide $x $y $w 24 $fill $fill | Out-Null; AddText $slide $text ($x + 8) ($y + 5) ($w - 16) 14 10 $color $true | Out-Null
}

function AddHeader($slide, [string]$title, [int]$number) {
  AddText $slide ('0' + $number.ToString()) 42 28 42 24 13 $blue $true | Out-Null
  AddText $slide 'RISK EXPLORATION' 92 31 300 18 9 $blue $true | Out-Null
  AddText $slide $title 42 63 840 38 26 $ink $true | Out-Null
  AddLine $slide 42 112 918 112 $line 1 | Out-Null
}

function AddFooter($slide, [int]$number) {
  AddLine $slide 42 507 918 507 $line 1 | Out-Null
  AddText $slide 'HI RISK STUDIO - RISK EXPLORATION USER GUIDE' 42 518 500 14 9 $muted $false | Out-Null
  AddText $slide ($number.ToString() + ' / 12') 860 518 58 14 9 $muted $false 'right' | Out-Null
}

function NewSlide($presentation) {
  $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, 12); $slide.FollowMasterBackground = $false; $slide.Background.Fill.Solid(); $slide.Background.Fill.ForeColor.RGB = $white; $slide
}

function AddCard($slide, $card, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fill = $white, [int]$accent = $blue) {
  AddBox $slide $x $y $w $h $fill $line | Out-Null; AddBox $slide $x $y 5 $h $accent $accent | Out-Null
  AddText $slide $card.title ($x + 18) ($y + 16) ($w - 34) 25 16 $ink $true | Out-Null
  AddText $slide $card.body ($x + 18) ($y + 49) ($w - 34) ($h - 60) 12 $muted $false | Out-Null
}

$ppt = $null; $presentation = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application; $ppt.Visible = -1; $presentation = $ppt.Presentations.Add(); $presentation.PageSetup.SlideWidth = 960; $presentation.PageSetup.SlideHeight = 540
  $number = 0
  foreach ($item in $content) {
    $number++; $s = NewSlide $presentation
    if ($item.type -eq 'cover') {
      AddBox $s 0 0 960 540 $navy $navy | Out-Null; AddBox $s 42 48 8 78 $orange $orange | Out-Null
      AddText $s 'HI RISK STUDIO' 72 52 300 22 13 $orange $true | Out-Null; AddText $s $item.title 72 96 650 105 40 $white $true | Out-Null
      AddText $s $item.subtitle 74 225 570 58 18 (Rgb 213 226 247) $false | Out-Null
      AddBox $s 72 337 240 68 (Rgb 19 55 112) (Rgb 68 104 164) | Out-Null; AddText $s 'AUDIENCE' 90 353 75 16 10 $orange $true | Out-Null; AddText $s 'NON-TECH USERS' 90 377 190 18 13 $white $true | Out-Null
      AddBox $s 330 337 240 68 (Rgb 19 55 112) (Rgb 68 104 164) | Out-Null; AddText $s 'READ TIME' 348 353 75 16 10 $orange $true | Out-Null; AddText $s 'ABOUT 10 MIN' 348 377 190 18 13 $white $true | Out-Null
      AddText $s $item.note 72 475 500 18 10 (Rgb 173 194 222) $false | Out-Null; continue
    }
    AddHeader $s $item.title $number
    if ($item.lead) { AddText $s $item.lead 42 132 850 32 16 $ink $true | Out-Null }
    if ($item.type -eq 'cards3') {
      $x = 42; $fills = @($paleBlue, $paleGreen, $paleOrange); $accents = @($blue, $green, $orange)
      foreach ($card in $item.cards) { AddCard $s $card $x 188 270 180 $fills[$item.cards.IndexOf($card)] $accents[$item.cards.IndexOf($card)]; $x += 303 }
      if ($item.bottom) { AddText $s $item.bottom 42 414 850 28 14 $red $true | Out-Null }
    } elseif ($item.type -eq 'cards4') {
      $x = 42; $y = 150; $i = 0; $fills = @($paleBlue, $paleOrange, $paleGreen, $paleRed); $accents = @($blue, $orange, $green, $red)
      foreach ($card in $item.cards) { AddCard $s $card $x $y 202 160 $fills[$i] $accents[$i]; $i++; if (($i % 4) -eq 0) { $x = 42; $y += 180 } else { $x += 220 } }
      if ($item.bottom) { AddText $s $item.bottom 42 438 850 24 13 $ink $true | Out-Null }
    } elseif ($item.type -eq 'map') {
      $y = 145; $i = 0; foreach ($part in $item.parts) { $w = if ($i -eq 1) { 390 } else { 250 }; $x = if ($i -eq 0) { 42 } elseif ($i -eq 1) { 290 } else { 680 }; AddCard $s $part $x $y $w 245 @($paleBlue, $white, $paleGreen)[$i] @($blue, $orange, $green)[$i]; $i++ }
    } elseif ($item.type -eq 'steps') {
      $x = 42; $i = 0; foreach ($step in $item.steps) { AddBox $s $x 175 160 192 $white $line | Out-Null; AddPill $s ($i + 1).ToString('00') ($x + 18) 194 42 $paleBlue $blue; AddText $s $step.title ($x + 18) 245 124 22 15 $ink $true | Out-Null; AddText $s $step.body ($x + 18) 282 124 56 11 $muted $false | Out-Null; if ($i -lt 4) { AddText $s ([char]0x2192) ($x + 164) 250 20 25 18 $orange $true 'center' | Out-Null }; $x += 180; $i++ }
      if ($item.bottom) { AddBox $s 42 410 876 54 $paleOrange $line | Out-Null; AddText $s $item.bottom 66 427 820 20 12 $ink $true | Out-Null }
    } elseif ($item.type -eq 'glossary') {
      $x = 42; $y = 145; $i = 0; foreach ($term in $item.terms) { AddBox $s $x $y 270 92 $white $line | Out-Null; AddText $s $term.title ($x + 16) ($y + 15) 230 18 14 $blue $true | Out-Null; AddText $s $term.body ($x + 16) ($y + 44) 232 34 11 $muted $false | Out-Null; $i++; if (($i % 3) -eq 0) { $x = 42; $y += 112 } else { $x += 292 } }; AddText $s $item.bottom 42 405 850 38 14 $ink $true | Out-Null
    } elseif ($item.type -eq 'legal') {
      AddCard $s ([pscustomobject]@{title=$item.leftTitle; body=$item.left}) 42 145 410 280 $paleBlue $blue; AddCard $s ([pscustomobject]@{title=$item.rightTitle; body=$item.right}) 478 145 440 280 $paleGreen $green; AddText $s $item.bottom 42 445 850 22 13 $red $true | Out-Null
    } elseif ($item.type -eq 'caution') {
      $x = 42; $i = 0; foreach ($card in $item.cards) { AddCard $s $card $x 155 270 175 @($paleGreen, $paleRed, $paleOrange)[$i] @($green, $red, $orange)[$i]; $x += 303; $i++ }; AddBox $s 42 370 876 70 $navy $navy | Out-Null; AddText $s $item.bottom 68 395 820 20 13 $white $true | Out-Null
    } elseif ($item.type -eq 'checklist') {
      AddBox $s 42 145 570 280 $paleBlue $line | Out-Null; AddText $s 'NEXT REVIEW' 68 169 280 24 18 $ink $true | Out-Null; $y = 215; foreach ($check in $item.items) { AddText $s (([char]0x2610) + ' ' + $check) 68 $y 500 25 12 $ink $false | Out-Null; $y += 38 }; AddBox $s 648 145 270 280 $navy $navy | Out-Null; AddText $s $item.sideTitle 676 177 190 22 16 $orange $true | Out-Null; AddText $s $item.side 676 222 205 90 19 $white $true | Out-Null
    }
    AddFooter $s $number
  }
  if (Test-Path $outputPath) { Remove-Item -LiteralPath $outputPath -Force }
  $presentation.SaveAs($outputPath, 24); $presentation.Close(); $ppt.Quit(); Write-Output $outputPath
} finally {
  if ($presentation) { try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) } catch {} }
  if ($ppt) { try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) } catch {} }
  [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()
}
