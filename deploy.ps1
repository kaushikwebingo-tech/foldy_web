<#
  FOLDY API CONSOLE — one-command deploy from Windows.

      npm run deploy                 # install -> build -> ship -> swap in
      npm run deploy -- -SkipBuild   # re-ship whatever is already in dist/

  or directly:  powershell -ExecutionPolicy Bypass -File .\deploy.ps1

  This is the INTERNAL dev console, not a customer-facing site. It is the
  296-endpoint apiCatalog browser — so whoever can reach this host can read the
  whole shape of the backend. Put it behind the same access control as the admin
  web, or on a private host; it is not something to publish.

  ALL CONNECTION DETAILS COME FROM deploy.env (git-ignored) — host, port, user,
  password or .pem key, and the nginx document root. Copy deploy.env.example to
  deploy.env, fill it in once, and nothing else is manual.

  Note this repo's build is "tsc -b && vite build", so a type error fails the
  build outright — unlike the server, it needs no separate typecheck gate.

  HOW THE SWAP WORKS, and what it is not. The build is uploaded to a staging
  directory and moved into place in two "mv" calls, so the web root is never a
  half-written upload — but it is NOT atomic: there is a millisecond window
  between moving the old root aside and moving the new one in. (A truly atomic
  swap needs the document root to be a SYMLINK into a releases/ directory, which
  is an nginx-config change, not a script change.) The previous build is kept as
  <root>.prev, and the rollback command is printed at the end.
#>
[CmdletBinding()]
param(
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot
$AppName  = 'api'

# ── logging ──────────────────────────────────────────────────────────────────
function Step($m){ Write-Host "`n==> $m" -ForegroundColor Cyan }
function Info($m){ Write-Host "    $m" -ForegroundColor Gray }
function Ok($m)  { Write-Host "    OK  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "    !   $m" -ForegroundColor Yellow }
function Die($m) { Write-Host "`nFAILED: $m" -ForegroundColor Red; exit 1 }
function Have($c){ [bool](Get-Command $c -ErrorAction SilentlyContinue) }

# ── deploy.env ───────────────────────────────────────────────────────────────
$envPath = Join-Path $RepoRoot 'deploy.env'
if (-not (Test-Path $envPath)) {
  Write-Host "No deploy.env found in $RepoRoot" -ForegroundColor Red
  Write-Host "Create it from the template, then fill it in:" -ForegroundColor Yellow
  Write-Host "    Copy-Item .\deploy.env.example .\deploy.env ; notepad .\deploy.env"
  exit 1
}

# A deliberately small KEY=value reader: comments, blank lines and one layer of
# matching quotes. No interpolation and no `export` — this file is read by this
# script only, never sourced by a shell.
function Read-DeployEnv([string]$path) {
  $map = @{}
  foreach ($line in (Get-Content -LiteralPath $path)) {
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    $i = $t.IndexOf('=')
    if ($i -lt 1) { continue }
    $k = $t.Substring(0, $i).Trim()
    $v = $t.Substring($i + 1).Trim()
    if ($v.Length -ge 2 -and (($v[0] -eq '"' -and $v[-1] -eq '"') -or ($v[0] -eq "'" -and $v[-1] -eq "'"))) {
      $v = $v.Substring(1, $v.Length - 2)
    }
    $map[$k] = $v
  }
  return $map
}
$DeployEnv = Read-DeployEnv $envPath

function Conf([string]$key, [string]$fallback = '') {
  if ($DeployEnv.ContainsKey($key) -and $DeployEnv[$key] -ne '') { return $DeployEnv[$key] }
  return $fallback
}
function ConfBool([string]$key, [bool]$fallback = $false) {
  $v = (Conf $key).ToLower()
  if ($v -eq '') { return $fallback }
  return (@('1','true','yes','on') -contains $v)
}
function Need([string]$key) {
  $v = Conf $key
  if ($v -eq '') { Die "deploy.env is missing a value for $key" }
  return $v
}

$SshHost = Need 'DEPLOY_HOST'
$SshPort = Conf 'DEPLOY_PORT' '22'
$SshUser = Need 'DEPLOY_USER'
$SshKey  = Conf 'DEPLOY_SSH_KEY'
$SshPass = Conf 'DEPLOY_PASSWORD'
$Root    = (Need 'DEPLOY_REMOTE_ROOT').TrimEnd('/')
$UseSudo = ConfBool 'DEPLOY_USE_SUDO' $false
$Chown   = Conf 'DEPLOY_CHOWN'

# A key beats a password when both are set: it is unattended and nothing
# sensitive reaches a command line.
$Auth = (Conf 'DEPLOY_AUTH').ToLower()
if ($Auth -eq '') {
  if ($SshKey -ne '') { $Auth = 'key' }
  elseif ($SshPass -ne '') { $Auth = 'password' }
  else { $Auth = 'password' }   # no secret on file — prompt below
}
if ($Auth -eq 'key' -and $SshKey -ne '' -and -not (Test-Path $SshKey)) {
  Die "DEPLOY_SSH_KEY points at a file that does not exist: $SshKey"
}

<#
  NO PuTTY? USE OpenSSH AND LET IT ASK.

  Windows' own ssh/scp cannot take a password NON-interactively — that is why
  password auth normally goes through plink/pscp, which can. But refusing to
  deploy at all because PuTTY is absent is the wrong trade: ssh is present on
  every Windows 10+ box and is perfectly capable of PROMPTING.

  So the password in deploy.env goes unused in this mode and you type it once
  per remote step instead. Both better options are printed, because typing a
  root password several times per deploy is a habit worth not forming.
#>
if ($Auth -eq 'password' -and -not ((Have 'plink') -and (Have 'pscp'))) {
  if (-not (Have 'ssh')) {
    Die ("No way to reach the server: PuTTY is not installed and OpenSSH is missing too.`n" +
         "    Install either:  winget install PuTTY.PuTTY")
  }
  $Auth = 'interactive'
  Warn "PuTTY is not installed, so OpenSSH will ASK for the password at each remote step."
  Warn "DEPLOY_PASSWORD in deploy.env is not used in this mode."
  Info "  Unattended, using the password you already stored:"
  Info "      winget install PuTTY.PuTTY"
  Info "  Better still, no password anywhere (one-time setup):"
  Info "      ssh-keygen -t ed25519 -f $HOME\.ssh\foldy_deploy"
  Info "      type $HOME\.ssh\foldy_deploy.pub | ssh $SshUser@$SshHost 'cat >> ~/.ssh/authorized_keys'"
  Info "      then put that key path in DEPLOY_SSH_KEY in deploy.env"
}

$sudo = if ($UseSudo) { 'sudo ' } else { '' }
foreach ($t in 'tar','node','npm') { if (-not (Have $t)) { Die "'$t' is not on PATH." } }
<#
  ADDRESS THE .cmd SHIM EXPLICITLY, NEVER BARE `npm` / `npx`.

  On Windows those names resolve to the POWERSHELL shims shipped with Node
  (C:\Program Files\nodejs\npm.ps1), and on npm 11.6 they mangle the
  arguments on the way through: `& npm run build` arrives at npm as the
  command "pm", and `& npx tsc --noEmit` dies with "could not determine
  executable to run". The .cmd shims forward arguments correctly.

  Git Bash resolves a different, working shim — which is exactly why this
  passed every test run and failed the first real deploy.
#>
$Npm = if (Get-Command 'npm.cmd' -ErrorAction SilentlyContinue) { 'npm.cmd' } else { 'npm' }

# ── ssh / scp (OpenSSH for key|agent, PuTTY plink/pscp for password) ─────────
$script:Pw = $null
function Get-Pw {
  if ($null -eq $script:Pw) {
    if ($SshPass -ne '') { $script:Pw = $SshPass }
    else {
      $sec = Read-Host -AsSecureString "SSH password for $SshUser@${SshHost}:$SshPort"
      $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
      try { $script:Pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) }
      finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    }
    # Prime the host-key cache so the -batch calls below do not abort on the
    # one-time "store this key?" prompt, and fail fast on a wrong password
    # rather than midway through a deploy.
    'y' | & plink -ssh -P $SshPort -pw $script:Pw "$SshUser@$SshHost" "exit" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Die "Could not log in to $SshUser@${SshHost}:$SshPort (plink exit $LASTEXITCODE). Check DEPLOY_USER / DEPLOY_PASSWORD."
    }
  }
  return $script:Pw
}

function Assert-Putty {
  if (-not (Have 'plink') -or -not (Have 'pscp')) {
    Die ("Password auth needs PuTTY's plink.exe and pscp.exe on PATH — Windows'`n" +
         "    own ssh/scp cannot take a password non-interactively.`n" +
         "    Install it:  winget install PuTTY.PuTTY`n" +
         "    Or set DEPLOY_SSH_KEY to a .pem instead, which is fully unattended.")
  }
}

function RemoteTry([string]$cmd) {
  $q = $cmd -replace "'", "'\''"
  $payload = "bash -lc '$q'"
  if ($Auth -eq 'password') {
    Assert-Putty
    & plink -ssh -batch -P $SshPort -pw (Get-Pw) "$SshUser@$SshHost" $payload
  } else {
    $a = @('-p', $SshPort, '-o', 'StrictHostKeyChecking=accept-new')
    if ($Auth -eq 'key' -and $SshKey -ne '') { $a += @('-i', $SshKey) }
    & ssh @a "$SshUser@$SshHost" $payload
  }
  return $LASTEXITCODE
}
function RemoteOn([string]$cmd) {
  if ((RemoteTry $cmd) -ne 0) { Die "remote command failed on ${SshHost}:`n    $cmd" }
}

function UploadTo([string]$local, [string]$remote) {
  <#
    A DRIVE COLON LOOKS LIKE host:path. GNU tar and some scp builds read
    "C:\Users\..." as a remote spec and try to resolve a host named "C";
    Windows' own bsdtar and OpenSSH do not. So it breaks only for whoever
    has Git Bash ahead of System32 on PATH, which is the worst kind of bug
    to ship. Everything is handed a BARE FILENAME from its own directory.
  #>
  $dir  = Split-Path -Parent $local
  $leaf = Split-Path -Leaf $local
  Push-Location $dir
  try {
    if ($Auth -eq 'password') {
      Assert-Putty
      & pscp -batch -P $SshPort -pw (Get-Pw) $leaf "$SshUser@${SshHost}:$remote"
    } else {
      $a = @('-P', $SshPort, '-o', 'StrictHostKeyChecking=accept-new')
      if ($Auth -eq 'key' -and $SshKey -ne '') { $a += @('-i', $SshKey) }
      & scp @a $leaf "$SshUser@${SshHost}:$remote"
    }
  } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { Die "upload failed to ${SshHost}: $local -> $remote" }
}

function Run($exe, [string[]]$a, $cwd = $RepoRoot) {
  Push-Location $cwd
  try { & $exe @a; if ($LASTEXITCODE -ne 0) { Die "$exe $($a -join ' ') exited $LASTEXITCODE (in $cwd)" } }
  finally { Pop-Location }
}

# ── go ───────────────────────────────────────────────────────────────────────
$t0 = Get-Date
Write-Host "FOLDY $AppName  ->  $SshUser@${SshHost}:$Root  (auth: $Auth)" -ForegroundColor White

if (-not $SkipBuild) {
  if (-not (Test-Path (Join-Path $RepoRoot 'node_modules'))) {
    Step "install dependencies"
    Run $Npm @('ci')
  }
  Step "build"
  Run $Npm @('run','build')
}

$dist = Join-Path $RepoRoot 'dist'
if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  Die ("$dist\index.html not found — the build produced no site.`n" +
       "    Re-run without -SkipBuild, and check the vite output above.")
}
Ok "built $dist"

Step "package"
# -f takes a BARE NAME and tar runs from TEMP, because a drive colon reads as
# host:path to GNU tar (see UploadTo). -C keeps its absolute path: only the
# archive argument gets the remote-spec treatment.
$tgzName = "foldy-$AppName.tgz"
$tgz = Join-Path $env:TEMP $tgzName
if (Test-Path $tgz) { Remove-Item $tgz -Force }
Run 'tar' @('-czf', $tgzName, '-C', $dist, '.') $env:TEMP
Ok ("packaged {0:N1} MB" -f ((Get-Item $tgz).Length/1MB))

Step "upload"
UploadTo $tgz "/tmp/foldy-$AppName.tgz"

Step "swap in the new build (previous kept as ${Root}.prev)"
$stage = "/tmp/foldy-$AppName-stage"
$steps = @(
  "rm -rf $stage && mkdir -p $stage",
  "tar -xzf /tmp/foldy-$AppName.tgz -C $stage",
  "rm -f /tmp/foldy-$AppName.tgz",
  "test -f $stage/index.html",
  "${sudo}rm -rf ${Root}.prev",
  # mkdir first so the very first deploy, where the root does not exist yet,
  # still has something to move aside.
  "${sudo}mkdir -p $Root",
  "${sudo}mv $Root ${Root}.prev",
  "${sudo}mv $stage $Root"
)
if ($Chown -ne '') { $steps += "${sudo}chown -R $Chown $Root" }
RemoteOn ($steps -join ' && ')

$rollback = "rm -rf $Root && mv ${Root}.prev $Root"
Ok "$AppName deployed in $([int]((Get-Date)-$t0).TotalSeconds)s"
Info "previous build kept as ${Root}.prev — roll back with:"
Info "  ssh $SshUser@$SshHost '$rollback'"
