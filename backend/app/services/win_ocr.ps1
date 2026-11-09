param (
    [Parameter(Mandatory=$true)]
    [string]$ImagePath
)

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    })[0]

    Function Await-WinRtTask($WinRtTask, $ResultType) {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait(-1) | Out-Null
        $netTask.Result
    }

    [void][Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
    [void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
    [void][Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime]

    $fullPath = [System.IO.Path]::GetFullPath($ImagePath)
    if (-not (Test-Path $fullPath)) {
        Write-Error "File not found: $fullPath"
        exit 1
    }

    $file = Await-WinRtTask ([Windows.Storage.StorageFile]::GetFileFromPathAsync($fullPath)) ([Windows.Storage.StorageFile])
    $stream = Await-WinRtTask ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await-WinRtTask ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await-WinRtTask ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if (-not $engine) {
        $langs = [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages
        if ($langs -and $langs.Count -gt 0) {
            $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($langs[0])
        }
    }

    if (-not $engine) {
        Write-Error "No OCR language engine available"
        exit 1
    }

    $ocrResult = Await-WinRtTask ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    if ($ocrResult -and $ocrResult.Text) {
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        Write-Output $ocrResult.Text
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}

