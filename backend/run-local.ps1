# Corre el backend localmente cargando las variables de .env.local
# Uso: powershell -ExecutionPolicy Bypass -File .\run-local.ps1

$envFile = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Error "No existe .env.local -- copialo/editalo primero (contiene DATABASE_URL de Neon)."
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_.Trim() -eq '') { return }
    $parts = $_ -split '=', 2
    if ($parts.Length -eq 2) {
        [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
    }
}

Write-Host "Variables cargadas desde .env.local. Iniciando backend..." -ForegroundColor Green
& "$PSScriptRoot\mvnw.cmd" spring-boot:run
