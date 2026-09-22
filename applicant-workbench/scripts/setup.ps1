$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Test-Path .env)) {
  function New-Secret { [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48)) }
  @("PENPOT_SECRET_KEY=$(New-Secret)", "POSTGRES_PASSWORD=$(New-Secret)", "MINIO_PASSWORD=$(New-Secret)") | Set-Content -Encoding utf8 .env
}
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose failed' }
docker volume create applicant-workbench_app-data
if ($LASTEXITCODE -ne 0) { throw 'Application data volume failed' }
docker compose -f compose.dev.yaml up -d --build
if ($LASTEXITCODE -ne 0) { throw 'Development container failed' }
Write-Host 'Applicant: http://localhost:3201 | Penpot: http://localhost:9001'
