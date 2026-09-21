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
Write-Host 'Applicant: http://localhost:3200 | Penpot: http://localhost:9001'
