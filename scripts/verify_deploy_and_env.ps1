function ConvertFrom-SecureStringToPlain([System.Security.SecureString]$ss) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

Write-Host "=== SESMT - verificação de deploy e envs ===" -ForegroundColor Cyan

# Ler/verificar VERCEL_TOKEN
if (-not $env:VERCEL_TOKEN) {
    Write-Host "Digite seu Vercel token (entrada oculta):"
    $vTokenSecure = Read-Host -AsSecureString
    if ($vTokenSecure.Length -gt 0) { $env:VERCEL_TOKEN = ConvertFrom-SecureStringToPlain $vTokenSecure } else { Write-Host "Vercel token não fornecido; alguns checks serão limitados." }
}
else { Write-Host "Vercel token já presente no ambiente." }

# Ler/verificar SUPABASE_SERVICE_ROLE_KEY
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "Digite seu SUPABASE_SERVICE_ROLE_KEY (entrada oculta):"
    $sTokenSecure = Read-Host -AsSecureString
    if ($sTokenSecure.Length -gt 0) { $env:SUPABASE_SERVICE_ROLE_KEY = ConvertFrom-SecureStringToPlain $sTokenSecure } else { Write-Host "Supabase key não fornecida; não poderei checar DB." }
}
else { Write-Host "Supabase Service Role Key já presente no ambiente." }

Write-Host "`nTokens configurados apenas para esta sessão PowerShell.`n" -ForegroundColor Yellow

# 1) Test POST endpoint
Write-Host "1) Testando POST https://sesmt-system.vercel.app/api/aso-history ..." -ForegroundColor Cyan
$endpoint = "https://sesmt-system.vercel.app/api/aso-history"
if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    try {
        & curl.exe -i -X POST $endpoint -H "Content-Type: application/json" -d "{}" --max-time 15 | Out-String -Width 4096 | Write-Host
    }
    catch {
        Write-Host "curl.exe falhou: $_" -ForegroundColor Red
    }
}
else {
    try {
        $r = Invoke-WebRequest -Uri $endpoint -Method POST -ContentType "application/json" -Body '{}' -TimeoutSec 15 -ErrorAction Stop
        Write-Host "Status: $($r.StatusCode) $($r.StatusDescription)"
        if ($r.Content) { $preview = $r.Content.Substring(0, [Math]::Min(400, $r.Content.Length)); Write-Host "Body preview:`n$preview" }
    }
    catch {
        $e = $_.Exception
        if ($e.Response -ne $null) {
            $resp = $e.Response
            try {
                $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
                $body = $sr.ReadToEnd()
                Write-Host "HTTP Error: $($resp.StatusCode) - $($resp.StatusDescription)" -ForegroundColor Red
                if ($body) { $preview = $body.Substring(0, [Math]::Min(400, $body.Length)); Write-Host "Body preview:`n$preview" }
            }
            catch { Write-Host "Erro lendo corpo da resposta: $_" }
        }
        else {
            Write-Host "Request falhou: $_" -ForegroundColor Red
        }
    }
}

# 2) Git info
Write-Host "`n2) Informações do repositório local" -ForegroundColor Cyan
try {
    $sha = (git rev-parse --short HEAD 2>$null).Trim()
    $branch = (git branch --show-current 2>$null).Trim()
    Write-Host "Branch: $branch"
    Write-Host "Commit HEAD: $sha"
}
catch { Write-Host "git não disponível ou erro: $_" -ForegroundColor Red }

# 3) Verificar arquivos chave
Write-Host "`n3) Verificando presença de arquivos importantes" -ForegroundColor Cyan
$files = @("web-platform\src\app\api\aso-history\route.ts", "web-platform\src\app\page.tsx")
foreach ($f in $files) {
    if (Test-Path $f) { Write-Host "OK: $f" } else { Write-Host "MISSING: $f" -ForegroundColor Red }
}

# 4) Checar deploy no Vercel (se token presente)
if ($env:VERCEL_TOKEN) {
    Write-Host "`n4) Verificando deploy no Vercel via API..." -ForegroundColor Cyan
    try {
        $token = $env:VERCEL_TOKEN
        $projectsResp = Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "https://api.vercel.com/v1/projects" -ErrorAction Stop
        $projects = $projectsResp.projects ?? $projectsResp
        Write-Host ("Projetos encontrados: {0}" -f ($projects.Count))
        $candidates = $projects | Where-Object { ($_.name -match 'sesmt') -or ($_.gitRepository -and ($_.gitRepository.org + '/' + $_.gitRepository.repo) -eq 'Christian-Yugen/SESMT-SYSTEM') }
        if (-not $candidates -or $candidates.Count -eq 0) {
            Write-Host "Nenhum projeto com nome/repo correspondente encontrado. Listando todos (name | id | repo):"
            foreach ($p in $projects) {
                $repoFull = if ($p.gitRepository) { $p.gitRepository.org + '/' + $p.gitRepository.repo } else { $null }
                Write-Host ("{0} | id:{1} | repo:{2}" -f $p.name, $p.id, $repoFull)
            }
            $proj = $projects | Select-Object -First 1
        }
        else {
            Write-Host ("Projeto candidato: {0} id={1}" -f $candidates[0].name, $candidates[0].id)
            $proj = $candidates[0]
        }
        $projId = $proj.id
        Write-Host "`nBuscando deployments recentes para o projeto $($proj.name) ($projId)..."
        $depsResp = Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "https://api.vercel.com/v6/deployments?projectId=$projId&limit=20" -ErrorAction Stop
        $deps = $depsResp.deployments
        foreach ($d in $deps) {
            $sha = $null
            if ($d.meta) {
                if ($d.meta.githubCommitSha) { $sha = $d.meta.githubCommitSha }
                elseif ($d.meta.githubCommitRef) { $sha = $d.meta.githubCommitRef }
            }
            Write-Host ("id:{0} | state:{1} | target:{2} | created:{3} | sha:{4} | url:{5}" -f $d.uid, $d.state, $d.target, $d.created, $sha, $d.url)
        }
        $prod = $deps | Where-Object { $_.target -eq 'production' } | Select-Object -First 1
        if ($prod) {
            $prodsha = $null
            if ($prod.meta) { $prodsha = $prod.meta.githubCommitSha }
            Write-Host "`nProduction deployment SHA: $prodsha"
            if ($prodsha) {
                if ($prodsha -and $prodsha.StartsWith($sha)) { Write-Host "O SHA do deploy em produção corresponde ao HEAD local ($sha)." -ForegroundColor Green }
                else { Write-Host "O SHA do deploy em produção NÃO corresponde ao HEAD local ($sha). Verifique Root Directory / redeploy." -ForegroundColor Yellow }
            }
        }
        else {
            Write-Host "Nenhum deployment com target 'production' encontrado entre os 20 mais recentes." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Erro ao consultar Vercel API: $_" -ForegroundColor Red
    }
}
else {
    Write-Host "`nVERCEL_TOKEN não está definido; pulando checagem de deploy no Vercel." -ForegroundColor Yellow
}

# 4) Recomendações finais
Write-Host "`n4) Próximos passos sugeridos:" -ForegroundColor Cyan
Write-Host "- Abra o painel do Vercel para o projeto e verifique o SHA do deploy em produção." -NoNewline
Write-Host " Compare com o commit acima ($sha)." 
Write-Host "- Em Vercel, confirme Project Settings → Root Directory = web-platform (se aplicável)." 
Write-Host "- Se o SHA do deploy NÃO for o commit desejado, reimplante a branch correta." 
Write-Host "- Não aplique a migration 013 até confirmar que o endpoint funciona em produção e a service role key está configurada no Vercel." -ForegroundColor Yellow

Write-Host "`nScript finalizado." -ForegroundColor Green

Read-Host -Prompt "Pressione Enter para sair"
