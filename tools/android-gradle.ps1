param(
  [string]$Task = "assembleDebug"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$AndroidRoot = Join-Path $ProjectRoot "android"
$StudioJdk = "C:\Program Files\Android\Android Studio\jbr"
$DefaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"

if (-not $env:JAVA_HOME -and (Test-Path $StudioJdk)) {
  $env:JAVA_HOME = $StudioJdk
}

if (-not $env:ANDROID_HOME -and (Test-Path $DefaultSdk)) {
  $env:ANDROID_HOME = $DefaultSdk
}

if (-not $env:ANDROID_SDK_ROOT -and $env:ANDROID_HOME) {
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

if (-not $env:JAVA_HOME) {
  throw "JAVA_HOME is not set and Android Studio's bundled JDK was not found."
}

if (-not $env:ANDROID_HOME) {
  throw "ANDROID_HOME is not set and the default Android SDK folder was not found."
}

$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

Set-Location $AndroidRoot
& .\gradlew.bat $Task
exit $LASTEXITCODE
