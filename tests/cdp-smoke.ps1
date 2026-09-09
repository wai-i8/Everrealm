param(
  [ValidateSet('title', 'movement', 'town-movement', 'interior-movement', 'town', 'town-plaza', 'town-native', 'town-reference', 'town-near', 'town-mid', 'town-far', 'town-guild', 'town-services', 'town-tree', 'town-gate', 'town-exit', 'town-doors', 'town-entrance', 'town-equipment', 'clinic', 'clinic-return', 'clinic-authoring', 'general-store', 'inn', 'service-reach', 'latestui', 'finalui', 'artwalk', 'locomotion', 'spritecollision', 'entrance', 'fightertree', 'forestmap', 'dialogue', 'levelup', 'savelevel', 'resume', 'battle', 'mountain-art', 'mountain-recipient', 'skillbattle', 'guildmap', 'shopmap', 'dungeonmap', 'guildview', 'shopview', 'skills', 'portal', 'expansion', 'guild-abandon', 'guild-commission', 'monster-facing', 'bgm', 'autoplay')]
  [string]$Scenario = 'autoplay',
  [int]$ViewportWidth = 1440,
  [int]$ViewportHeight = 960,
  [int]$PlaySeconds = 7,
  [string]$ScreenshotName = ''
)

$ErrorActionPreference = 'Stop'

$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeOutputPath = Join-Path $projectRoot 'test-results\runtime'
New-Item -ItemType Directory -Path $runtimeOutputPath -Force | Out-Null
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$profilePath = Join-Path $tempRoot ("codex-everrealm-cdp-" + [Guid]::NewGuid().ToString('N'))
$port = Get-Random -Minimum 9400 -Maximum 9900
if (-not $ScreenshotName) { $ScreenshotName = "smoke-$Scenario-$ViewportWidth.png" }
$screenshotPath = Join-Path $runtimeOutputPath ([IO.Path]::GetFileName($ScreenshotName))
$query = if ($Scenario -eq 'autoplay') { '?autoplay=1' } else { '?smoke=1' }
$pageUrl = 'file:///' + ($projectRoot -replace '\\', '/') + '/index.html' + $query
$edgeProcess = $null
$socket = $null
$script:cdpId = 0
$script:runtimeErrors = [Collections.Generic.List[string]]::new()

function Invoke-Cdp {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [hashtable]$Params = @{}
  )

  $script:cdpId += 1
  $requestId = $script:cdpId
  $payload = @{ id = $requestId; method = $Method; params = $Params } | ConvertTo-Json -Depth 14 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
  $socket.SendAsync([ArraySegment[byte]]::new($bytes), [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null

  while ($true) {
    $stream = [IO.MemoryStream]::new()
    do {
      $buffer = [byte[]]::new(1048576)
      $result = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None).GetAwaiter().GetResult()
      $stream.Write($buffer, 0, $result.Count)
    } while (-not $result.EndOfMessage)

    $response = ([Text.Encoding]::UTF8.GetString($stream.ToArray())) | ConvertFrom-Json
    if ($response.method -eq 'Runtime.exceptionThrown') {
      $detail = $response.params.exceptionDetails
      $message = if ($detail.exception.description) { $detail.exception.description } else { $detail.text }
      $script:runtimeErrors.Add([string]$message)
    }
    if ($response.method -eq 'Runtime.consoleAPICalled' -and $response.params.type -eq 'error') {
      $message = ($response.params.args | ForEach-Object { if ($_.value) { $_.value } else { $_.description } }) -join ' '
      $script:runtimeErrors.Add([string]$message)
    }
    if ($response.id -eq $requestId) { return $response }
  }
}

function Invoke-GameExpression {
  param([Parameter(Mandatory = $true)][string]$Expression)

  $response = Invoke-Cdp -Method 'Runtime.evaluate' -Params @{
    expression = $Expression
    returnByValue = $true
    awaitPromise = $true
  }
  if ($response.result.exceptionDetails) {
    $detail = $response.result.exceptionDetails
    $message = if ($detail.exception.description) { $detail.exception.description } else { $detail.text }
    throw "Browser evaluation failed: $message`nExpression: $Expression"
  }
  return $response.result.result.value
}

function Get-GameSnapshot {
  $json = Invoke-GameExpression -Expression 'JSON.stringify(window.__RPG_DEBUG__.snapshot())'
  return $json | ConvertFrom-Json
}

function Invoke-WorldPointerClick {
  param(
    [Parameter(Mandatory = $true)][int]$WorldX,
    [Parameter(Mandatory = $true)][int]$WorldY
  )
  $expression = @'
(()=>{
  const api=window.__RPG_DEBUG__,canvas=document.getElementById("gameCanvas"),rect=canvas.getBoundingClientRect(),snap=api.snapshot();
  const clientX=rect.left+rect.width/2+(__WORLD_X__-snap.x)*snap.cameraZoom;
  const clientY=rect.top+rect.height/2+(__WORLD_Y__-snap.y)*snap.cameraZoom;
  const init={pointerId:77,button:0,clientX,clientY,bubbles:true,cancelable:true,pointerType:"mouse"};
  canvas.dispatchEvent(new PointerEvent("pointerdown",init));
  canvas.dispatchEvent(new PointerEvent("pointerup",{...init,button:0}));
  return JSON.stringify({worldX:__WORLD_X__,worldY:__WORLD_Y__,clientX,clientY});
})()
'@
  $expression = $expression.Replace('__WORLD_X__', [string]$WorldX).Replace('__WORLD_Y__', [string]$WorldY)
  return Invoke-GameExpression -Expression $expression
}

try {
  if (-not (Test-Path -LiteralPath $edgePath)) { throw 'Microsoft Edge was not found.' }
  New-Item -ItemType Directory -Path $profilePath | Out-Null
  $arguments = @(
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-allow-origins=*',
    "--remote-debugging-port=$port",
    "--user-data-dir=$profilePath",
    "--window-size=$ViewportWidth,$ViewportHeight",
    $pageUrl
  )
  $edgeProcess = Start-Process -FilePath $edgePath -ArgumentList $arguments -PassThru -WindowStyle Hidden

  $target = $null
  for ($attempt = 0; $attempt -lt 80 -and -not $target; $attempt += 1) {
    Start-Sleep -Milliseconds 100
    try {
      $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/list" -TimeoutSec 1
      $target = $targets | Where-Object { $_.type -eq 'page' -and $_.url -like '*index.html*' } | Select-Object -First 1
    } catch {}
  }
  if (-not $target) { throw 'Edge did not expose the RPG page.' }

  $socket = [Net.WebSockets.ClientWebSocket]::new()
  $socket.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
  Invoke-Cdp -Method 'Page.enable' | Out-Null
  Invoke-Cdp -Method 'Runtime.enable' | Out-Null
  Invoke-Cdp -Method 'Emulation.setDeviceMetricsOverride' -Params @{
    width = $ViewportWidth
    height = $ViewportHeight
    deviceScaleFactor = 1
    mobile = ($ViewportWidth -le 780)
  } | Out-Null
  Invoke-Cdp -Method 'Page.reload' | Out-Null
  Start-Sleep -Milliseconds 160

  $ready = $false
  for ($attempt = 0; $attempt -lt 50 -and -not $ready; $attempt += 1) {
    Start-Sleep -Milliseconds 100
    $ready = [bool](Invoke-GameExpression -Expression 'Boolean(window.__RPG_READY__ && window.__RPG_DEBUG__)')
  }
  if (-not $ready) { throw 'RPG debug hooks did not become ready.' }

  $before = Get-GameSnapshot
  $dialogueSnapshot = $null
  $dialoguePortraitUi = $null
  $levelUpSnapshot = $null
  $battleMidSnapshot = $null
  $battleScreenshotPath = $null
  $exploreUi = $null
  $inventoryUi = $null
  $inventoryScreenshotPath = $null
  $equipmentScreenshotPath = $null
  $statusScreenshotPath = $null
  $hudCollapsedScreenshotPath = $null
  $deckScreenshotPath = $null
  $deckViewerScreenshotPath = $null
  $dialogueServiceScreenshotPath = $null
  $dialogueLongScreenshotPath = $null
  $fighterTreeDetailScreenshotPath = $null
  $fighterTreeBottomScreenshotPath = $null
  $abandonScreenshotPath = $null
  $guildHelpScreenshotPath = $null
  $guildActiveScreenshotPath = $null
  $serviceReachResults = @()
  $monsterFacingRuntime = $null
  $movementEvidence = $null
  $movementBeforeScreenshotPath = $null
  switch ($Scenario) {
    'title' {
      if ($before.mode -ne 'title') { throw "Expected title mode, got $($before.mode)." }
    }
    'movement' {
      Invoke-GameExpression -Expression 'window.__RPG_DEBUG__.newGame(); true' | Out-Null
      $before = Get-GameSnapshot
      Invoke-GameExpression -Expression "(()=>{const canvas=document.getElementById('gameCanvas'),r=canvas.getBoundingClientRect();canvas.dispatchEvent(new PointerEvent('pointerdown',{pointerId:41,button:0,clientX:r.left+r.width*.64,clientY:r.top+r.height*.55,bubbles:true,cancelable:true}));return true})()" | Out-Null
      Start-Sleep -Milliseconds 650
      $exploreUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__,stage=document.getElementById("gameStage").getBoundingClientRect(),side=document.getElementById("exploreSidebar").getBoundingClientRect(),map=document.querySelector(".minimap-wrap").getBoundingClientRect(),inventory=document.getElementById("inventoryButton").getBoundingClientRect(),skills=document.getElementById("skillTreeButton").getBoundingClientRect(),commission=document.getElementById("commissionHud").getBoundingClientRect(),mid=stage.left+stage.width/2,buttons=[...document.querySelectorAll("[data-zoom-level]")],fontSizes={menu:parseFloat(getComputedStyle(document.querySelector(".explore-menu-copy b")).fontSize),zoom:parseFloat(getComputedStyle(buttons[0]).fontSize),commission:parseFloat(getComputedStyle(document.getElementById("commissionTitle")).fontSize)};buttons.find(b=>b.dataset.zoomLevel==="far").click();const far=api.snapshot();buttons.find(b=>b.dataset.zoomLevel==="mid").click();const middle=api.snapshot();buttons.find(b=>b.dataset.zoomLevel==="near").click();const near=api.snapshot();buttons.find(b=>b.dataset.zoomLevel==="mid").click();return {sideLeft:side.left>=stage.left-1,leftTools:[inventory,skills,commission].every(r=>r.right<=mid+1),mapRight:map.left>=mid-1,overlap:!(side.right<=map.left||side.left>=map.right||side.bottom<=map.top||side.top>=map.bottom),fontSizes,far:far.targetCameraZoom,middle:middle.targetCameraZoom,near:near.targetCameraZoom,active:buttons.find(b=>b.getAttribute("aria-pressed")==="true")?.dataset.zoomLevel,stored:localStorage.getItem("everrealm-zoom")};})())') | ConvertFrom-Json
      if (-not $exploreUi.sideLeft -or -not $exploreUi.leftTools -or -not $exploreUi.mapRight -or $exploreUi.overlap) { throw 'Exploration UI was not split into a left tool rail and right-only minimap.' }
      if (-not ($exploreUi.far -lt $exploreUi.middle -and $exploreUi.middle -lt $exploreUi.near) -or $exploreUi.active -ne 'mid' -or $exploreUi.stored -ne 'mid') { throw 'Far/mid/near zoom controls were not ordered, selected or persisted correctly.' }
      if ($exploreUi.fontSizes.menu -lt 11 -or $exploreUi.fontSizes.zoom -lt 11 -or $exploreUi.fontSizes.commission -lt 11) { throw 'Exploration typography remained too small at 100% browser zoom.' }
    }
    'interior-movement' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('clinic'); window.__RPG_DEBUG__.setZoom('mid'); window.__RPG_DEBUG__.teleport(837,780); window.__RPG_DEBUG__.clickMoveTo(837,500); true" | Out-Null
      $before = Get-GameSnapshot
      Start-Sleep -Milliseconds 650
      $after = Get-GameSnapshot
      $distance = [math]::Sqrt(([double]$after.x - [double]$before.x) * ([double]$after.x - [double]$before.x) + ([double]$after.y - [double]$before.y) * ([double]$after.y - [double]$before.y))
      $interval = [double]$after.movementOdometer.movingSeconds - [double]$before.movementOdometer.movingSeconds
      $travelled = [double]$after.movementOdometer.distanceWorldUnits - [double]$before.movementOdometer.distanceWorldUnits
      $measuredSpeed = $travelled / $interval
      $movementEvidence = [PSCustomObject]@{ map = $after.currentMapId; movingSeconds = $interval; distanceWorldUnits = $travelled; displacementWorldUnits = $distance; canonicalSpeedWorldUnitsPerSecond = [double]$before.stats.speed; measuredSpeedWorldUnitsPerSecond = $measuredSpeed; bodyHeightWorldUnits = 192; bodyLengthsPerSecond = $measuredSpeed / 192 }
      if ($before.currentMapId -ne 'clinic' -or $after.currentMapId -ne 'clinic' -or [double]$before.stats.speed -ne 330 -or $distance -lt 170 -or $measuredSpeed -lt 329 -or $measuredSpeed -gt 331) { throw "Interior movement did not use the canonical world speed (before=$($before.x),$($before.y), after=$($after.x),$($after.y), distance=$distance, measuredSpeed=$measuredSpeed, speed=$($before.stats.speed), map=$($after.currentMapId))." }
    }
    'town-movement' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.setZoom('mid'); window.__RPG_DEBUG__.teleport(3659,1760); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $before = Get-GameSnapshot
      $movementBeforeScreenshotPath = Join-Path $runtimeOutputPath "movement-town-before-$ViewportWidth.png"
      $movementBeforeCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($movementBeforeScreenshotPath, [Convert]::FromBase64String($movementBeforeCapture.result.data))
      $movementStart = Get-GameSnapshot
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.clickMoveTo(3059,1760); true" | Out-Null
      Start-Sleep -Milliseconds 650
      $after = Get-GameSnapshot
      $distance = [math]::Sqrt(([double]$after.x - [double]$movementStart.x) * ([double]$after.x - [double]$movementStart.x) + ([double]$after.y - [double]$movementStart.y) * ([double]$after.y - [double]$movementStart.y))
      $interval = [double]$after.movementOdometer.movingSeconds - [double]$movementStart.movementOdometer.movingSeconds
      $travelled = [double]$after.movementOdometer.distanceWorldUnits - [double]$movementStart.movementOdometer.distanceWorldUnits
      $measuredSpeed = $travelled / $interval
      $movementEvidence = [PSCustomObject]@{ map = $after.currentMapId; movingSeconds = $interval; distanceWorldUnits = $travelled; displacementWorldUnits = $distance; canonicalSpeedWorldUnitsPerSecond = [double]$before.stats.speed; measuredSpeedWorldUnitsPerSecond = $measuredSpeed; bodyHeightWorldUnits = 192; bodyLengthsPerSecond = $measuredSpeed / 192 }
      if ($before.currentMapId -ne 'world' -or $after.currentMapId -ne 'world' -or [double]$before.stats.speed -ne 330 -or $distance -lt 170 -or $measuredSpeed -lt 329 -or $measuredSpeed -gt 331) { throw "Main Town movement did not use the canonical world speed (before=$($before.x),$($before.y), after=$($after.x),$($after.y), distance=$distance, measuredSpeed=$measuredSpeed, speed=$($before.stats.speed), map=$($after.currentMapId))." }
    }
    'town' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleport(1000,840); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $town = Get-GameSnapshot
      if ($town.mode -ne 'playing' -or $town.currentMapId -ne 'world') { throw 'Town visual preview did not remain in the main town.' }
    }
    'town-plaza' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleport(1000,840); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townPlaza = Get-GameSnapshot
      if ($townPlaza.mode -ne 'playing' -or $townPlaza.currentMapId -ne 'world') { throw 'Town plaza visual preview did not remain in the main town.' }
    }
    'town-native' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.teleport(3878,2048); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townNative = Get-GameSnapshot
      $render = $townNative.flattenedMapRender
      $expectedSourceWidth = [double]$render.canvas.cssWidth / [double]$render.cameraZoom
      $expectedSourceHeight = [double]$render.canvas.cssHeight / [double]$render.cameraZoom
      if ($townNative.mode -ne 'playing' -or $townNative.currentMapId -ne 'world' -or $townNative.exploreZoomLevel -ne 'mid' -or [math]::Abs([double]$render.source.width - $expectedSourceWidth) -gt 1.1 -or [math]::Abs([double]$render.source.height - $expectedSourceHeight) -gt 1.1 -or [math]::Abs([double]$render.destination.width - [double]$render.canvas.cssWidth) -gt 1.1 -or [math]::Abs([double]$render.destination.height - [double]$render.canvas.cssHeight) -gt 1.1 -or $render.image.width -ne 7680 -or $render.image.height -ne 4320) { throw "Native Main Town crop did not use the shared native-world camera transform ($($render | ConvertTo-Json -Compress))." }
    }
    'town-reference' {
      # Keep the Guild frontage and central fountain in one native-scale crop,
      # matching the supplied visual reference without changing the camera.
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); window.__RPG_DEBUG__.teleport(3659,1760); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townReference = Get-GameSnapshot
      $render = $townReference.flattenedMapRender
      if ($townReference.mode -ne 'playing' -or $townReference.currentMapId -ne 'world' -or $townReference.exploreZoomLevel -ne 'mid' -or $render.image.width -ne 7680 -or $render.image.height -ne 4320) { throw "Reference Main Town crop did not stay in native world space ($($render | ConvertTo-Json -Compress))." }
    }
    'town-near' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); document.querySelector('[data-zoom-level=near]').click(); window.__RPG_DEBUG__.teleport(3659,1760); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townNear = Get-GameSnapshot
      if ($townNear.mode -ne 'playing' -or $townNear.currentMapId -ne 'world' -or $townNear.exploreZoomLevel -ne 'near') { throw 'Near Main Town camera preview did not remain in the expected world view.' }
    }
    'town-mid' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); document.querySelector('[data-zoom-level=mid]').click(); window.__RPG_DEBUG__.teleport(3659,1760); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townMid = Get-GameSnapshot
      if ($townMid.mode -ne 'playing' -or $townMid.currentMapId -ne 'world' -or $townMid.exploreZoomLevel -ne 'mid') { throw 'Mid Main Town camera preview did not remain in the expected world view.' }
    }
    'town-far' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleport(3659,1760); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townFar = Get-GameSnapshot
      if ($townFar.mode -ne 'playing' -or $townFar.currentMapId -ne 'world' -or $townFar.exploreZoomLevel -ne 'far') { throw 'Far Main Town camera preview did not remain in the expected world view.' }
    }
    'town-guild' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleport(700,400); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townGuild = Get-GameSnapshot
      if ($townGuild.mode -ne 'playing' -or $townGuild.currentMapId -ne 'world') { throw 'Guild block visual preview did not remain in the main town.' }
    }
    'town-services' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleport(1300,640); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townServices = Get-GameSnapshot
      if ($townServices.mode -ne 'playing' -or $townServices.currentMapId -ne 'world') { throw 'Service blocks visual preview did not remain in the main town.' }
    }
    'town-tree' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); document.querySelector('[data-zoom-level=near]').click(); window.__RPG_DEBUG__.teleport(120,1520); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townTree = Get-GameSnapshot
      if ($townTree.mode -ne 'playing' -or $townTree.currentMapId -ne 'world') { throw 'Town tree visual preview did not remain in the main town.' }
    }
    'town-gate' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); document.querySelector('[data-zoom-level=far]').click(); const gate=window.__RPG_DEBUG__.entityPosition('world-to-field'); window.__RPG_DEBUG__.teleport(gate.x-120,gate.y); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townGate = Get-GameSnapshot
      if ($townGate.mode -ne 'playing' -or $townGate.currentMapId -ne 'world') { throw 'Town gate visual preview did not remain in the main town.' }
    }
    'town-exit' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.setZoom('far'); const gate=window.__RPG_DEBUG__.entityPosition('world-to-field'); window.__RPG_DEBUG__.teleport(gate.x-240,gate.y); window.__RPG_DEBUG__.clickMoveTo(gate.x,gate.y); true" | Out-Null
      $townExit = $null
      for ($attempt = 0; $attempt -lt 18 -and (-not $townExit -or $townExit.currentMapId -ne 'field'); $attempt += 1) {
        Start-Sleep -Milliseconds 250
        $townExit = Get-GameSnapshot
      }
      if ($townExit.mode -ne 'playing' -or $townExit.currentMapId -ne 'field') { throw "East physical passage did not transition outside (map=$($townExit.currentMapId), mode=$($townExit.mode), x=$($townExit.x), y=$($townExit.y))." }
    }
    'town-doors' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); document.querySelector('[data-zoom-level=far]').click(); true" | Out-Null
      foreach ($entry in @(
        @{ portal = 'world-to-guild'; map = 'guild' },
        @{ portal = 'world-to-shop'; map = 'shop' },
        @{ portal = 'world-to-clinic'; map = 'clinic' },
        @{ portal = 'world-to-general-store'; map = 'general-store' },
        @{ portal = 'world-to-inn'; map = 'inn' }
      )) {
        $doorData = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__,door=api.entityPosition('$($entry.portal)'),info=api.transitionInfo('$($entry.portal)'),approach=info.entrance.approachPoint;api.newGame();api.teleport(approach.x,approach.y);api.clickPortal('$($entry.portal)');return JSON.stringify({door,info,approach,blocked:api.collisionAt(door.x,door.y,12),start:api.snapshot()});})()" | ConvertFrom-Json
        $arrived = $false
        # Main Town now uses the supplied 7680px-wide authoring coordinate
        # space; the farthest doorway can take longer than the old 4.5s cap.
        for ($attempt = 0; $attempt -lt 80 -and -not $arrived; $attempt += 1) {
          Start-Sleep -Milliseconds 250
          $doorSnapshot = Get-GameSnapshot
          $arrived = $doorSnapshot.currentMapId -eq $entry.map -and $doorSnapshot.mode -eq 'playing'
        }
        if (-not $arrived) { throw "Physical town door did not enter $($entry.map) (map=$($doorSnapshot.currentMapId), mode=$($doorSnapshot.mode), door=$($doorData.door.x),$($doorData.door.y), blocked=$($doorData.blocked), player=$($doorSnapshot.x),$($doorSnapshot.y), remaining=$($doorSnapshot.explorePath.remaining))." }
        Start-Sleep -Milliseconds 500
        $exitData = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__,exit=api.entityPosition('$($entry.map)-to-world'),info=api.transitionInfo('$($entry.map)-to-world'),approach=info.entrance.approachPoint;api.teleport(approach.x,approach.y-30);api.portalTick();api.clickMoveTo(exit.x,exit.y);return JSON.stringify({exit,info,approach:{x:approach.x,y:approach.y-30},blocked:api.collisionAt(approach.x,approach.y-30,12),start:api.snapshot()});})()" | ConvertFrom-Json
        $returned = $false
        for ($attempt = 0; $attempt -lt 80 -and -not $returned; $attempt += 1) {
          Start-Sleep -Milliseconds 250
          $returnSnapshot = Get-GameSnapshot
          $returned = $returnSnapshot.currentMapId -eq 'world' -and $returnSnapshot.mode -eq 'playing'
        }
        if (-not $returned) { throw "Physical $($entry.map) exit did not return to town (map=$($returnSnapshot.currentMapId), mode=$($returnSnapshot.mode), exit=$($exitData.exit.x),$($exitData.exit.y), blocked=$($exitData.blocked), player=$($returnSnapshot.x),$($returnSnapshot.y), remaining=$($returnSnapshot.explorePath.remaining), autoReady=$($returnSnapshot.automaticPortalReady))." }
      }
    }
    'town-entrance' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.setZoom('near'); const door=window.__RPG_DEBUG__.entityPosition('world-to-shop'); window.__RPG_DEBUG__.teleport(door.x,door.y+90); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $townEntrance = Get-GameSnapshot
      if ($townEntrance.mode -ne 'playing' -or $townEntrance.currentMapId -ne 'world') { throw 'Equipment shop entrance preview did not remain in the main town.' }
    }
    'town-equipment' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('shop'); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleport(400,280); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $equipmentMap = Get-GameSnapshot
      if ($equipmentMap.mode -ne 'playing' -or $equipmentMap.currentMapId -ne 'shop') { throw 'Equipment shop interior did not remain visible.' }
    }
    'clinic' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('clinic'); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleportTo('clinic-healer-siu-moon'); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $clinicMap = Get-GameSnapshot
      if ($clinicMap.mode -ne 'playing' -or $clinicMap.currentMapId -ne 'clinic') { throw 'Clinic interior did not remain visible.' }
      $clinicService = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.interactWith('clinic-healer-siu-moon');return JSON.stringify({mode:api.snapshot().mode,choices:document.querySelectorAll('.dialogue-choice').length});})()" | ConvertFrom-Json
      if ($clinicService.mode -ne 'dialogue' -or $clinicService.choices -lt 2) { throw 'Clinic healer service did not open from the interior NPC.' }
      $clinicServiceUi = (Invoke-GameExpression -Expression 'JSON.stringify({speaker:document.getElementById("speakerName").textContent,portrait:Boolean(document.querySelector(".dialogue-portrait")),choices:document.querySelectorAll(".dialogue-choice").length,choiceLayout:getComputedStyle(document.getElementById("dialogueChoices")).gridTemplateColumns})') | ConvertFrom-Json
      if ($clinicServiceUi.speaker -ne '護士' -or $clinicServiceUi.portrait -or $clinicServiceUi.choices -lt 2 -or ($clinicServiceUi.choiceLayout -split '\s+').Count -ne 1) { throw "Clinic dialogue role/portrait or vertical choices regressed (speaker=$($clinicServiceUi.speaker), portrait=$($clinicServiceUi.portrait), choices=$($clinicServiceUi.choices), columns=$($clinicServiceUi.choiceLayout))." }
      $dialogueServiceScreenshotPath = Join-Path $runtimeOutputPath "smoke-dialogue-clinic-$ViewportWidth.png"
      $dialogueServiceCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($dialogueServiceScreenshotPath, [Convert]::FromBase64String($dialogueServiceCapture.result.data))
      Invoke-GameExpression -Expression "window.dispatchEvent(new KeyboardEvent('keydown',{code:'Digit2',key:'2',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup',{code:'Digit2',key:'2',bubbles:true})); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $clinicAfterCancel = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),potions:document.getElementById("potionValue").textContent})') | ConvertFrom-Json
      if ($clinicAfterCancel.snapshot.mode -ne 'playing' -or $clinicAfterCancel.snapshot.coins -ne 12 -or $clinicAfterCancel.potions -ne '2') { throw "Clinic cancel keyboard choice changed service state (mode=$($clinicAfterCancel.snapshot.mode), coins=$($clinicAfterCancel.snapshot.coins), potions=$($clinicAfterCancel.potions))." }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.interactWith('clinic-healer-siu-moon'); true" | Out-Null
      Start-Sleep -Milliseconds 80
      Invoke-GameExpression -Expression "document.querySelector('.dialogue-choice:first-child').click(); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $clinicAfterService = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),potions:document.getElementById("potionValue").textContent})') | ConvertFrom-Json
      if ($clinicAfterService.snapshot.mode -ne 'playing' -or $clinicAfterService.snapshot.coins -ne 4 -or $clinicAfterService.potions -ne '3') { throw "Clinic service choice did not apply (mode=$($clinicAfterService.snapshot.mode), coins=$($clinicAfterService.snapshot.coins), potions=$($clinicAfterService.potions))." }
    }
    'clinic-return' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); document.querySelector('[data-zoom-level=far]').click(); const door=window.__RPG_DEBUG__.entityPosition('world-to-clinic'); window.__RPG_DEBUG__.teleport(door.x-300,door.y); window.__RPG_DEBUG__.clickMoveTo(door.x,door.y); true" | Out-Null
      $enteredClinic = $null
      for ($attempt = 0; $attempt -lt 20 -and (-not $enteredClinic -or $enteredClinic.currentMapId -ne 'clinic'); $attempt += 1) {
        Start-Sleep -Milliseconds 250
        $enteredClinic = Get-GameSnapshot
      }
      if ($enteredClinic.currentMapId -ne 'clinic') { throw "Clinic doorway did not enter (map=$($enteredClinic.currentMapId), x=$($enteredClinic.x), y=$($enteredClinic.y))." }
      Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__,exit=api.entityPosition('clinic-to-world');api.teleport(exit.x-100,exit.y);api.clickMoveTo(exit.x,exit.y);return true})()" | Out-Null
      $clinicReturn = $null
      for ($attempt = 0; $attempt -lt 20 -and (-not $clinicReturn -or $clinicReturn.currentMapId -ne 'world'); $attempt += 1) {
        Start-Sleep -Milliseconds 250
        $clinicReturn = Get-GameSnapshot
      }
      if ($clinicReturn.currentMapId -ne 'world' -or $clinicReturn.mode -ne 'playing') { throw "Clinic exit did not return to town (map=$($clinicReturn.currentMapId), mode=$($clinicReturn.mode))." }
      if ([double]$clinicReturn.y -lt 370) { throw "Clinic return spawn is not outside the visible facade (y=$($clinicReturn.y))." }
      $after = $clinicReturn
    }
    'clinic-authoring' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.setZoom('far'); true" | Out-Null
      $clinicDoor = Invoke-GameExpression -Expression "JSON.stringify(window.__RPG_DEBUG__.entityPosition('world-to-clinic'))" | ConvertFrom-Json
      Invoke-WorldPointerClick -WorldX ([int]$clinicDoor.x) -WorldY ([int]$clinicDoor.y) | Out-Null
      $enteredClinic = $null
      for ($attempt = 0; $attempt -lt 80 -and (-not $enteredClinic -or $enteredClinic.currentMapId -ne 'clinic'); $attempt += 1) {
        Start-Sleep -Milliseconds 250
        $enteredClinic = Get-GameSnapshot
      }
      if (-not $enteredClinic -or $enteredClinic.currentMapId -ne 'clinic') { throw "Normal pointer movement did not enter Hospital (map=$($enteredClinic.currentMapId), x=$($enteredClinic.x), y=$($enteredClinic.y))." }
      if ([Math]::Abs([double]$enteredClinic.x - 837) -gt 8 -or [Math]::Abs([double]$enteredClinic.y - 780) -gt 8) { throw "Hospital arrival spawn drifted from authored interior position (x=$($enteredClinic.x), y=$($enteredClinic.y))." }
      $entryNavigation = Invoke-GameExpression -Expression 'JSON.stringify({ready:window.LanternHospitalNavigation.status(),walkable:window.LanternHospitalNavigation.isPositionWalkable({x:window.__RPG_DEBUG__.snapshot().x,y:window.__RPG_DEBUG__.snapshot().y},{radius:3}),exit:window.LanternHospitalNavigation.isInRegion("exit",{x:window.__RPG_DEBUG__.snapshot().x,y:window.__RPG_DEBUG__.snapshot().y,radius:3})})' | ConvertFrom-Json
      if (-not $entryNavigation.walkable -or $entryNavigation.exit) { throw "Hospital arrival was not safely inside white ground and outside cyan (walkable=$($entryNavigation.walkable), exit=$($entryNavigation.exit))." }

      foreach ($blockedTarget in @(@{ x = 837; y = 310 }, @{ x = 250; y = 350 }, @{ x = 1400; y = 350 }, @{ x = 100; y = 300 })) {
        Invoke-WorldPointerClick -WorldX $blockedTarget.x -WorldY $blockedTarget.y | Out-Null
        Start-Sleep -Milliseconds 850
        $blockedSnapshot = Get-GameSnapshot
        if ($blockedSnapshot.currentMapId -ne 'clinic') { throw "Blocked Hospital click left the Clinic (target=$($blockedTarget.x),$($blockedTarget.y), map=$($blockedSnapshot.currentMapId))." }
        $blocked = Invoke-GameExpression -Expression "JSON.stringify(window.__RPG_DEBUG__.collisionAt($($blockedTarget.x),$($blockedTarget.y),12))" | ConvertFrom-Json
        if (-not $blocked) { throw "Hospital blocked target was reported walkable (target=$($blockedTarget.x),$($blockedTarget.y))." }
      }

      $nurseClick = Invoke-WorldPointerClick -WorldX 829 -WorldY 200 | ConvertFrom-Json
      $nurseDialogue = $null
      for ($attempt = 0; $attempt -lt 36 -and (-not $nurseDialogue -or $nurseDialogue.mode -ne 'dialogue'); $attempt += 1) {
        Start-Sleep -Milliseconds 250
        $nurseDialogue = Get-GameSnapshot
      }
      if (-not $nurseDialogue -or $nurseDialogue.mode -ne 'dialogue') {
        $nurseDebug = Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__,snap=api.snapshot(),npc=api.entityPosition("clinic-healer-siu-moon"),canvas=document.getElementById("gameCanvas"),rect=canvas.getBoundingClientRect();return {snap,npc,rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},nursePoint:{x:(($nurseClientX)-rect.left)*(canvas.width/rect.width),y:(($nurseClientY)-rect.top)*(canvas.height/rect.height)},npcRegion:window.LanternHospitalNavigation.isRegionAt("npc",{x:829,y:200})}})())'.Replace('$nurseClientX', [string]$nurseClick.clientX).Replace('$nurseClientY', [string]$nurseClick.clientY) | ConvertFrom-Json
        throw "Authored magenta nurse click did not open the existing dialogue (mode=$($nurseDialogue.mode), x=$($nurseDialogue.x), y=$($nurseDialogue.y), click=$($nurseClick.clientX),$($nurseClick.clientY), debug=$($nurseDebug | ConvertTo-Json -Compress -Depth 8))."
      }
      $clinicService = Invoke-GameExpression -Expression 'JSON.stringify({speaker:document.getElementById("speakerName").textContent,choices:document.querySelectorAll(".dialogue-choice").length,portrait:Boolean(document.querySelector(".dialogue-portrait"))})' | ConvertFrom-Json
      if ($clinicService.speaker -ne '護士' -or $clinicService.choices -lt 2 -or $clinicService.portrait) { throw "Existing Hospital nurse service/dialogue changed (speaker=$($clinicService.speaker), choices=$($clinicService.choices), portrait=$($clinicService.portrait))." }
      Invoke-GameExpression -Expression "document.querySelector('.dialogue-choice:last-child').click(); true" | Out-Null
      Start-Sleep -Milliseconds 250

      Invoke-WorldPointerClick -WorldX 837 -WorldY 700 | Out-Null
      Start-Sleep -Milliseconds 1700
      $exitClick = Invoke-WorldPointerClick -WorldX 837 -WorldY 833 | ConvertFrom-Json
      $returnedTown = $null
      for ($attempt = 0; $attempt -lt 44 -and (-not $returnedTown -or $returnedTown.currentMapId -ne 'world'); $attempt += 1) {
        Start-Sleep -Milliseconds 250
        $returnedTown = Get-GameSnapshot
      }
      if (-not $returnedTown -or $returnedTown.currentMapId -ne 'world') {
        $exitDebug = Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__,snap=api.snapshot(),portal=api.entityPosition("clinic-to-world");return {snap,portal,exitRegion:window.LanternHospitalNavigation.isInRegion("exit",{x:snap.x,y:snap.y,radius:3}),portalAtPointer:portal&&{dx:portal.x-837,dy:portal.y-833}}})())' | ConvertFrom-Json
        throw "Normal movement into the cyan Hospital exit did not return to Main Town (map=$($returnedTown.currentMapId), x=$($returnedTown.x), y=$($returnedTown.y), moving=$($returnedTown.moving), target=$($returnedTown.explorePath.target.x),$($returnedTown.explorePath.target.y), remaining=$($returnedTown.explorePath.remaining), ready=$($returnedTown.automaticPortalReady), zoom=$($returnedTown.cameraZoom), click=$($exitClick.clientX),$($exitClick.clientY), debugPortal=$($exitDebug.portal.x),$($exitDebug.portal.y), exitRegion=$($exitDebug.exitRegion))."
      }

      Invoke-WorldPointerClick -WorldX 850 -WorldY 520 | Out-Null
      Start-Sleep -Milliseconds 1800
      $awayFromDoor = Get-GameSnapshot
      if ($awayFromDoor.currentMapId -ne 'world' -or -not $awayFromDoor.automaticPortalReady) { throw "Main Town did not settle away from Hospital door before re-entry (map=$($awayFromDoor.currentMapId), ready=$($awayFromDoor.automaticPortalReady))." }
      Invoke-WorldPointerClick -WorldX ([int]$clinicDoor.x) -WorldY ([int]$clinicDoor.y) | Out-Null
      $reenteredClinic = $null
      for ($attempt = 0; $attempt -lt 80 -and (-not $reenteredClinic -or $reenteredClinic.currentMapId -ne 'clinic'); $attempt += 1) {
        Start-Sleep -Milliseconds 250
        $reenteredClinic = Get-GameSnapshot
      }
      if (-not $reenteredClinic -or $reenteredClinic.currentMapId -ne 'clinic') { throw "Hospital re-entry failed (map=$($reenteredClinic.currentMapId), x=$($reenteredClinic.x), y=$($reenteredClinic.y))." }
      Start-Sleep -Milliseconds 900
      $after = Get-GameSnapshot
      if ($after.currentMapId -ne 'clinic') { throw "Hospital re-entry immediately bounced back outside (map=$($after.currentMapId))." }
    }
    'general-store' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('general-store'); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleportTo('store-merchant-gin'); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $generalStoreMap = Get-GameSnapshot
      if ($generalStoreMap.mode -ne 'playing' -or $generalStoreMap.currentMapId -ne 'general-store') { throw 'General store interior did not remain visible.' }
      $generalStoreService = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.interactWith('store-merchant-gin');return JSON.stringify({mode:api.snapshot().mode,choices:document.querySelectorAll('.dialogue-choice').length});})()" | ConvertFrom-Json
      if ($generalStoreService.mode -ne 'dialogue' -or $generalStoreService.choices -lt 2) { throw 'General store service did not open from the interior NPC.' }
      Invoke-GameExpression -Expression "document.querySelector('.dialogue-choice:last-child').click(); true" | Out-Null
    }
    'inn' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('inn'); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleportTo('inn-keeper'); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $innMap = Get-GameSnapshot
      if ($innMap.mode -ne 'playing' -or $innMap.currentMapId -ne 'inn') { throw 'Inn interior did not remain visible.' }
      $innService = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.interactWith('inn-keeper');return JSON.stringify({mode:api.snapshot().mode,choices:document.querySelectorAll('.dialogue-choice').length});})()" | ConvertFrom-Json
      if ($innService.mode -ne 'dialogue' -or $innService.choices -lt 2) { throw 'Inn service did not open from the interior NPC.' }
      Invoke-GameExpression -Expression "document.querySelector('.dialogue-choice:last-child').click(); true" | Out-Null
    }
    'service-reach' {
      foreach ($entry in @(
        @{ map = 'guild'; npc = 'guildmaster-yin'; resolver = 'LanternGuildNavigation'; expected = 'dialogue' },
        @{ map = 'shop'; npc = 'merchant-gin'; resolver = 'LanternWeaponNavigation'; expected = 'facility' },
        @{ map = 'general-store'; npc = 'store-merchant-gin'; resolver = 'LanternItemNavigation'; expected = 'dialogue' },
        @{ map = 'inn'; npc = 'inn-keeper'; resolver = 'LanternInnNavigation'; expected = 'dialogue' },
        @{ map = 'clinic'; npc = 'clinic-healer-siu-moon'; resolver = 'LanternHospitalNavigation'; expected = 'dialogue' }
      )) {
        $setupExpression = @'
(()=>{
  const api=window.__RPG_DEBUG__,nav=window.__RESOLVER__,mapId="__MAP__",npcId="__NPC__";
  api.newGame("fighter");api.enterMap(mapId);api.setZoom("far");
  const region=nav.data.regions.npc[0];
  let candidate=null;
  for(const distance of [260,240,220,200,180]) for(let angle=0;angle<Math.PI*2;angle+=Math.PI/24){
    const point={x:region.centroid.x+Math.cos(angle)*distance,y:region.centroid.y+Math.sin(angle)*distance};
    if(nav.isPositionWalkable(point,{radius:3})&&nav.distanceToRegion("npc",point)>160){candidate=point;break;}
  }
  if(!candidate) throw Error(`No walkable customer-side position found in ${mapId}`);
  api.teleport(candidate.x,candidate.y);
  const npc=api.entityPosition(npcId),nearest=nav.nearestPointInRegion("npc",candidate);
  return JSON.stringify({mapId,npc,candidate,nearest,distance:nav.distanceToRegion("npc",candidate),walkable:nav.isPositionWalkable(candidate,{radius:3})});
})()
'@
        $setupExpression = $setupExpression.Replace('__RESOLVER__', $entry.resolver).Replace('__MAP__', $entry.map).Replace('__NPC__', $entry.npc)
        $setup = Invoke-GameExpression -Expression $setupExpression | ConvertFrom-Json
        if (-not $setup.walkable -or [double]$setup.distance -le 160) { throw "Could not place customer-side service reach fixture for $($entry.map) (walkable=$($setup.walkable), distance=$($setup.distance))." }

        $clickExpression = @'
(()=>{
  const api=window.__RPG_DEBUG__,canvas=document.getElementById("gameCanvas"),rect=canvas.getBoundingClientRect(),snap=api.snapshot(),target=__TARGET__;
  const init={pointerId:93,button:0,clientX:rect.left+rect.width/2+(target.x-snap.x)*snap.cameraZoom,clientY:rect.top+rect.height/2+(target.y-snap.y)*snap.cameraZoom,bubbles:true,cancelable:true,pointerType:"mouse"};
  canvas.dispatchEvent(new PointerEvent("pointerdown",init));canvas.dispatchEvent(new PointerEvent("pointerup",{...init,button:0}));return true;
})()
'@
        $clickExpression = $clickExpression.Replace('__TARGET__', ($setup.nearest | ConvertTo-Json -Compress))
        Invoke-GameExpression -Expression $clickExpression | Out-Null
        $service = $null
        for ($attempt = 0; $attempt -lt 60 -and (-not $service -or $service.mode -ne $entry.expected); $attempt += 1) {
          Start-Sleep -Milliseconds 250
          $service = Get-GameSnapshot
        }
        if (-not $service -or $service.mode -ne $entry.expected) { throw "Customer-side click did not reach $($entry.npc) in $($entry.map) (mode=$($service.mode), x=$($service.x), y=$($service.y), distance=$($setup.distance), remaining=$($service.explorePath.remaining))." }
        $serviceScreenshotPath = Join-Path $runtimeOutputPath "smoke-service-reach-$($entry.map)-$ViewportWidth.png"
        $serviceCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
        [IO.File]::WriteAllBytes($serviceScreenshotPath, [Convert]::FromBase64String($serviceCapture.result.data))
        $serviceReachResults += [PSCustomObject]@{ map = $entry.map; npc = $entry.npc; distance = [math]::Round([double]$setup.distance, 1); mode = $service.mode; screenshot = $serviceScreenshotPath }
      }
      $after = Get-GameSnapshot
    }
    'latestui' {
      Invoke-GameExpression -Expression "document.getElementById('newGameButton').click(); true" | Out-Null
      Start-Sleep -Milliseconds 140
      $classUi = (Invoke-GameExpression -Expression 'JSON.stringify({hidden:document.getElementById("classSelectPanel").hidden,cards:document.querySelectorAll("[data-class-choice]").length,topbar:document.querySelectorAll(".topbar").length,mobileControls:document.querySelectorAll("#mobileControls,[data-direction]").length})') | ConvertFrom-Json
      if ($classUi.hidden -or $classUi.cards -ne 2 -or $classUi.topbar -ne 0 -or $classUi.mobileControls -ne 0) { throw 'Class selection, removed top bar, or click-only exploration shell is incorrect.' }
      Invoke-GameExpression -Expression "document.querySelector('[data-class-choice=fighter]').click(); true" | Out-Null
      Start-Sleep -Milliseconds 180
      $fighter = Get-GameSnapshot
      if ($fighter.mode -ne 'playing' -or $fighter.classId -ne 'fighter' -or $fighter.equipped.weapon -ne 'novice_gloves' -or $fighter.stats.moveRange -ne 5 -or $fighter.skills.deckCapacity -ne 3 -or $fighter.skills.unlockedSkillIds.Count -ne 1 -or $fighter.skills.unlockedSkillIds[0] -ne 'straight_punch') { throw 'Fighter start did not apply five-step movement, gloves, 正拳, and the initial three-slot deck.' }
      $hudUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__,stage=document.getElementById("gameStage"),rail=document.getElementById("exploreSidebar"),toggle=document.getElementById("sidebarToggle"),beforeRect=rail.getBoundingClientRect();const before={collapsed:api.snapshot().hudCollapsed,expanded:toggle.getAttribute("aria-expanded"),width:beforeRect.width};toggle.click();const collapsed=api.snapshot(),collapsedExpanded=toggle.getAttribute("aria-expanded"),hidden=[...rail.children].filter(node=>node!==toggle).every(node=>getComputedStyle(node).display==="none"),collapsedRect=rail.getBoundingClientRect();toggle.click();const expanded=api.snapshot(),expandedAgain=toggle.getAttribute("aria-expanded");return {before,collapsed:collapsed.hudCollapsed,collapsedExpanded,hidden,narrow:collapsedRect.width<before.width*.6,expanded:expanded.hudCollapsed,expandedAgain,stored:localStorage.getItem("everrealm-hud-collapsed"),stage:stage.dataset.hudCollapsed};})())') | ConvertFrom-Json
      if ($hudUi.before.collapsed -or $hudUi.before.expanded -ne 'true' -or -not $hudUi.collapsed -or $hudUi.collapsedExpanded -ne 'false' -or -not $hudUi.hidden -or -not $hudUi.narrow -or $hudUi.expanded -or $hudUi.expandedAgain -ne 'true' -or $hudUi.stored -ne '0' -or $hudUi.stage -ne 'false') { throw "Exploration sidebar collapse toggle did not hide and restore the full rail ($($hudUi | ConvertTo-Json -Compress))." }
      Invoke-GameExpression -Expression "document.getElementById('sidebarToggle').click(); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $hudCollapsedScreenshotPath = Join-Path $runtimeOutputPath "smoke-hud-collapsed-$ViewportWidth.png"
      $hudCollapsedCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($hudCollapsedScreenshotPath, [Convert]::FromBase64String($hudCollapsedCapture.result.data))
      Invoke-GameExpression -Expression "document.getElementById('sidebarToggle').click(); true" | Out-Null
      Invoke-GameExpression -Expression "document.getElementById('statusButton').click(); true" | Out-Null
      Start-Sleep -Milliseconds 100
      $statusUi = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),stats:document.querySelectorAll(".status-stat-grid>div").length,labels:[...document.querySelectorAll(".status-stat-grid dt")].map(node=>node.textContent),forbidden:[...document.querySelectorAll(".status-stat-grid dt")].some(node=>["\u901f\u5ea6","\u66b4\u64ca","\u63a2\u7d22"].some(term=>node.textContent.includes(term))),canvas:!!document.getElementById("statusCharacterCanvas"),font:parseFloat(getComputedStyle(document.querySelector(".status-stat-grid dd")).fontSize)})') | ConvertFrom-Json
      if ($statusUi.snapshot.facility.tab -ne 'status' -or $statusUi.stats -ne 5 -or -not $statusUi.canvas -or $statusUi.font -lt 11 -or $statusUi.forbidden) { throw 'Clickable character status panel did not render the focused HP/attack/defence/move/DECK stats.' }
      $statusHelpUi = Invoke-GameExpression -Expression 'JSON.stringify((()=>{const button=document.getElementById("facilityHelpButton"),popover=document.getElementById("facilityHelpPopover");button.click();const opened=!popover.hidden&&button.getAttribute("aria-expanded")==="true";button.click();return {opened,closed:popover.hidden,hasText:Boolean(document.getElementById("facilityHelpText").textContent)};})())' | ConvertFrom-Json
      if (-not $statusHelpUi.opened -or -not $statusHelpUi.closed -or -not $statusHelpUi.hasText) { throw 'Shared facility help popover did not open and close from the header info control.' }
      $statusScreenshotPath = Join-Path $runtimeOutputPath "smoke-status-$ViewportWidth.png"
      $statusCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($statusScreenshotPath, [Convert]::FromBase64String($statusCapture.result.data))
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.facilityTab('equipment'); true" | Out-Null
      $fighterIconCount = Invoke-GameExpression -Expression 'document.querySelectorAll(".fighter-equipment-icon-atlas").length'
      if ($fighterIconCount -lt 1) { throw 'Fighter equipment did not use its dedicated glove atlas.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.teleport(1000,1000); document.getElementById('deckButton').click(); true" | Out-Null
      $farDeck = Get-GameSnapshot
      $farDeckUi = (Invoke-GameExpression -Expression 'JSON.stringify({actions:document.querySelectorAll("[data-facility-action=equip-skill],[data-facility-action=unequip-skill]").length,tabs:!!document.getElementById("facilityTabs"),summary:!!document.getElementById("facilitySummary")})') | ConvertFrom-Json
      if ($farDeck.mode -ne 'facility' -or $farDeck.facility.context -ne 'deck-view' -or $farDeckUi.actions -ne 0 -or $farDeckUi.tabs -or $farDeckUi.summary) { throw "Portable DECK did not open as a focused read-only view (mode=$($farDeck.mode), context=$($farDeck.facility.context))." }
      $deckViewerScreenshotPath = Join-Path $runtimeOutputPath "smoke-deck-viewer-$ViewportWidth.png"
      $deckViewerCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($deckViewerScreenshotPath, [Convert]::FromBase64String($deckViewerCapture.result.data))
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.teleportTo('harbour-gate-deck-console'); window.__RPG_DEBUG__.interactWith('harbour-gate-deck-console'); true" | Out-Null
      Start-Sleep -Milliseconds 100
      $deckUi = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),slots:document.querySelectorAll(".deck-slot").length,filled:document.querySelectorAll(".deck-slot.is-filled").length,cmd:document.querySelectorAll(".skill-kind-badge.is-cmd").length,emptyStrong:document.querySelectorAll(".deck-slot.is-empty strong").length,emptyCopy:document.querySelectorAll(".deck-slot.is-empty .deck-slot-empty").length,emptyText:[...document.querySelectorAll(".deck-slot.is-empty")].map(node=>node.textContent.replace(/\d/g,"").trim()).join("")})') | ConvertFrom-Json
      if ($deckUi.snapshot.facility.context -ne 'deck' -or $deckUi.slots -ne 3 -or $deckUi.filled -ne 1 -or $deckUi.cmd -lt 1 -or $deckUi.emptyStrong -ne 0 -or $deckUi.emptyCopy -ne 0 -or $deckUi.emptyText -ne '') { throw 'City-gate DECK panel did not show the editable fighter loadout with blank empty slots and CMD badge.' }
      $deckScreenshotPath = Join-Path $runtimeOutputPath "smoke-deck-$ViewportWidth.png"
      $deckCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($deckScreenshotPath, [Convert]::FromBase64String($deckCapture.result.data))
      $deckRewards = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__;const three=api.snapshot().skills.deckCapacity;api.setGuildMarks(10);const four=api.snapshot().skills.deckCapacity;api.facilityTab("deck");const final=api.snapshot();return {three,four,milestones:final.skills.deckUpgradeMilestones.length,slots:document.querySelectorAll(".deck-slot").length};})())') | ConvertFrom-Json
      if ($deckRewards.three -ne 3 -or $deckRewards.four -ne 4 -or $deckRewards.milestones -ne 1 -or $deckRewards.slots -ne 4) { throw 'Guild DECK milestone reward did not expand the city-gate panel from three to four slots.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.grantSkillBook(1); window.__RPG_DEBUG__.openSkillBook(1); window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.openFacility('bag'); true" | Out-Null
      Start-Sleep -Milliseconds 90
      $fixtureUi = Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__;api.setInventoryFixture(30);const cards=[...document.querySelectorAll(".inventory-grid-item")],rects=cards.map(node=>node.getBoundingClientRect());const overlaps=rects.some((a,i)=>rects.slice(i+1).some(b=>!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)));return {cards:cards.length,fixture:Boolean(document.querySelector("[data-item-id=fixture_material_30]")),overlaps};})())' | ConvertFrom-Json
      if ($fixtureUi.cards -lt 30 -or -not $fixtureUi.fixture -or $fixtureUi.overlaps) { throw "Inventory 30-item fixture overlapped or failed to render (cards=$($fixtureUi.cards), overlaps=$($fixtureUi.overlaps))." }
      Invoke-GameExpression -Expression 'window.__RPG_DEBUG__.setInventoryFixture(0); true' | Out-Null
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=select-item][data-item-id^=manual_]').click(); true" | Out-Null
      Invoke-GameExpression -Expression "document.querySelector('.inventory-selected-detail [data-facility-action=use-manual]').click(); true" | Out-Null
      $manualUi = (Invoke-GameExpression -Expression 'JSON.stringify({dialogHidden:document.getElementById("skillBookConfirmPanel").hidden,manuals:Object.values(window.__RPG_DEBUG__.snapshot().skills.manualCounts).reduce((sum,value)=>sum+value,0),learned:window.__RPG_DEBUG__.snapshot().skills.unlockedSkillIds.length,stats:document.querySelectorAll("#skillBookConfirmStats>div").length})') | ConvertFrom-Json
      if ($manualUi.dialogHidden -or $manualUi.manuals -ne 1 -or $manualUi.learned -ne 1 -or $manualUi.stats -lt 4) { throw 'Named skill book did not wait for confirmation with range/AP/speed details.' }
      Invoke-GameExpression -Expression "document.getElementById('skillBookCancelButton').click(); window.__RPG_DEBUG__.facilityTab('skills'); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $treeUi = (Invoke-GameExpression -Expression 'JSON.stringify({nodes:document.querySelectorAll(".skill-tree-node").length,learned:document.querySelectorAll(".skill-tree-node.is-learned").length,unknown:document.querySelectorAll(".skill-tree-node.is-missingPrereq").length})') | ConvertFrom-Json
      if ($treeUi.nodes -ne 65 -or $treeUi.learned -ne 1 -or $treeUi.unknown -lt 1) { throw 'Fighter prerequisite skill tree states did not render.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.enterMap('field'); window.__RPG_DEBUG__.startBattle('slime-1'); true" | Out-Null
      Start-Sleep -Milliseconds 100
      $directBattle = Get-GameSnapshot
      $introHidden = Invoke-GameExpression -Expression 'document.getElementById("battleEncounterIntro").hidden'
      if ($directBattle.battle.phase -ne 'planning_move' -or -not $introHidden) { throw 'Battle did not start directly in movement planning.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleCommitMove(); true" | Out-Null
      for ($attempt = 0; $attempt -lt 30 -and (Get-GameSnapshot).battle.phase -ne 'planning_action'; $attempt += 1) { Start-Sleep -Milliseconds 100 }
      $punchRange = (Invoke-GameExpression -Expression 'JSON.stringify(window.__RPG_DEBUG__.battleSkillRange("kentotsu"))') | ConvertFrom-Json
      if ($punchRange.Count -ne 5) { throw "Straight Punch did not expose exactly five front/side range cells (count=$($punchRange.Count))." }
    }
    'finalui' {
      Invoke-GameExpression -Expression "document.getElementById('newGameButton').click(); true" | Out-Null
      Start-Sleep -Milliseconds 100
      Invoke-GameExpression -Expression "document.querySelector('[data-class-choice=fighter]').click(); true" | Out-Null
      Start-Sleep -Milliseconds 160

      Invoke-GameExpression -Expression "document.getElementById('statusButton').click(); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $statusCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes((Join-Path $runtimeOutputPath "final-status-$ViewportWidth.png"), [Convert]::FromBase64String($statusCapture.result.data))

      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.openFacility('bag'); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $unselectedUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const panel=document.querySelector(".unified-inventory-layout"),detail=document.querySelector(".inventory-empty-selection"),cards=[...document.querySelectorAll(".inventory-grid-item")],rect=panel?.getBoundingClientRect();return {detail:Boolean(detail),cards:cards.length,scroll:document.documentElement.scrollWidth<=innerWidth+1,character:Boolean(document.querySelector(".bag-paperdoll-board .paperdoll-avatar canvas")),panelWidth:rect?.width||0};})())') | ConvertFrom-Json
      if (-not $unselectedUi.detail -or -not $unselectedUi.character -or -not $unselectedUi.scroll) { throw 'Inventory unselected state was not contained or did not expose one empty selection state.' }
      $unselectedCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes((Join-Path $runtimeOutputPath "final-inventory-unselected-$ViewportWidth.png"), [Convert]::FromBase64String($unselectedCapture.result.data))

      $fixture20 = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__;api.setInventoryFixture(20);const cards=[...document.querySelectorAll("[data-item-id^=fixture_material_]")],rects=cards.map(node=>node.getBoundingClientRect()),overlap=rects.some((a,i)=>rects.slice(i+1).some(b=>!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)));return {cards:cards.length,overlap,viewport:document.documentElement.scrollWidth<=innerWidth+1,contained:document.querySelector(".bag-items-panel")?.scrollWidth<=document.querySelector(".bag-items-panel")?.clientWidth+1};})())') | ConvertFrom-Json
      if ($fixture20.cards -ne 20 -or $fixture20.overlap -or -not $fixture20.viewport -or -not $fixture20.contained) { throw "Inventory 20-item fixture failed (cards=$($fixture20.cards), overlap=$($fixture20.overlap), viewport=$($fixture20.viewport), contained=$($fixture20.contained))." }
      $fixture20Capture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes((Join-Path $runtimeOutputPath "final-inventory-20-$ViewportWidth.png"), [Convert]::FromBase64String($fixture20Capture.result.data))

      $fixture30 = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__;api.setInventoryFixture(30);const cards=[...document.querySelectorAll("[data-item-id^=fixture_material_]")],rects=cards.map(node=>node.getBoundingClientRect()),overlap=rects.some((a,i)=>rects.slice(i+1).some(b=>!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)));return {cards:cards.length,overlap,viewport:document.documentElement.scrollWidth<=innerWidth+1,contained:document.querySelector(".bag-items-panel")?.scrollWidth<=document.querySelector(".bag-items-panel")?.clientWidth+1};})())') | ConvertFrom-Json
      if ($fixture30.cards -ne 30 -or $fixture30.overlap -or -not $fixture30.viewport -or -not $fixture30.contained) { throw "Inventory 30-item fixture failed (cards=$($fixture30.cards), overlap=$($fixture30.overlap), viewport=$($fixture30.viewport), contained=$($fixture30.contained))." }
      $fixture30Capture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes((Join-Path $runtimeOutputPath "final-inventory-30-$ViewportWidth.png"), [Convert]::FromBase64String($fixture30Capture.result.data))
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=select-item][data-item-id=fixture_material_30]').click(); true" | Out-Null
      if (-not (Invoke-GameExpression -Expression 'Boolean(document.querySelector(".inventory-selected-detail:not(.inventory-empty-selection)"))')) { throw 'Inventory selected detail was not reachable after the 30-item fixture.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.setInventoryFixture(0); window.__RPG_DEBUG__.setPlayer({hp:1}); window.__RPG_DEBUG__.facilityTab('bag'); true" | Out-Null
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=select-item][data-item-id=healing_potion]').click(); document.querySelector('.inventory-selected-detail [data-facility-action=use-potion]').click(); true" | Out-Null
      if ((Get-GameSnapshot).potions -ge 2) { throw 'Consumable Use did not consume a potion at runtime.' }
      $selectedCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes((Join-Path $runtimeOutputPath "final-inventory-selected-$ViewportWidth.png"), [Convert]::FromBase64String($selectedCapture.result.data))

      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.setPlayer({coins:999}); window.__RPG_DEBUG__.enterMap('shop'); window.__RPG_DEBUG__.openFacility('shop'); window.__RPG_DEBUG__.buyEquip('tide_iron_knuckles'); window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.openFacility('bag'); true" | Out-Null
      Start-Sleep -Milliseconds 100
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=select-item][data-item-id=tide_iron_knuckles]').click(); document.querySelector('.inventory-selected-detail [data-facility-action=equip]').click(); true" | Out-Null
      if ((Get-GameSnapshot).equipped.weapon -ne 'tide_iron_knuckles') { throw 'Equipment Equip did not update the active weapon at runtime.' }
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=select-item][data-item-id=novice_gloves]').click(); document.querySelector('.inventory-selected-detail [data-facility-action=equip]').click(); true" | Out-Null
      if ((Get-GameSnapshot).equipped.weapon -ne 'novice_gloves') { throw 'Equipment Swap did not return to the original weapon at runtime.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.grantSkillBook(1); window.__RPG_DEBUG__.openSkillBook(1); window.__RPG_DEBUG__.facilityTab('bag'); true" | Out-Null
      Start-Sleep -Milliseconds 80
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=select-item][data-item-id^=manual_]').click(); document.querySelector('.inventory-selected-detail [data-facility-action=use-manual]').click(); true" | Out-Null
      if (Invoke-GameExpression -Expression 'document.getElementById("skillBookConfirmPanel").hidden') { throw 'Skill-book manual action did not open its confirmation dialog.' }
      Invoke-GameExpression -Expression "document.getElementById('skillBookCancelButton').click(); window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.openFacility('deck'); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $deckViewer = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const slots=[...document.querySelectorAll(".deck-slot")],rects=slots.map(node=>node.getBoundingClientRect()),text=slots.map(node=>node.textContent).join(" ");return {slots:slots.length,filled:document.querySelectorAll(".deck-slot.is-filled").length,actions:document.querySelectorAll("[data-facility-action=equip-skill],[data-facility-action=unequip-skill]").length,learned:Boolean(document.querySelector(".deck-skill-list")),icons:document.querySelectorAll(".deck-slot .skill-card-icon").length,vertical:rects.every((rect,index)=>index===0||rect.top>rects[index-1].top),metadata:/AP|速度|射程|範圍/.test(text)};})())') | ConvertFrom-Json
      if ($deckViewer.slots -lt 3 -or $deckViewer.actions -ne 0 -or $deckViewer.learned -or $deckViewer.icons -ne 0 -or -not $deckViewer.vertical -or $deckViewer.metadata) { throw 'Normal DECK viewer still exposed management controls, metadata, or a non-vertical skill icon wall.' }
      $deckCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes((Join-Path $runtimeOutputPath "final-deck-$ViewportWidth.png"), [Convert]::FromBase64String($deckCapture.result.data))

      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.openFacility('skills'); true" | Out-Null
      Start-Sleep -Milliseconds 100
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=skill-detail][data-skill-id=kentotsu]').click(); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $detailCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes((Join-Path $runtimeOutputPath "final-skill-detail-$ViewportWidth.png"), [Convert]::FromBase64String($detailCapture.result.data))
      Invoke-GameExpression -Expression "document.getElementById('skillDetailDismissButton').click(); window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.openFacility('equipment'); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $equipmentCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes((Join-Path $runtimeOutputPath "final-equipment-$ViewportWidth.png"), [Convert]::FromBase64String($equipmentCapture.result.data))
    }
    'artwalk' {
      Invoke-GameExpression -Expression @'
(async()=>{
  const art=window.LanternArt;
  const deadline=performance.now()+8000;
  while(Object.values(art.spriteStatus()).some(a=>!a.ready&&!a.failed)&&performance.now()<deadline) await new Promise(r=>setTimeout(r,50));
  if(!art.spriteStatus().locomotion_fighter.ready) throw Error('Standard fighter locomotion atlas failed to load');
  const preview=document.createElement('canvas');preview.width=1180;preview.height=870;
  preview.style.cssText='position:fixed;inset:0;z-index:99999;width:min(100vw,1180px);height:auto;background:#284547';
  document.body.append(preview);const c=preview.getContext('2d');c.fillStyle='#284547';c.fillRect(0,0,1180,870);
  const sources=[];const baselines=[];const draw=c.drawImage.bind(c);c.drawImage=(...args)=>{if(String(args[0].src).includes('locomotion/fighter-v1'))sources.push(args.slice(1,5).join(','));return draw(...args)};
  ['down','right','up','left'].forEach((facing,row)=>{
    for(let frame=0;frame<7;frame++){
      const state=frame===0?'idle':'walk',time=Math.max(0,frame-1)/10;
      const x=77+frame*108,y=198+row*207;
      c.fillStyle='#cfe2dd';c.font='12px sans-serif';c.fillText(`${facing} / ${frame===0?'Idle':'W'+frame}`,18+frame*108,28+row*207);
      const box=art.drawCharacter(c,{actor:'player',classId:'fighter',facing,state,locomotion:{state,facing,time},x,y,scale:1.35});
      baselines.push(Math.abs(box.bottom-y));
    }
  });
  ['keeper','smith','healer'].forEach((actor,index)=>{
    const y=236+index*276;c.fillStyle='#cfe2dd';c.fillText(actor,810,y-200);
    art.drawCharacter(c,{actor,x:838,y,scale:2,phase:0});
    art.drawPortrait(c,{actor,x:950,y:y-175,width:168,height:168});
  });
  if(new Set(sources).size!==28) throw Error(`Expected 28 distinct standard frames, got ${new Set(sources).size}`);
  if(Math.max(...baselines)>.001) throw Error('Runtime frame baseline drifted from the shared anchor');
  return true;
})()
'@ | Out-Null
    }
    'locomotion' {
      Invoke-GameExpression -Expression @'
(async()=>{
  const status=window.LanternArt.spriteStatus(),required=['locomotion_fighter','locomotion_warrior','locomotion_slime','locomotion_wisp','locomotion_hound'];
  const deadline=performance.now()+8000;
  while(required.some(key=>!window.LanternArt.spriteStatus()[key]?.ready)&&performance.now()<deadline) await new Promise(resolve=>setTimeout(resolve,40));
  const failed=required.filter(key=>!window.LanternArt.spriteStatus()[key]?.ready);
  if(failed.length) throw Error(`Locomotion atlases failed to load: ${failed.join(', ')}`);
  return true;
})()
'@ | Out-Null
      $directions = @(
        @{ name = 'down'; dx = 0; dy = 64; gridX = 0; gridY = 1 },
        @{ name = 'right'; dx = 64; dy = 0; gridX = 1; gridY = 0 },
        @{ name = 'up'; dx = 0; dy = -64; gridX = 0; gridY = -1 },
        @{ name = 'left'; dx = -64; dy = 0; gridX = -1; gridY = 0 }
      )
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter');window.__RPG_DEBUG__.enterMap('field');window.__RPG_DEBUG__.setEncounterGrace(30);true" | Out-Null
      $enemyWalkVerified = $false
      foreach ($direction in $directions) {
        Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__,steps=[[0,0],[0,16],[0,32],[0,48],[0,64],[16,0],[32,0],[48,0],[64,0],[0,-16],[0,-32],[0,-48],[0,-64],[-16,0],[-32,0],[-48,0],[-64,0]];let base=null;outer:for(let y=160;y<=1320;y+=48)for(let x=160;x<=2100;x+=48){if(steps.every(([dx,dy])=>!api.collisionAt(x+dx,y+dy))){base={x,y};break outer}}if(!base)throw Error('No four-way exploration QA clearing');api.teleport(base.x,base.y);if(!api.clickMoveTo(base.x+$($direction.dx),base.y+$($direction.dy)))throw Error('No exploration path for $($direction.name)');return base})()" | Out-Null
        $walk = $null
        for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
          Start-Sleep -Milliseconds 25
          $walk = Get-GameSnapshot
          if ($walk.locomotion.state -eq 'walk' -and $walk.locomotion.facing -eq $direction.name) { break }
        }
        if ($walk.locomotion.state -ne 'walk' -or $walk.locomotion.facing -ne $direction.name) {
          throw "Exploration $($direction.name) did not enter directional Walk."
        }
        $path = Join-Path $runtimeOutputPath "locomotion-exploration-$($direction.name).png"
        $capture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
        [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($capture.result.data))
        Invoke-GameExpression -Expression '(()=>{const api=window.__RPG_DEBUG__,s=api.snapshot();api.teleport(s.x,s.y);return true})()' | Out-Null
        Start-Sleep -Milliseconds 80
        $idle = Get-GameSnapshot
        if ($idle.locomotion.state -ne 'idle' -or $idle.locomotion.facing -ne $direction.name) {
          throw "Exploration $($direction.name) did not return to its facing Idle."
        }
      }
      foreach ($direction in $directions) {
        Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter');window.__RPG_DEBUG__.enterMap('field');window.__RPG_DEBUG__.setEncounterGrace(30);window.__RPG_DEBUG__.startBattle('slime-1');true" | Out-Null
        Start-Sleep -Milliseconds 80
        $start = Get-GameSnapshot
        $targetX = [int]$start.battle.hero.cell.x + [int]$direction.gridX
        $targetY = [int]$start.battle.hero.cell.y + [int]$direction.gridY
        $reachable = [bool](Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleReachable().some(cell=>cell.x===$targetX&&cell.y===$targetY)")
        if (-not $reachable) { throw "Battle QA target for $($direction.name) was not reachable." }
        Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleConfirm($targetX,$targetY);window.__RPG_DEBUG__.battleChooseFacing('$($direction.name)');true" | Out-Null
        $walk = $null
        for ($attempt = 0; $attempt -lt 35; $attempt += 1) {
          Start-Sleep -Milliseconds 25
          $walk = Get-GameSnapshot
          if (@($walk.battle.enemies | Where-Object { $_.locomotion.state -eq 'walk' }).Count -gt 0) { $enemyWalkVerified = $true }
          if ($walk.battle.hero.locomotion.state -eq 'walk' -and $walk.battle.hero.locomotion.facing -eq $direction.name) { break }
        }
        if ($walk.battle.hero.locomotion.state -ne 'walk' -or $walk.battle.hero.locomotion.facing -ne $direction.name) {
          throw "Battle $($direction.name) did not play directional Walk."
        }
        $path = Join-Path $runtimeOutputPath "locomotion-battle-$($direction.name).png"
        $capture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
        [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($capture.result.data))
        $idle = $null
        for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
          Start-Sleep -Milliseconds 30
          $idle = Get-GameSnapshot
          if (@($idle.battle.enemies | Where-Object { $_.locomotion.state -eq 'walk' }).Count -gt 0) { $enemyWalkVerified = $true }
          if ($idle.battle.phase -eq 'planning_action') { break }
        }
        if ($idle.battle.phase -ne 'planning_action' -or $idle.battle.hero.locomotion.state -ne 'idle' -or $idle.battle.hero.locomotion.facing -ne $direction.name) {
          throw "Battle $($direction.name) did not finish on its facing Idle."
        }
      }
      if (-not $enemyWalkVerified) { throw 'Enemy battle movement never entered the standard Walk animation.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter');window.__RPG_DEBUG__.enterMap('field');window.__RPG_DEBUG__.setEncounterGrace(30);window.__RPG_DEBUG__.startBattle('slime-1');true" | Out-Null
      Start-Sleep -Milliseconds 80
      $fixture = (Invoke-GameExpression -Expression 'JSON.stringify(window.__RPG_DEBUG__.prepareBattleCollision())') | ConvertFrom-Json
      if (-not $fixture) { throw 'Could not prepare the runtime STOP collision fixture.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleConfirm($($fixture.target.x),$($fixture.target.y));window.__RPG_DEBUG__.battleChooseFacing('$($fixture.requestedFacing)');true" | Out-Null
      $collision = $null
      for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
        Start-Sleep -Milliseconds 20
        $collision = Get-GameSnapshot
        if ($collision.battle.phase -eq 'planning_action') { break }
      }
      $stops = @($collision.battle.effects | Where-Object { $_.text -eq 'STOP!' })
      $stoppedEnemy = @($collision.battle.enemies | Where-Object { $_.id -eq $fixture.enemyId })[0]
      if ($collision.battle.phase -ne 'planning_action' -or $stops.Count -lt 2) {
        throw 'Actual simultaneous collision did not finish with STOP feedback for both units.'
      }
      if ($collision.battle.hero.locomotion.state -ne 'idle' -or $collision.battle.hero.facing -ne $fixture.expectedFacing -or $collision.battle.hero.locomotion.facing -ne $fixture.expectedFacing) {
        throw 'STOP did not immediately return the hero to Idle with the last executed facing.'
      }
      if (-not $stoppedEnemy -or $stoppedEnemy.locomotion.state -ne 'idle' -or $stoppedEnemy.locomotion.facing -ne $stoppedEnemy.facing) {
        throw 'STOP did not immediately return the enemy to its resolved facing Idle.'
      }
      Invoke-GameExpression -Expression '(()=>{const menu=document.getElementById("battleActionDock"),handle=menu.querySelector("[data-battle-command-drag-handle]"),stage=document.getElementById("gameStage"),m=menu.getBoundingClientRect(),s=stage.getBoundingClientRect(),id=93;handle.dispatchEvent(new PointerEvent("pointerdown",{pointerId:id,pointerType:"mouse",button:0,clientX:m.left+12,clientY:m.top+8,bubbles:true,cancelable:true}));menu.dispatchEvent(new PointerEvent("pointermove",{pointerId:id,pointerType:"mouse",button:0,clientX:s.right-20,clientY:s.bottom-20,bubbles:true,cancelable:true}));menu.dispatchEvent(new PointerEvent("pointerup",{pointerId:id,pointerType:"mouse",button:0,clientX:s.right-20,clientY:s.bottom-20,bubbles:true,cancelable:true}));return true})()' | Out-Null
      $path = Join-Path $runtimeOutputPath 'locomotion-battle-stop.png'
      $capture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($capture.result.data))
    }
    'fightertree' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); document.getElementById('skillTreeButton').click(); true" | Out-Null
      $fighterTree = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const nodes=[...document.querySelectorAll(".skill-tree-node")];const boxes=nodes.map(n=>n.getBoundingClientRect());const overlap=boxes.some((a,i)=>boxes.some((b,j)=>j>i&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));const byId=new Map(nodes.map(n=>[n.querySelector("[data-facility-action=skill-detail]").dataset.skillId,n]));const edges=new Set([...document.querySelectorAll(".skill-tree-link")].map(n=>`${n.dataset.from}>${n.dataset.to}`));const has=(from,to)=>edges.has(`${from}>${to}`);const root=byId.get("kentotsu"),rapid=byId.get("jinken"),back=byId.get("haiken");return {count:nodes.length,overlap,rootAboveRapid:root?.dataset.treeDepth==="0"&&rapid?.dataset.treeDepth==="1"&&root?.dataset.treeX===rapid?.dataset.treeX&&root?.dataset.treeX!==back?.dataset.treeX,required:[has("sen_no_sen","choudankyaku"),has("tenpoukyaku","choudankyaku"),has("gouhoukyaku","fuujin_kikoukyaku"),has("kikoudan","fuujin_kikoukyaku"),has("rendan","jisa_kentotsu"),!has("kentotsu","jisa_kentotsu"),has("shuukijutsu","shuuki_hijutsu"),has("kikoudan","kikouhou"),has("gekikoudan","kikou_sakuretsudan"),has("byakkorendan","lusedes_tan"),has("gouhoukyaku","lusedes_tan")]};})())') | ConvertFrom-Json
      if ($fighterTree.count -ne 65 -or $fighterTree.overlap -or -not $fighterTree.rootAboveRapid -or $fighterTree.required -contains $false) { throw 'Fighter tree is incomplete, overlapping, incorrectly placed, or has a connector mismatch.' }
      $detailUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const open=(id)=>{document.querySelector(`[data-skill-id="${id}"][data-facility-action="skill-detail"]`).click();const value={title:document.getElementById("skillDetailTitle").textContent,stats:document.getElementById("skillDetailStats").textContent,pattern:document.getElementById("skillDetailRangePattern").textContent};document.getElementById("skillDetailPanel").click();return value;};return {multi:open("rendan"),range:open("fuujin_kikoukyaku"),control:open("houkou"),timed:open("jisa_kentotsu"),areaA:open("shuuki_hijutsu"),areaB:open("kikouhou"),areaC:open("kikou_sakuretsudan")};})())') | ConvertFrom-Json
      if ($detailUi.multi.title -ne '連擊' -or $detailUi.multi.stats -notmatch 'Hit 數／判定2' -or $detailUi.multi.stats -notmatch '總傷害2×') { throw "Multi-hit skill detail did not expose its hit metadata (stats=$($detailUi.multi.stats))." }
      if ($detailUi.range.stats -notmatch '射程 9 格' -or $detailUi.range.stats -notmatch '高低差上 2' -or $detailUi.range.stats -notmatch '下 ∞') { throw "Height/range skill detail did not expose the authored range metadata (stats=$($detailUi.range.stats))." }
      if ($detailUi.control.stats -notmatch '效果妨礙行動') { throw 'Control skill detail did not expose its action interference effect.' }
      if ($detailUi.timed.stats -notmatch '前置連擊' -or $detailUi.timed.stats -match '正拳') { throw '時差正拳 detail exposed an incorrect prerequisite.' }
      if ($detailUi.areaA.stats -notmatch '前置集氣術' -or $detailUi.areaB.stats -notmatch '前置氣功彈' -or $detailUi.areaC.stats -notmatch '前置激氣功彈') { throw 'Area-branch skill details exposed incorrect prerequisites.' }
      Invoke-GameExpression -Expression 'document.querySelector("[data-skill-id=rendan][data-facility-action=skill-detail]").click();true' | Out-Null
      $detailVisible = Invoke-GameExpression -Expression '!document.getElementById("skillDetailPanel").hidden'
      if (-not $detailVisible) { throw 'Skill node did not open its detail dialog.' }
      $fighterTreeDetailScreenshotPath = Join-Path $runtimeOutputPath "fighter-skill-detail-$ViewportWidth.png"
      $detailCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($fighterTreeDetailScreenshotPath, [Convert]::FromBase64String($detailCapture.result.data))
      Invoke-GameExpression -Expression 'document.getElementById("skillDetailPanel").click();true' | Out-Null
      $detailClosed = Invoke-GameExpression -Expression 'document.getElementById("skillDetailPanel").hidden'
      if (-not $detailClosed) { throw 'Skill detail backdrop failed to close.' }
      $fighterTreeBottomScreenshotPath = Join-Path $runtimeOutputPath "fighter-skill-tree-bottom-$ViewportWidth.png"
      Invoke-GameExpression -Expression 'document.querySelector(".facility-content").scrollTop=9999;true' | Out-Null
      Start-Sleep -Milliseconds 100
      $bottomCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($fighterTreeBottomScreenshotPath, [Convert]::FromBase64String($bottomCapture.result.data))
    }
    'entrance' {
      foreach ($approach in @(@(1500,410),@(1435,120),@(1565,120),@(1500,13))) {
        $approachX = $approach[0]; $approachY = $approach[1]
        Invoke-GameExpression -Expression "(()=>{const a=window.__RPG_DEBUG__;a.newGame('fighter');a.setPlayer({level:5});a.enterMap('field');a.setEncounterGrace(30);a.teleport($approachX,$approachY);a.portalTick();if(a.collisionAt($approachX,$approachY))throw Error('Blocked start');const p=a.entityPosition('field-to-dungeon');a.clickMoveTo(p.x,p.y);return true})()" | Out-Null
        for ($attempt=0; $attempt -lt 14; $attempt++) {
          Start-Sleep -Milliseconds 500
          $entranceState=Get-GameSnapshot
          if ($entranceState.currentMapId -eq 'dungeon') { break }
        }
        if ($entranceState.currentMapId -ne 'dungeon') { throw "Entrance approach $approachX,$approachY failed: $($entranceState | ConvertTo-Json -Depth 3 -Compress)" }
      }
      $collisionCheck=Invoke-GameExpression -Expression "(()=>{const a=window.__RPG_DEBUG__;a.enterMap('field');return a.collisionAt(1340,120)&&a.collisionAt(1660,120)&&a.collisionAt(1500,0)&&!a.collisionAt(1500,120)})()"
      if (-not $collisionCheck) { throw 'Entrance forest or map-boundary collision regressed.' }
    }
    'forestmap' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.runScenario('forest'); true" | Out-Null
      Start-Sleep -Milliseconds 240
      $forest = Get-GameSnapshot
      if ($forest.mode -ne 'playing' -or $forest.currentMapId -ne 'field') { throw 'Forest layout preview did not remain on the separate field map.' }
    }
    'dialogue' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.teleportTo('guildmaster-yin'); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      Invoke-GameExpression -Expression "window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE',key:'e',bubbles:true})); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $dialogueSnapshot = Get-GameSnapshot
      if ($dialogueSnapshot.mode -ne 'dialogue') { throw "Touch dialogue did not open: $($dialogueSnapshot.mode)." }
      $dialogueLabelUi = Invoke-GameExpression -Expression 'JSON.stringify({state:document.getElementById("dialogueNext").dataset.dialogueState,label:document.querySelector(".dialogue-next-label").textContent,aria:document.getElementById("dialogueNext").getAttribute("aria-label")})' | ConvertFrom-Json
      if ($dialogueLabelUi.state -ne 'continue' -or $dialogueLabelUi.label -ne '繼續' -or $dialogueLabelUi.aria -ne '繼續對話') { throw "Dialogue continue state was not explicit (state=$($dialogueLabelUi.state), label=$($dialogueLabelUi.label))." }
      $dialoguePortraitUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const panel=document.getElementById("dialoguePanel"),rect=panel.getBoundingClientRect();return {speaker:document.getElementById("speakerName").textContent,hasPortrait:Boolean(document.querySelector(".dialogue-portrait")),panelWidth:rect.width,panelHeight:rect.height,art:window.LanternArt.spriteStatus()};})())') | ConvertFrom-Json
      # Keep this comparison ASCII-only so Windows PowerShell 5.1 does not
      # reinterpret the UTF-8 source literal through the active ANSI codepage.
      $expectedGuildMaster = ([string][char]0x516C) + ([string][char]0x6703) + ([string][char]0x63A5) + ([string][char]0x5F85) + ([string][char]0x54E1)
      if ($dialoguePortraitUi.speaker -ne $expectedGuildMaster) { throw "Expected Guild Master dialogue, got $($dialoguePortraitUi.speaker)." }
      if ($dialoguePortraitUi.hasPortrait) { throw 'Ordinary dialogue unexpectedly rendered a portrait.' }
      foreach ($asset in @(
        @('npcMap', 'assets/npc-map-chibi-v4.png'),
        @('npcPortraits', 'assets/npc-dialogue-portraits-v4.png'),
        @('environment', 'assets/environment-atlas-v5.png'),
        @('terrain', 'assets/terrain-atlas-v1.png'),
        @('interior', 'assets/interior-props-v2.png'),
        @('monstersCore', 'assets/monster-facing-core-v1.png'),
        @('monstersDepths', 'assets/monster-facing-depths-v1.png'),
        @('fighter', 'assets/fighter-atlas-v2.png'),
        @('markers', 'assets/marker-atlas-v1.png'),
        @('heroDown', 'assets/hero-anim-down-v3.png'),
        @('heroUp', 'assets/hero-anim-up-v3.png'),
        @('heroRight', 'assets/hero-anim-right-v3.png')
      )) {
        $status = $dialoguePortraitUi.art.($asset[0])
        if (-not $status.ready -or $status.failed) { throw "Expected $($asset[0]) art to be ready without failure." }
        if ($status.src -ne $asset[1]) { throw "Expected $($asset[0]) source $($asset[1]), got $($status.src)." }
      }
      if ($dialoguePortraitUi.panelWidth -lt 1 -or $dialoguePortraitUi.panelHeight -lt 1 -or $dialoguePortraitUi.panelWidth -gt 820) { throw 'Dialogue panel did not have a bounded content-driven layout.' }
      Invoke-GameExpression -Expression "document.getElementById('dialogueNext').click(); document.getElementById('dialogueNext').click(); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $dialogueTerminalUi = Invoke-GameExpression -Expression 'JSON.stringify({state:document.getElementById("dialogueNext").dataset.dialogueState,label:document.querySelector(".dialogue-next-label").textContent,aria:document.getElementById("dialogueNext").getAttribute("aria-label")})' | ConvertFrom-Json
      if ($dialogueTerminalUi.state -ne 'terminal' -or $dialogueTerminalUi.label -ne '確定' -or $dialogueTerminalUi.aria -ne '確定並關閉對話') { throw "Dialogue terminal state was not explicit (state=$($dialogueTerminalUi.state), label=$($dialogueTerminalUi.label))." }
      $dialogueLongScreenshotPath = Join-Path $runtimeOutputPath "smoke-dialogue-long-$ViewportWidth.png"
      $dialogueLongCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($dialogueLongScreenshotPath, [Convert]::FromBase64String($dialogueLongCapture.result.data))
    }
    'levelup' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.runScenario('combat-levelup'); true" | Out-Null
      Start-Sleep -Milliseconds 600
      $levelUpSnapshot = Get-GameSnapshot
      $levelPanelHidden = Invoke-GameExpression -Expression 'document.getElementById("levelUpPanel").hidden'
      if ($levelUpSnapshot.mode -ne 'playing' -or $levelUpSnapshot.level -lt 2 -or $levelUpSnapshot.pendingLevelUps -ne 0 -or -not $levelPanelHidden) {
        throw "Fixed class growth did not apply directly (mode=$($levelUpSnapshot.mode), level=$($levelUpSnapshot.level), pending=$($levelUpSnapshot.pendingLevelUps))."
      }
    }
    'savelevel' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.runScenario('combat-levelup'); true" | Out-Null
      Start-Sleep -Milliseconds 600
      $levelUpSnapshot = Get-GameSnapshot
      if ($levelUpSnapshot.mode -ne 'playing' -or $levelUpSnapshot.pendingLevelUps -ne 0 -or $levelUpSnapshot.level -lt 2) { throw 'Automatic class growth was not applied before save.' }
      Invoke-GameExpression -Expression 'window.__RPG_DEBUG__.save(); window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.load(); true' | Out-Null
      Start-Sleep -Milliseconds 180
    }
    'resume' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.setPlayer({level:7,xp:31,coins:77}); window.__RPG_DEBUG__.save(); true" | Out-Null
      Invoke-Cdp -Method 'Page.reload' | Out-Null
      Start-Sleep -Milliseconds 180
      $resumeReady = $false
      for ($attempt = 0; $attempt -lt 50 -and -not $resumeReady; $attempt += 1) {
        Start-Sleep -Milliseconds 100
        $resumeReady = [bool](Invoke-GameExpression -Expression 'Boolean(window.__RPG_READY__ && window.__RPG_DEBUG__)')
      }
      if (-not $resumeReady) { throw 'Resume reload did not restore the RPG debug hooks.' }
      $resumeSnapshot = Get-GameSnapshot
      if ($resumeSnapshot.mode -ne 'playing' -or $resumeSnapshot.level -ne 7 -or $resumeSnapshot.coins -ne 77) { throw "Valid save did not auto-resume (mode=$($resumeSnapshot.mode), level=$($resumeSnapshot.level), coins=$($resumeSnapshot.coins))." }
    }
    'battle' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('field'); window.__RPG_DEBUG__.startBattle('slime-1'); true" | Out-Null
      Start-Sleep -Milliseconds 160
      $roundOne = Get-GameSnapshot
      if ($roundOne.mode -ne 'battle' -or $roundOne.battle.sourceId -ne 'slime-1' -or $roundOne.battle.phase -ne 'planning_move' -or $roundOne.battle.round -ne 1 -or $roundOne.battle.ap -ne 10 -or $roundOne.battle.apGain -ne 10 -or $roundOne.battle.apMax -ne 200 -or $roundOne.battle.plans.Count -lt 1) {
        throw "Battle did not begin correctly (phase=$($roundOne.battle.phase), round=$($roundOne.battle.round), ap=$($roundOne.battle.ap), plans=$($roundOne.battle.plans.Count))."
      }
      $introUi = (Invoke-GameExpression -Expression 'JSON.stringify({hudHidden:document.getElementById("battleHud").hidden,introHidden:document.getElementById("battleEncounterIntro").hidden,state:document.getElementById("gameStage").dataset.gameState})') | ConvertFrom-Json
      if ($introUi.hudHidden -or -not $introUi.introHidden -or $introUi.state -ne 'battle') { throw 'Battle did not enter move planning directly with the encounter popup hidden.' }
      $movePhaseControls = (Invoke-GameExpression -Expression 'JSON.stringify({skills:document.querySelectorAll("#battleSkillButtons [data-battle-action^=\"skill:\"]").length,reset:document.querySelectorAll("#battleSkillButtons [data-battle-action=reset-move]").length,pickerHidden:document.getElementById("battleFacingPicker").hidden})') | ConvertFrom-Json
      if ($movePhaseControls.skills -ne 0 -or $movePhaseControls.reset -ne 1 -or -not $movePhaseControls.pickerHidden) { throw 'Move phase leaked skill controls or opened the facing picker before a destination was selected.' }
      $movePhaseControls = (Invoke-GameExpression -Expression 'JSON.stringify({move:!!document.getElementById("battleMoveButton"),skill:!!document.getElementById("battleAttackButton")})') | ConvertFrom-Json
      if (-not $movePhaseControls.move -or $movePhaseControls.skill) { throw 'Move phase mixed movement controls with skill controls.' }
      $battlePanels = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const a=document.getElementById("battleActionDock").getBoundingClientRect(),s=document.getElementById("selectedUnitCard").getBoundingClientRect();return {overlap:!(a.right<=s.left||a.left>=s.right||a.bottom<=s.top||a.top>=s.bottom)};})())') | ConvertFrom-Json
      if ($battlePanels.overlap) { throw 'Battle command dock overlapped the selected-unit status card.' }
      $battleScreenshotPath = Join-Path $runtimeOutputPath "smoke-battle-active-$ViewportWidth.png"
      $battleCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($battleScreenshotPath, [Convert]::FromBase64String($battleCapture.result.data))

      Invoke-GameExpression -Expression "window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowRight',key:'ArrowRight',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',key:'Enter',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup',{code:'Enter',key:'Enter',bubbles:true})); true" | Out-Null
      $routeDraft = Get-GameSnapshot
      if ($routeDraft.battle.phase -ne 'planning_move' -or $routeDraft.battle.moved -or $routeDraft.battle.heroMoveDraft.Count -ne 2 -or -not $routeDraft.battle.awaitingFacing) { throw 'Selecting a route did not wait at the four-way facing choice.' }
      $facingPickerVisible = Invoke-GameExpression -Expression '!document.getElementById("battleFacingPicker").hidden'
      if (-not $facingPickerVisible) { throw 'Four-way facing picker did not appear at the selected destination.' }
      $facingUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const buttons=[...document.querySelectorAll("#battleFacingPicker button")].map(button=>button.getBoundingClientRect()),left=Math.min(...buttons.map(r=>r.left)),right=Math.max(...buttons.map(r=>r.right)),top=Math.min(...buttons.map(r=>r.top)),bottom=Math.max(...buttons.map(r=>r.bottom));return {maxButton:Math.max(...buttons.map(r=>Math.max(r.width,r.height))),spreadWidth:right-left,spreadHeight:bottom-top};})())') | ConvertFrom-Json
      if ($facingUi.maxButton -gt 34 -or $facingUi.spreadWidth -gt 110 -or $facingUi.spreadHeight -gt 110) { throw 'Facing arrows still covered too much of the tactical route.' }
      $facingScreenshotPath = Join-Path $runtimeOutputPath "smoke-battle-facing-$ViewportWidth.png"
      $facingCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($facingScreenshotPath, [Convert]::FromBase64String($facingCapture.result.data))
      Invoke-GameExpression -Expression "document.querySelector('[data-battle-facing=right]').click(); true" | Out-Null
      Start-Sleep -Milliseconds 90
      $moved = Get-GameSnapshot
      if (-not $moved.battle.moved -or $moved.battle.phase -ne 'resolving_move' -or $null -eq $moved.battle.movement -or $null -eq $moved.battle.hero.renderCell -or $moved.battle.movement.finalHeroFacing -ne 'right') {
        throw "Facing choice did not enter visible simultaneous resolution (phase=$($moved.battle.phase), moved=$($moved.battle.moved), facing=$($moved.battle.movement.finalHeroFacing))."
      }
      $plannedMove = $roundOne.battle.plans[0].move

      Start-Sleep -Milliseconds 1050
      $actionPlanning = Get-GameSnapshot
      if ($actionPlanning.battle.phase -ne 'planning_action' -or $actionPlanning.battle.hero.cell.x -ne 2 -or $actionPlanning.battle.hero.cell.y -ne 3 -or $actionPlanning.battle.ap -ne 10) {
        throw "Simultaneous movement did not reach action planning (phase=$($actionPlanning.battle.phase), cell=$($actionPlanning.battle.hero.cell.x),$($actionPlanning.battle.hero.cell.y), ap=$($actionPlanning.battle.ap))."
      }
      $actionPhaseControls = (Invoke-GameExpression -Expression 'JSON.stringify({skills:document.querySelectorAll("#battleSkillButtons [data-battle-action^=\"skill:\"]").length,move:document.querySelectorAll("#battleSkillButtons [data-battle-action=reset-move],#battleSkillButtons [data-battle-action=move]").length,pickerHidden:document.getElementById("battleFacingPicker").hidden})') | ConvertFrom-Json
      if ($actionPhaseControls.skills -lt 1 -or $actionPhaseControls.move -ne 0 -or -not $actionPhaseControls.pickerHidden) { throw 'Action phase did not replace movement controls with skill controls.' }
      $actionPhaseControls = (Invoke-GameExpression -Expression 'JSON.stringify({move:!!document.getElementById("battleMoveButton"),skill:!!document.getElementById("battleAttackButton")})') | ConvertFrom-Json
      if ($actionPhaseControls.move -or -not $actionPhaseControls.skill) { throw 'Action phase still showed movement confirmation or hid learned skills.' }
      $primaryAfterMove = $actionPlanning.battle.enemies | Where-Object { $_.primary } | Select-Object -First 1
      if ($primaryAfterMove.cell.x -ne $plannedMove.x -or $primaryAfterMove.cell.y -ne $plannedMove.y) { throw 'Enemy did not execute its telegraphed move.' }

      Invoke-GameExpression -Expression "document.getElementById('battleEndTurnButton').click(); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $simultaneousActions = Get-GameSnapshot
      if ($simultaneousActions.battle.phase -ne 'resolving_action' -or $simultaneousActions.battle.action.type -ne 'wait' -or $simultaneousActions.battle.action.applied) { throw 'Wait command did not enter a readable simultaneous action wind-up.' }
      if ($simultaneousActions.battle.guard) { throw 'Plain wait incorrectly granted damage reduction.' }
      Start-Sleep -Milliseconds 1100
      $roundTwo = Get-GameSnapshot
      if ($roundTwo.battle.phase -ne 'planning_move' -or $roundTwo.battle.round -ne 2 -or $roundTwo.battle.ap -ne 20) { throw "Round two did not grant and carry 10 AP (phase=$($roundTwo.battle.phase), round=$($roundTwo.battle.round), ap=$($roundTwo.battle.ap))." }

      Invoke-GameExpression -Expression '(()=>{const api=window.__RPG_DEBUG__;api.battleCommitMove();return true})()' | Out-Null
      Start-Sleep -Milliseconds 1050
      $attackSetup = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__,snap=api.snapshot(),enemy=snap.battle.enemies.find(unit=>unit.alive),distance=Math.abs(snap.battle.hero.cell.x-enemy.cell.x)+Math.abs(snap.battle.hero.cell.y-enemy.cell.y);if(snap.battle.phase!=="planning_action")return {error:`phase ${snap.battle.phase}`,enemy};if(distance<1||distance>5)return {error:"enemy outside starter skill range",enemy,hero:snap.battle.hero};api.weakenBattleEnemies(1);return {enemy,buttonId:distance===1?"battleAttackButton":"battleLanternButton",skillId:distance===1?"quick_slash":"lantern_shot"};})())') | ConvertFrom-Json
      if ($attackSetup.error) { throw "Could not set up a real learned-skill attack: $($attackSetup.error)." }
      Invoke-GameExpression -Expression "document.getElementById('$($attackSetup.buttonId)').click(); true" | Out-Null
      $targetX = [int]$attackSetup.enemy.cell.x
      $targetY = [int]$attackSetup.enemy.cell.y
      Invoke-GameExpression -Expression "(()=>{const c=document.getElementById('gameCanvas');const r=c.getBoundingClientRect();const w=r.width,h=r.height;const top=w<=530?150:72;const reserved=w<=530?300:w<=1120?245:210;const available=Math.max(238,h-top-reserved);const cell=Math.floor(Math.max(30,Math.min(72,Math.min((w-34)/9,available/7))));const gx=Math.round((w-cell*9)/2),gy=Math.round(top+Math.max(0,(available-cell*7)/2));c.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+gx+($targetX+.5)*cell,clientY:r.top+gy+($targetY+.5)*cell,pointerId:77,bubbles:true,cancelable:true}));return true})()" | Out-Null
      Start-Sleep -Milliseconds 120
      $skillWindup = Get-GameSnapshot
      if ($skillWindup.battle.phase -ne 'resolving_action' -or $skillWindup.battle.action.type -ne 'skill' -or $skillWindup.battle.action.skillId -ne $attackSetup.skillId -or $skillWindup.battle.action.applied) { throw 'Learned skill did not enter the simultaneous action wind-up.' }
      $battleMidSnapshot = $null
      for ($attempt = 0; $attempt -lt 50; $attempt += 1) {
        Start-Sleep -Milliseconds 50
        $battleMidSnapshot = Get-GameSnapshot
        if ($battleMidSnapshot.battle.phase -eq 'victory') { break }
      }
      if ($battleMidSnapshot.battle.phase -ne 'victory') { throw "Canvas target click did not win the battle: $($battleMidSnapshot.battle.phase)." }
      Start-Sleep -Milliseconds 820
    }
    'mountain-art' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); window.__RPG_DEBUG__.enterMap('field'); window.__RPG_DEBUG__.startBattle('slime-1'); true" | Out-Null
      Start-Sleep -Milliseconds 180
      $mountainRound = Get-GameSnapshot
      if ($mountainRound.mode -ne 'battle' -or $mountainRound.battle.phase -ne 'planning_move' -or $mountainRound.battle.battlefield.theme -ne 'mountain') {
        throw "Mountain battlefield did not initialize (mode=$($mountainRound.mode), phase=$($mountainRound.battle.phase), theme=$($mountainRound.battle.battlefield.theme))."
      }
      $mountainUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const menu=document.getElementById("battleActionDock"),stage=document.getElementById("gameStage"),m=menu.getBoundingClientRect(),s=stage.getBoundingClientRect(),art=window.LanternArt.spriteStatus();return {following:menu.dataset.following,width:m.width,height:m.height,inside:m.left>=s.left&&m.top>=s.top&&m.right<=s.right&&m.bottom<=s.bottom,ground:art.battleMountainGround.src,groundReady:art.battleMountainGround.ready};})())') | ConvertFrom-Json
      if ($mountainUi.following -ne 'true' -or -not $mountainUi.inside -or $mountainUi.width -gt 360 -or -not $mountainUi.groundReady -or $mountainUi.ground -ne 'assets/battle/mountain/mountain-battle-ground-v3.png') {
        throw "Mountain command menu or ground asset did not initialize correctly (following=$($mountainUi.following), inside=$($mountainUi.inside), width=$($mountainUi.width), ground=$($mountainUi.ground), ready=$($mountainUi.groundReady))."
      }
      $dragResult = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const menu=document.getElementById("battleActionDock"),handle=menu.querySelector("[data-battle-command-drag-handle]"),stage=document.getElementById("gameStage"),before=menu.getBoundingClientRect(),s=stage.getBoundingClientRect(),id=91;handle.dispatchEvent(new PointerEvent("pointerdown",{pointerId:id,pointerType:"touch",button:0,clientX:before.left+12,clientY:before.top+8,bubbles:true,cancelable:true}));menu.dispatchEvent(new PointerEvent("pointermove",{pointerId:id,pointerType:"touch",button:0,clientX:s.right+300,clientY:s.bottom+300,bubbles:true,cancelable:true}));menu.dispatchEvent(new PointerEvent("pointerup",{pointerId:id,pointerType:"touch",button:0,clientX:s.right+300,clientY:s.bottom+300,bubbles:true,cancelable:true}));const after=menu.getBoundingClientRect();return {following:menu.dataset.following,moved:Math.abs(after.left-before.left)>20||Math.abs(after.top-before.top)>20,inside:after.left>=s.left&&after.top>=s.top&&after.right<=s.right+1&&after.bottom<=s.bottom+1};})())') | ConvertFrom-Json
      if ($dragResult.following -ne 'false' -or -not $dragResult.moved -or -not $dragResult.inside) { throw 'Pointer dragging did not detach and clamp the battle command menu inside the viewport.' }
      Invoke-GameExpression -Expression 'document.getElementById("battleCommandFollowButton").click();true' | Out-Null
      $followed = (Invoke-GameExpression -Expression 'document.getElementById("battleActionDock").dataset.following')
      if ($followed -ne 'true') { throw 'Battle command follow/reset control did not reattach the menu to the hero.' }
      $mountainScreenshotPath = Join-Path $runtimeOutputPath "mountain-battle-normal-$ViewportWidth.png"
      $mountainCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($mountainScreenshotPath, [Convert]::FromBase64String($mountainCapture.result.data))
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleCommitMove(); true" | Out-Null
      $mountainMove = $null
      for ($attempt = 0; $attempt -lt 50; $attempt += 1) {
        Start-Sleep -Milliseconds 50
        $mountainMove = Get-GameSnapshot
        if ($mountainMove.battle.phase -eq 'planning_action') { break }
      }
      if ($mountainMove.battle.phase -ne 'planning_action') { throw "Mountain movement did not reach action planning (phase=$($mountainMove.battle.phase))." }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleAction('skill:straight_punch'); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $mountainAttack = Get-GameSnapshot
      if ($mountainAttack.battle.phase -ne 'planning_action' -or $mountainAttack.battle.selectedAction -ne 'skill:straight_punch') {
        throw "Mountain attack preview did not initialize (phase=$($mountainAttack.battle.phase), action=$($mountainAttack.battle.selectedAction))."
      }
      $mountainAttackScreenshotPath = Join-Path $runtimeOutputPath "mountain-battle-attack-preview-$ViewportWidth.png"
      $mountainAttackCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($mountainAttackScreenshotPath, [Convert]::FromBase64String($mountainAttackCapture.result.data))
      foreach ($visualCase in @(
        @{ id = 'wisp-1'; label = 'chick' },
        @{ id = 'hound-1'; label = 'wild-boar' }
      )) {
        $visualSetup = (Invoke-GameExpression -Expression "JSON.stringify((()=>{const api=window.__RPG_DEBUG__;api.newGame('fighter');api.enterMap('field');if(!api.startBattle('$($visualCase.id)'))return {error:'battle start failed'};const fixture=api.prepareBattleVisualActions();if(!fixture)return {error:'visual action fixture failed'};const menu=document.getElementById('battleActionDock'),handle=menu.querySelector('[data-battle-command-drag-handle]'),stage=document.getElementById('gameStage'),m=menu.getBoundingClientRect(),s=stage.getBoundingClientRect(),id=92;handle.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,pointerType:'mouse',button:0,clientX:m.left+12,clientY:m.top+8,bubbles:true,cancelable:true}));menu.dispatchEvent(new PointerEvent('pointermove',{pointerId:id,pointerType:'mouse',button:0,clientX:s.right-20,clientY:s.bottom-20,bubbles:true,cancelable:true}));menu.dispatchEvent(new PointerEvent('pointerup',{pointerId:id,pointerType:'mouse',button:0,clientX:s.right-20,clientY:s.bottom-20,bubbles:true,cancelable:true}));const snap=api.snapshot();return {...fixture,heroHp:snap.battle.hero.hp,enemyHp:snap.battle.enemies.find(unit=>unit.id===fixture.enemyId).hp,heroAnchor:api.battleUnitAnchor('hero'),enemyAnchor:api.battleUnitAnchor(fixture.enemyId)};})())") | ConvertFrom-Json
        if ($visualSetup.error) { throw "Could not initialize $($visualCase.label) visual action QA: $($visualSetup.error)." }
        if ($visualSetup.heroAnchor.nameX -ne $visualSetup.heroAnchor.cellCentreX -or $visualSetup.heroAnchor.hpCentreX -ne $visualSetup.heroAnchor.cellCentreX -or $visualSetup.enemyAnchor.nameX -ne $visualSetup.enemyAnchor.cellCentreX -or $visualSetup.enemyAnchor.hpCentreX -ne $visualSetup.enemyAnchor.cellCentreX) {
          throw "$($visualCase.label) name or HP anchor was not centered on its battle cell."
        }
        Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleAction('skill:straight_punch');window.__RPG_DEBUG__.battleConfirm($($visualSetup.enemyCell.x),$($visualSetup.enemyCell.y));true" | Out-Null
        Start-Sleep -Milliseconds 140
        $visualWindup = Get-GameSnapshot
        $windupAnchors = (Invoke-GameExpression -Expression "JSON.stringify({hero:window.__RPG_DEBUG__.battleUnitAnchor('hero'),enemy:window.__RPG_DEBUG__.battleUnitAnchor('$($visualSetup.enemyId)')})") | ConvertFrom-Json
        if ($visualWindup.battle.phase -ne 'resolving_action' -or $visualWindup.battle.action.applied -or $visualWindup.battle.action.actionOrder.actorId -notcontains $visualSetup.enemyId) {
          throw "$($visualCase.label) did not visibly enter simultaneous hero/monster attack wind-up."
        }
        if ($windupAnchors.hero.nameX -ne $visualSetup.heroAnchor.nameX -or $windupAnchors.hero.nameY -ne $visualSetup.heroAnchor.nameY -or $windupAnchors.hero.hpY -ne $visualSetup.heroAnchor.hpY -or $windupAnchors.enemy.nameX -ne $visualSetup.enemyAnchor.nameX -or $windupAnchors.enemy.nameY -ne $visualSetup.enemyAnchor.nameY -or $windupAnchors.enemy.hpY -ne $visualSetup.enemyAnchor.hpY) {
          throw "$($visualCase.label) battle labels drifted during attack wind-up."
        }
        $visualAttackPath = Join-Path $runtimeOutputPath "mountain-battle-$($visualCase.label)-attack-$ViewportWidth.png"
        $visualAttackCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
        [IO.File]::WriteAllBytes($visualAttackPath, [Convert]::FromBase64String($visualAttackCapture.result.data))
        Start-Sleep -Milliseconds 1180
        $visualImpact = Get-GameSnapshot
        $impactEnemy = @($visualImpact.battle.enemies | Where-Object { $_.id -eq $visualSetup.enemyId })[0]
        if ($visualImpact.battle.hero.hp -ge $visualSetup.heroHp -or $impactEnemy.hp -ge $visualSetup.enemyHp) {
          throw "$($visualCase.label) simultaneous action did not apply both hero and monster damage (hero=$($visualSetup.heroHp)->$($visualImpact.battle.hero.hp), enemy=$($visualSetup.enemyHp)->$($impactEnemy.hp))."
        }
        $reactionReady = Invoke-GameExpression -Expression "window.__RPG_DEBUG__.setBattleVisualReaction('hero','hurt')&&window.__RPG_DEBUG__.setBattleVisualReaction('$($visualSetup.enemyId)','hurt')"
        if (-not $reactionReady) { throw "$($visualCase.label) hurt reaction could not be replayed for visual QA." }
        $impactAnchors = (Invoke-GameExpression -Expression "JSON.stringify({hero:window.__RPG_DEBUG__.battleUnitAnchor('hero'),enemy:window.__RPG_DEBUG__.battleUnitAnchor('$($visualSetup.enemyId)')})") | ConvertFrom-Json
        if ($impactAnchors.hero.nameX -ne $impactAnchors.hero.cellCentreX -or $impactAnchors.hero.hpCentreX -ne $impactAnchors.hero.cellCentreX -or ($impactAnchors.hero.nameY - $impactAnchors.hero.cellCentreY) -ne ($visualSetup.heroAnchor.nameY - $visualSetup.heroAnchor.cellCentreY) -or ($impactAnchors.hero.hpY - $impactAnchors.hero.cellCentreY) -ne ($visualSetup.heroAnchor.hpY - $visualSetup.heroAnchor.cellCentreY) -or $impactAnchors.enemy.nameX -ne $impactAnchors.enemy.cellCentreX -or $impactAnchors.enemy.hpCentreX -ne $impactAnchors.enemy.cellCentreX -or ($impactAnchors.enemy.nameY - $impactAnchors.enemy.cellCentreY) -ne ($visualSetup.enemyAnchor.nameY - $visualSetup.enemyAnchor.cellCentreY) -or ($impactAnchors.enemy.hpY - $impactAnchors.enemy.cellCentreY) -ne ($visualSetup.enemyAnchor.hpY - $visualSetup.enemyAnchor.cellCentreY)) {
          throw "$($visualCase.label) name or HP anchors did not stay cell-relative during hurt reactions."
        }
        $visualHurtPath = Join-Path $runtimeOutputPath "mountain-battle-$($visualCase.label)-hurt-$ViewportWidth.png"
        $visualHurtCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
        [IO.File]::WriteAllBytes($visualHurtPath, [Convert]::FromBase64String($visualHurtCapture.result.data))
      }
    }
    'mountain-recipient' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.interactWith('guild-request-board'); window.__RPG_DEBUG__.acceptOffer('guild_delivery_mountain_2star'); window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.enterMap('field'); window.__RPG_DEBUG__.setEncounterGrace(30); const target=window.__RPG_DEBUG__.entityPosition('mountain_delivery_recipient'); window.__RPG_DEBUG__.teleport(target.x-42,target.y); window.__RPG_DEBUG__.interactWith('mountain_delivery_recipient'); true" | Out-Null
      Start-Sleep -Milliseconds 260
      $mountainRecipient = Get-GameSnapshot
      $recipientUi = (Invoke-GameExpression -Expression 'JSON.stringify({mode:window.__RPG_DEBUG__.snapshot().mode,map:window.__RPG_DEBUG__.snapshot().currentMapId,dialogueHidden:document.getElementById("dialoguePanel").hidden,hasPortrait:Boolean(document.querySelector(".dialogue-portrait")),speaker:document.getElementById("speakerName").textContent,target:window.__RPG_DEBUG__.entityPosition("mountain_delivery_recipient")})') | ConvertFrom-Json
      if ($mountainRecipient.currentMapId -ne 'field' -or $recipientUi.mode -ne 'dialogue' -or $recipientUi.dialogueHidden -or $recipientUi.hasPortrait -or $recipientUi.speaker -ne '山地收件員' -or $null -eq $recipientUi.target) { throw "Mountain recipient dialogue preview failed (mode=$($recipientUi.mode), map=$($recipientUi.map), portrait=$($recipientUi.hasPortrait), speaker=$($recipientUi.speaker))." }
    }
    'skillbattle' {
      Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.newGame();api.enterMap('field');api.setSkillLoadout(['gale_step','starfall_array','dragon_crescent','thunder_pillar','oathbreaker','aurora_sanctuary']);api.startBattle('slime-4');api.battleAction('start');api.setBattleAp(200);return true})()" | Out-Null
      Start-Sleep -Milliseconds 120
      $skillRoundOne = Get-GameSnapshot
      if ($skillRoundOne.battle.phase -ne 'planning_move' -or $skillRoundOne.battle.ap -ne 200 -or $skillRoundOne.skills.equippedSkillIds.Count -ne 6) { throw "High-tier skill battle did not initialize (phase=$($skillRoundOne.battle.phase), ap=$($skillRoundOne.battle.ap), equipped=$($skillRoundOne.skills.equippedSkillIds -join ','))." }
      Invoke-GameExpression -Expression '(()=>{const api=window.__RPG_DEBUG__;api.battleCommitMove();return true})()' | Out-Null
      Start-Sleep -Milliseconds 1150
      $galeSetup = Get-GameSnapshot
      if ($galeSetup.battle.phase -ne 'planning_action') { throw 'Skill battle did not finish synchronized movement.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleAction('skill:gale_step'); true" | Out-Null
      Start-Sleep -Milliseconds 1220
      $boostedRound = Get-GameSnapshot
      if ($boostedRound.battle.phase -ne 'planning_move' -or $boostedRound.battle.round -ne 2 -or $boostedRound.battle.hero.moveRange -ne 5 -or $boostedRound.battle.ap -ne 200) { throw 'Gale Step did not spend AP and grant next-round movement before the +10/cap refresh.' }
      Invoke-GameExpression -Expression '(()=>{const api=window.__RPG_DEBUG__;api.battleCommitMove();return true})()' | Out-Null
      Start-Sleep -Milliseconds 1150
      $areaSetup = Get-GameSnapshot
      if ($areaSetup.battle.phase -ne 'planning_action') { throw 'Second synchronized movement did not reach skill planning.' }
      $areaAim = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__,s=api.snapshot(),skill=window.LanternSkills.getSkill("starfall_array"),hero=s.battle.hero.cell,enemies=s.battle.enemies.filter(e=>e.alive);let best=null;for(let y=0;y<7;y++)for(let x=0;x<9;x++){const cell={x,y};if(!window.LanternSkills.isTargetInRange(skill,hero,cell))continue;const cells=window.LanternSkills.patternCells(skill,hero,cell,{grid:{width:9,height:7}});const hits=enemies.filter(e=>cells.some(c=>c.x===e.cell.x&&c.y===e.cell.y)).length;if(!best||hits>best.hits)best={cell,hits};}if(!best||best.hits<1)return {error:"no starfall target"};api.weakenBattleEnemies(1);api.battleAction("skill:starfall_array");api.battleConfirm(best.cell.x,best.cell.y);return best;})())') | ConvertFrom-Json
      if ($areaAim.error) { throw $areaAim.error }
      Start-Sleep -Milliseconds 520
      $areaResolved = Get-GameSnapshot
      $defeatedByArea = @($areaResolved.battle.enemies | Where-Object { -not $_.alive }).Count
      if ($areaResolved.battle.phase -ne 'resolving_action' -or $areaResolved.battle.action.skillId -ne 'starfall_array' -or $areaResolved.battle.ap -ne 170 -or $defeatedByArea -lt 1) { throw 'Three-star area skill did not spend 30 AP or damage its previewed footprint.' }
    }
    'guildmap' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.teleportTo('guildmaster-yin'); true" | Out-Null
      Start-Sleep -Milliseconds 160
      $guildMap = Get-GameSnapshot
      if ($guildMap.mode -ne 'playing' -or $guildMap.currentMapId -ne 'guild') { throw 'Guild map did not remain visible.' }
    }
    'shopmap' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('shop'); window.__RPG_DEBUG__.teleportTo('merchant-gin'); true" | Out-Null
      Start-Sleep -Milliseconds 160
      $shopMap = Get-GameSnapshot
      if ($shopMap.mode -ne 'playing' -or $shopMap.currentMapId -ne 'shop') { throw 'Shop map did not remain visible.' }
    }
    'dungeonmap' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.setPlayer({level:8,pendingLevelUps:0}); window.__RPG_DEBUG__.enterMap('dungeon'); true" | Out-Null
      Start-Sleep -Milliseconds 160
      $dungeonMap = Get-GameSnapshot
      if ($dungeonMap.mode -ne 'playing' -or $dungeonMap.currentMapId -ne 'dungeon') { throw 'Dungeon map did not remain visible.' }
    }
    'guildview' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.interactWith('guild-request-board'); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $guildView = Get-GameSnapshot
      if ($guildView.mode -ne 'facility' -or $guildView.currentMapId -ne 'guild') { throw 'Guild view did not open.' }
      $guildChrome = (Invoke-GameExpression -Expression 'JSON.stringify({tabs:!!document.getElementById("facilityTabs"),summary:!!document.getElementById("facilitySummary"),cards:document.querySelectorAll("[data-facility-action=accept],[data-facility-action=claim]").length})') | ConvertFrom-Json
      if ($guildChrome.tabs -or $guildChrome.summary -or $guildChrome.cards -lt 1) { throw 'Guild modal retained redundant summary/tabs or failed to render its focused content.' }
    }
    'shopview' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.setPlayer({level:7,coins:999,pendingLevelUps:0}); window.__RPG_DEBUG__.enterMap('shop'); window.__RPG_DEBUG__.openFacility('shop'); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $shopView = Get-GameSnapshot
      if ($shopView.mode -ne 'facility' -or $shopView.currentMapId -ne 'shop') { throw 'Shop view did not open.' }
      $shopChrome = (Invoke-GameExpression -Expression 'JSON.stringify({tabs:!!document.getElementById("facilityTabs"),summary:!!document.getElementById("facilitySummary"),cards:document.querySelectorAll(".equipment-card").length})') | ConvertFrom-Json
      if ($shopChrome.tabs -or $shopChrome.summary -or $shopChrome.cards -lt 1) { throw 'Shop modal retained redundant summary/tabs or failed to render its focused content.' }
    }
    'skills' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.openFacility('skills'); true" | Out-Null
      Start-Sleep -Milliseconds 140
      $skillUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const tiers=[...document.querySelectorAll(".skill-tree-column")].map(node=>node.getBoundingClientRect().top);return {snapshot:window.__RPG_DEBUG__.snapshot(),cards:document.querySelectorAll(".skill-tree-node").length,title:document.getElementById("facilityTitle").textContent,tabs:!!document.getElementById("facilityTabs"),summary:!!document.getElementById("facilitySummary"),vertical:tiers.every((top,index)=>index===0||top>tiers[index-1])};})())') | ConvertFrom-Json
      if ($skillUi.snapshot.mode -ne 'facility' -or $skillUi.cards -ne 16 -or $skillUi.tabs -or $skillUi.summary -or -not $skillUi.vertical) { throw 'Portable skill tree failed to render every warrior node in downward tiers without redundant modal rows.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.grantSkillBook(1); window.__RPG_DEBUG__.grantSkillBook(2); window.__RPG_DEBUG__.grantSkillBook(3); true" | Out-Null
      $granted = Get-GameSnapshot
      if ($granted.skills.books.'1' -ne 1 -or $granted.skills.books.'2' -ne 1 -or $granted.skills.books.'3' -ne 1) { throw 'Skill books were not added to inventory.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.facilityTab('bag'); true" | Out-Null
      $inventoryUi = (Invoke-GameExpression -Expression 'JSON.stringify({books:document.querySelectorAll("[data-item-id^=skill_book]").length,badge:document.getElementById("inventoryBookBadge").textContent,badgeHidden:document.getElementById("inventoryBookBadge").hidden,potions:document.querySelectorAll("[data-facility-action=use-potion]").length,cards:document.querySelectorAll(".inventory-grid-item").length,icons:document.querySelectorAll(".inventory-grid-item .atlas-icon").length,bodyFont:parseFloat(getComputedStyle(document.querySelector(".inventory-item-copy strong")).fontSize),titleFont:parseFloat(getComputedStyle(document.getElementById("facilityTitle")).fontSize)})') | ConvertFrom-Json
      if ($inventoryUi.books -ne 3 -or $inventoryUi.badge -ne '3' -or $inventoryUi.badgeHidden -or $inventoryUi.potions -ne 0 -or $inventoryUi.cards -lt 4 -or $inventoryUi.icons -ne $inventoryUi.cards) { throw 'Inventory did not expose a complete icon grid for potions and three book tiers.' }
      if ($inventoryUi.bodyFont -lt 11 -or $inventoryUi.titleFont -gt 35 -or $inventoryUi.titleFont / $inventoryUi.bodyFont -gt 2.8) { throw 'Facility title and inventory typography remained disproportionate.' }
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=select-item][data-item-id=skill_book_1]').click(); true" | Out-Null
      $selectedInventoryUi = (Invoke-GameExpression -Expression 'JSON.stringify({detail:!!document.querySelector(".inventory-selected-detail"),action:!!document.querySelector(".inventory-selected-detail [data-facility-action=open-book]"),description:document.querySelector(".inventory-selected-detail p")?.textContent||""})') | ConvertFrom-Json
      if (-not $selectedInventoryUi.detail -or -not $selectedInventoryUi.action -or -not $selectedInventoryUi.description) { throw 'Inventory selection did not reveal the item detail and its contextual action.' }
      $inventoryScreenshotPath = Join-Path $runtimeOutputPath "smoke-inventory-grid-$ViewportWidth.png"
      $inventoryCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($inventoryScreenshotPath, [Convert]::FromBase64String($inventoryCapture.result.data))
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.openSkillBook(1); window.__RPG_DEBUG__.openSkillBook(2); window.__RPG_DEBUG__.openSkillBook(3); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $opened = Get-GameSnapshot
      $manualUi = (Invoke-GameExpression -Expression 'JSON.stringify({manuals:Object.values(window.__RPG_DEBUG__.snapshot().skills.manualCounts).reduce((sum,value)=>sum+value,0),badge:document.getElementById("inventoryBookBadge").textContent,badgeHidden:document.getElementById("inventoryBookBadge").hidden})') | ConvertFrom-Json
      if ($opened.skills.drawSerial -ne 3 -or $opened.skills.books.'1' -ne 0 -or $opened.skills.books.'2' -ne 0 -or $opened.skills.books.'3' -ne 0 -or $opened.skills.unlockedSkillIds.Count -ne 3 -or $opened.skills.equippedSkillIds.Count -gt 3 -or $manualUi.manuals -ne 3) { throw 'Opening one-to-three-star books did not create three named manuals without auto-learning.' }
      if ($manualUi.badgeHidden -or $manualUi.badge -ne '3') { throw 'Named skill manuals disappeared from the inventory badge.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.facilityTab('equipment'); true" | Out-Null
      $equipmentUi = (Invoke-GameExpression -Expression 'JSON.stringify({slots:document.querySelectorAll("[data-paperdoll-slot]").length,cards:document.querySelectorAll(".gear-collection-item").length,title:document.getElementById("facilityTitle").textContent})') | ConvertFrom-Json
      if ($equipmentUi.slots -ne 7 -or $equipmentUi.cards -lt 2) { throw 'Equipment inventory did not render the seven-slot paper doll and owned gear.' }
      $equipmentScreenshotPath = Join-Path $runtimeOutputPath "smoke-equipment-paperdoll-$ViewportWidth.png"
      $equipmentCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($equipmentScreenshotPath, [Convert]::FromBase64String($equipmentCapture.result.data))
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.save(); window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.load(); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $skillLoaded = Get-GameSnapshot
      if ($skillLoaded.skills.drawSerial -ne 3 -or $skillLoaded.skills.unlockedSkillIds.Count -ne $opened.skills.unlockedSkillIds.Count) { throw 'Learned skills did not survive save/load.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.openFacility('skills'); true" | Out-Null
      Start-Sleep -Milliseconds 100
    }
    'portal' {
      $townGuildDoor = Invoke-GameExpression -Expression 'JSON.stringify(window.__RPG_DEBUG__.entityPosition("world-to-guild"))' | ConvertFrom-Json
      Invoke-GameExpression -Expression '(()=>{const api=window.__RPG_DEBUG__;api.newGame();api.clickPortal("world-to-guild");return true;})()' | Out-Null
      for ($attempt = 0; $attempt -lt 15; $attempt++) {
        Start-Sleep -Milliseconds 1000
        $entered = Get-GameSnapshot
        if ($entered.currentMapId -eq 'guild') { break }
      }
      if ($entered.currentMapId -ne 'guild' -or $entered.mode -ne 'playing') { throw "Clicking a path to the guild door did not enter the guild (door=$($townGuildDoor.x),$($townGuildDoor.y), map=$($entered.currentMapId), mode=$($entered.mode), x=$($entered.x), y=$($entered.y), remaining=$($entered.explorePath.remaining), autoReady=$($entered.automaticPortalReady))." }
      Start-Sleep -Milliseconds 350
      $stable = Get-GameSnapshot
      if ($stable.currentMapId -ne 'guild') { throw 'Portal arrival immediately bounced the player back.' }
      Invoke-GameExpression -Expression '(()=>{const api=window.__RPG_DEBUG__;api.clickPortal("guild-to-world");return true;})()' | Out-Null
      Start-Sleep -Milliseconds 900
      $returned = Get-GameSnapshot
      if ($returned.currentMapId -ne 'world') { throw 'Clicking the return door did not return to the world.' }
      Invoke-GameExpression -Expression '(()=>{const api=window.__RPG_DEBUG__;api.enterMap("field");const door=api.entityPosition("field-to-dungeon");api.teleport(door.x,door.y+50);api.clickMoveTo(door.x,door.y);return true;})()' | Out-Null
      Start-Sleep -Milliseconds 520
      $dungeonWarning = Get-GameSnapshot
      if ($dungeonWarning.mode -ne 'dialogue' -or $dungeonWarning.currentMapId -ne 'field') { throw 'Automatic dungeon portal did not preserve its under-level warning choice.' }
    }
    'guild-abandon' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.interactWith('guild-request-board'); window.__RPG_DEBUG__.acceptOffer('guild_hunt_coyote_3star'); window.__RPG_DEBUG__.closeFacility(); for(let i=1;i<=2;i++)window.__RPG_DEBUG__.recordGuildKill('coyote','abandon-coyote:'+i); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.openFacility('guild'); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $activeUi = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),buttons:document.querySelectorAll("[data-facility-action=abandon]").length,contractId:document.querySelector("[data-facility-action=abandon]")?.dataset.contractId})') | ConvertFrom-Json
      if ($activeUi.snapshot.guildCommission.status -ne 'active' -or $activeUi.snapshot.guildCommission.progress -ne 2 -or $activeUi.buttons -ne 1 -or $activeUi.contractId -ne "0:guild_hunt_coyote_3star") { throw 'Active commission card did not expose the cycle-safe abandon action.' }
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=abandon]').click(); true" | Out-Null
      $confirmUi = (Invoke-GameExpression -Expression 'JSON.stringify({hidden:document.getElementById("abandonCommissionPanel").hidden,title:document.getElementById("abandonCommissionTitle").textContent,description:document.getElementById("abandonCommissionDescription").textContent})') | ConvertFrom-Json
      if ($confirmUi.hidden -or -not $confirmUi.title.Contains('郊狼討伐') -or -not $confirmUi.description.Contains('2 / 5')) { throw 'Abandon confirmation modal did not describe the active commission progress.' }
      $abandonScreenshotPath = Join-Path $runtimeOutputPath "smoke-guild-abandon-modal-$ViewportWidth.png"
      $abandonCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($abandonScreenshotPath, [Convert]::FromBase64String($abandonCapture.result.data))
      Invoke-GameExpression -Expression "document.getElementById('abandonCommissionCancelButton').click(); true" | Out-Null
      $cancelled = Get-GameSnapshot
      if (-not (Invoke-GameExpression -Expression 'document.getElementById("abandonCommissionPanel").hidden') -or $cancelled.guildCommission.status -ne 'active' -or $cancelled.guildCommission.progress -ne 2) { throw 'Cancelling abandon confirmation changed the commission state.' }
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=abandon]').click(); document.getElementById('abandonCommissionConfirmButton').click(); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $abandoned = Get-GameSnapshot
      if ($abandoned.guildCommission.status -ne 'available' -or $abandoned.guildCommission.activeCommissionId -ne $null -or $abandoned.guildCommission.progress -ne 0 -or $abandoned.guildCommission.cycle -ne 1 -or $abandoned.guildCommission.envelopes.'3' -ne 0) { throw 'Confirming abandon did not clear progress without granting a reward.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.acceptOffer('guild_hunt_coyote_3star'); window.__RPG_DEBUG__.closeFacility(); for(let i=1;i<=5;i++)window.__RPG_DEBUG__.recordGuildKill('coyote','claim-coyote:'+i); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.openFacility('guild'); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $readyUi = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),contractId:document.querySelector("[data-facility-action=claim]")?.dataset.contractId})') | ConvertFrom-Json
      if ($readyUi.snapshot.guildCommission.status -ne 'ready_to_report' -or $readyUi.snapshot.guildCommission.progress -ne 5 -or $readyUi.contractId -ne "1:guild_hunt_coyote_3star") { throw 'Ready commission card did not expose its cycle-safe report action.' }
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=claim]').click(); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $claimedUi = Get-GameSnapshot
      if ($claimedUi.guildCommission.status -ne 'available' -or $claimedUi.guildCommission.envelopes.'3' -ne 1) { throw 'Cycle-safe commission report button did not claim the envelope.' }
    }
    'guild-commission' {
      $commissionIds = @('guild_hunt_chick_1star', 'guild_delivery_mountain_2star', 'guild_hunt_coyote_3star', 'guild_hunt_bear_4star', 'guild_hunt_snake_5star')
      $targets = @('chick', 'mountain_delivery_recipient', 'coyote', 'bear', 'snake')
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.interactWith('guild-request-board'); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $board = (Invoke-GameExpression -Expression 'JSON.stringify({offers:window.__RPG_DEBUG__.offers().map(o=>({id:o.id,star:o.star,type:o.type})),acceptCards:document.querySelectorAll("[data-facility-action=accept]").length,internalIds:document.body.innerText.includes("mountain_delivery_recipient"),title:document.getElementById("facilityTitle").textContent,duplicate:document.querySelectorAll(".facility-content h3").length,permanentRules:document.querySelectorAll(".facility-content .facility-note:not(.is-warning)").length,developerCopy:document.body.innerText.includes("canonical Fighter")})') | ConvertFrom-Json
      if ($board.offers.Count -ne 5 -or $board.acceptCards -ne 5 -or $board.internalIds -or $board.title -ne '公會委託' -or $board.duplicate -ne 0 -or $board.permanentRules -ne 0 -or $board.developerCopy) { throw 'Guild V1 board did not render one clear, player-facing commission identity.' }
      $guildBoardScreenshotPath = Join-Path $runtimeOutputPath "smoke-guild-board-$ViewportWidth.png"
      $guildBoardCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($guildBoardScreenshotPath, [Convert]::FromBase64String($guildBoardCapture.result.data))
      Invoke-GameExpression -Expression "document.getElementById('facilityHelpButton').click(); true" | Out-Null
      Start-Sleep -Milliseconds 100
      $helpUi = (Invoke-GameExpression -Expression 'JSON.stringify({hidden:document.getElementById("facilityHelpPopover").hidden,text:document.getElementById("facilityHelpText").textContent})') | ConvertFrom-Json
      if ($helpUi.hidden -or -not $helpUi.text.Contains('一份委託') -or -not $helpUi.text.Contains('返公會回報') -or -not $helpUi.text.Contains('重複接受')) { throw 'Guild info popover did not expose the commission rules.' }
      $guildHelpScreenshotPath = Join-Path $runtimeOutputPath "smoke-guild-help-$ViewportWidth.png"
      $guildHelpCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($guildHelpScreenshotPath, [Convert]::FromBase64String($guildHelpCapture.result.data))
      Invoke-GameExpression -Expression "document.getElementById('facilityHelpButton').click(); true" | Out-Null

      for ($index = 0; $index -lt $commissionIds.Count; $index += 1) {
        $commissionId = $commissionIds[$index]
        $targetId = $targets[$index]
        $star = $index + 1
        if ($index -eq 0) {
          Invoke-GameExpression -Expression "window.__RPG_DEBUG__.acceptOffer('$commissionId'); true" | Out-Null
          Start-Sleep -Milliseconds 100
          $activeCardUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const card=document.querySelector(".guild-commission-card"),rect=card?.getBoundingClientRect(),buttons=[...document.querySelectorAll(".guild-commission-card .facility-action-button")],buttonRects=buttons.map(button=>button.getBoundingClientRect());return {card:Boolean(card),status:card?.querySelector(".facility-chip")?.textContent||"",name:card?.querySelector(".facility-card-heading strong")?.textContent||"",objective:card?.querySelector("[data-field=objective]")?.textContent||"",fields:card?.querySelectorAll(".guild-commission-details dt").length||0,progress:Boolean(card?.querySelector(".contract-progress")),reward:Boolean([...card?.querySelectorAll("dt")||[]].find(node=>node.textContent==="獎勵")),actionInside:Boolean(rect&&buttonRects.every(buttonRect=>buttonRect.left>=rect.left&&buttonRect.right<=rect.right&&buttonRect.top>=rect.top&&buttonRect.bottom<=rect.bottom)),buttonCount:buttons.length,developerCopy:card?.textContent.includes("canonical Fighter")||false};})())') | ConvertFrom-Json
          if (-not $activeCardUi.card -or $activeCardUi.status -ne '進行中' -or -not $activeCardUi.name.Contains('山雀仔討伐') -or -not $activeCardUi.objective.Contains('山雀') -or $activeCardUi.fields -ne 4 -or -not $activeCardUi.progress -or -not $activeCardUi.reward -or -not $activeCardUi.actionInside -or $activeCardUi.buttonCount -ne 2 -or $activeCardUi.developerCopy) { throw "Accepted Guild commission card did not keep its summary, fields and actions contained: $($activeCardUi | ConvertTo-Json -Compress)" }
          $guildActiveScreenshotPath = Join-Path $runtimeOutputPath "smoke-guild-active-$ViewportWidth.png"
          $guildActiveCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
          [IO.File]::WriteAllBytes($guildActiveScreenshotPath, [Convert]::FromBase64String($guildActiveCapture.result.data))
          Invoke-GameExpression -Expression "window.__RPG_DEBUG__.closeFacility(); true" | Out-Null
        }
        Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.acceptOffer('$commissionId');api.closeFacility();if('$targetId'==='mountain_delivery_recipient'){api.enterMap('field');api.setEncounterGrace(30);const target=api.entityPosition('$targetId');api.clickMoveTo(target.x,target.y);return true;}for(let i=1;i<=5;i++)api.recordGuildKill('$targetId','${commissionId}:'+i);api.enterMap('guild');api.openFacility('guild');return true})()" | Out-Null
        if ($targetId -eq 'mountain_delivery_recipient') {
          $nearRecipient = $false
          for ($attempt = 0; $attempt -lt 20; $attempt += 1) {
            Start-Sleep -Milliseconds 1000
            $nearRecipient = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__,s=api.snapshot(),p=api.entityPosition('$targetId');return Math.hypot(s.x-p.x,s.y-p.y)<70})()"
            if ($nearRecipient) { break }
          }
          if (-not $nearRecipient) { throw 'Mountain Field delivery route did not reach the far-side recipient.' }
          Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.interactWith('$targetId');api.enterMap('guild');api.openFacility('guild');return true})()" | Out-Null
        }
        Start-Sleep -Milliseconds 120
        $ready = Get-GameSnapshot
        $expectedProgress = if ($targetId -eq 'mountain_delivery_recipient') { 1 } else { 5 }
        if ($ready.guildCommission.status -ne 'ready_to_report' -or $ready.guildCommission.progress -ne $expectedProgress -or $ready.guildCommission.activeCommissionId -ne $commissionId) { throw "Guild commission did not complete: $commissionId (status=$($ready.guildCommission.status), progress=$($ready.guildCommission.progress))." }
        Invoke-GameExpression -Expression 'window.__RPG_DEBUG__.claimContract(); true' | Out-Null
        $reported = Get-GameSnapshot
        if ($reported.guildCommission.activeCommissionId -ne $null -or $reported.guildCommission.envelopes.$star -ne 1) { throw "Guild commission report did not grant the $star-star envelope exactly once: $commissionId." }
        Invoke-GameExpression -Expression "window.__RPG_DEBUG__.openFacility('bag'); window.__RPG_DEBUG__.openGuildEnvelope($star); true" | Out-Null
        $opened = Get-GameSnapshot
        if ($opened.guildCommission.envelopes.$star -ne 0) { throw "Guild $star-star envelope was not consumed." }
        $manualCount = ($opened.skills.manualCounts.PSObject.Properties | Measure-Object -Property Value -Sum).Sum
        if ($manualCount -lt $star) { throw "Opening $star-star envelope did not create a Fighter skill manual." }
      }

      Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.closeFacility();api.enterMap('guild');api.openFacility('guild');api.acceptOffer('guild_hunt_chick_1star');api.closeFacility();for(let i=1;i<=5;i++)api.recordGuildKill('chick','repeat-chick:'+i);api.enterMap('guild');api.openFacility('guild');api.claimContract();return true})()" | Out-Null
      $repeat = Get-GameSnapshot
      if ($repeat.guildCommission.envelopes.'1' -ne 1 -or $repeat.guildCommission.cycle -ne 6) { throw 'Repeatable Guild commission did not become available for a second completed cycle.' }
      Invoke-GameExpression -Expression 'window.__RPG_DEBUG__.save(); window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.load(); true' | Out-Null
      Start-Sleep -Milliseconds 120
      $commissionLoaded = Get-GameSnapshot
      if ($commissionLoaded.guildCommission.envelopes.'1' -ne 1 -or $commissionLoaded.guildCommission.cycle -ne 6) { throw 'Guild commission envelope state did not survive save/load.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.openFacility('bag'); true" | Out-Null
      $guildCommissionScreenshotPath = Join-Path $runtimeOutputPath "smoke-guild-commission-$ViewportWidth.png"
      $guildCommissionCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($guildCommissionScreenshotPath, [Convert]::FromBase64String($guildCommissionCapture.result.data))
    }
    'expansion' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.interactWith('guild-request-board'); true" | Out-Null
      Start-Sleep -Milliseconds 100
      $guildUi = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),hidden:document.getElementById("facilityPanel").hidden,title:document.getElementById("facilityTitle").textContent,cards:document.querySelectorAll("[data-facility-action=accept]").length})') | ConvertFrom-Json
      if ($guildUi.snapshot.currentMapId -ne 'guild' -or $guildUi.snapshot.mode -ne 'facility' -or $guildUi.hidden -or $guildUi.cards -ne 5) { throw 'Guild interior or fixed V1 commission board did not open.' }

      Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.acceptOffer('guild_hunt_chick_1star');api.closeFacility();api.enterMap('field');for(let i=1;i<=5;i++)api.recordGuildKill('chick','expansion-chick:'+i);api.enterMap('guild');api.openFacility('guild');return true})()" | Out-Null
      Start-Sleep -Milliseconds 180
      $readyContract = Get-GameSnapshot
      if ($readyContract.guildCommission.status -ne 'ready_to_report' -or $readyContract.guildCommission.progress -ne 5) { throw 'Guild commission kills did not persist and reach ready status.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.claimContract(); true" | Out-Null
      $claimed = Get-GameSnapshot
      if ($claimed.activeContracts.Count -ne 0 -or $claimed.guildCommission.envelopes.'1' -ne 1 -or $claimed.coins -ne 12) { throw 'Guild report did not grant exactly one 1-star envelope without legacy coin rewards.' }

      Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.setPlayer({pendingLevelUps:0});api.closeFacility();api.setPlayer({level:7,coins:1000,pendingLevelUps:0});api.enterMap('shop');api.openFacility('shop');api.buyEquip('lantern_sabre');return true})()" | Out-Null
      Start-Sleep -Milliseconds 100
      $shopUi = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),hidden:document.getElementById("facilityPanel").hidden,title:document.getElementById("facilityTitle").textContent,equipmentCards:document.querySelectorAll(".equipment-card").length,facilityTab:document.getElementById("gameStage").dataset.facilityTab,contentClass:document.getElementById("facilityContent").firstElementChild?.className||""})') | ConvertFrom-Json
      if ($shopUi.snapshot.currentMapId -ne 'shop' -or $shopUi.snapshot.equipped.weapon -ne 'lantern_sabre' -or $shopUi.snapshot.coins -ne 620 -or $shopUi.equipmentCards -lt 10) { throw "Equipment shop purchase/equip flow failed (map=$($shopUi.snapshot.currentMapId), mode=$($shopUi.snapshot.mode), tab=$($shopUi.facilityTab), title=$($shopUi.title), weapon=$($shopUi.snapshot.equipped.weapon), coins=$($shopUi.snapshot.coins), cards=$($shopUi.equipmentCards), first=$($shopUi.contentClass))." }

      $discountTiers = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__;const results=[];api.setGuildMarks(4);api.setPlayer({coins:1000});api.buyEquip("mistweave_cape");results.push(api.snapshot().coins);api.setGuildMarks(10);api.setPlayer({coins:1000});api.buyEquip("hunter_fang");results.push(api.snapshot().coins);api.setGuildMarks(18);api.setPlayer({coins:1000});api.buyEquip("guild_mail");results.push(api.snapshot().coins);return results})())') | ConvertFrom-Json
      if ($discountTiers[0] -ne 725 -or $discountTiers[1] -ne 811 -or $discountTiers[2] -ne 898) { throw "Guild-mark discount tiers failed: $($discountTiers -join ',')." }

      Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.closeFacility();api.enterMap('dungeon');api.save();api.enterMap('world');api.load();return true})()" | Out-Null
      Start-Sleep -Milliseconds 180
      $dungeonLoaded = Get-GameSnapshot
      if ($dungeonLoaded.currentMapId -ne 'dungeon' -or $dungeonLoaded.mode -ne 'playing' -or $dungeonLoaded.aliveEnemies -lt 14 -or $dungeonLoaded.equipped.weapon -ne 'lantern_sabre' -or $dungeonLoaded.guildMarks -lt 1) { throw 'Dungeon entry or expansion save/load persistence failed.' }

      Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.interactWith('echo-lantern-shrine');api.forceDeath();api.respawn();return true})()" | Out-Null
      Start-Sleep -Milliseconds 100
      $checkpointRespawn = Get-GameSnapshot
      if ($checkpointRespawn.currentMapId -ne 'dungeon' -or $checkpointRespawn.mode -ne 'playing' -or $checkpointRespawn.checkpoint.mapId -ne 'dungeon' -or [Math]::Abs([double]$checkpointRespawn.x - [double]$checkpointRespawn.checkpoint.x) -gt 1) { throw 'Dungeon echo-lantern checkpoint did not respawn correctly.' }

      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.setPlayer({level:40,pendingLevelUps:0}); window.__RPG_DEBUG__.enterMap('dungeon'); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $scaledDungeon = Get-GameSnapshot
      $scaledWarden = $scaledDungeon.enemyLevels | Where-Object { $_.id -eq 'deepwarden-1' } | Select-Object -First 1
      if (-not $scaledWarden -or $scaledWarden.level -le 12) { throw 'High-level dungeon enemies did not scale with the player.' }

      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.startBattle('mossbun-1'); true" | Out-Null
      Start-Sleep -Milliseconds 100
      $dungeonBattle = Get-GameSnapshot
      if ($dungeonBattle.mode -ne 'battle' -or $dungeonBattle.battle.sourceId -ne 'mossbun-1') { throw 'Dungeon monster did not enter tactical combat.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleAction('start'); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $dungeonRound = Get-GameSnapshot
      if ($dungeonRound.battle.phase -ne 'planning_move' -or $dungeonRound.battle.ap -ne 10 -or $dungeonRound.battle.enemies.Count -lt 1) { throw 'Dungeon tactical round failed to initialize.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleAction('flee'); true" | Out-Null
      Start-Sleep -Milliseconds 80

      Invoke-GameExpression -Expression '(()=>{const key="everrealm-save-v1",api=window.__RPG_DEBUG__;api.save();const raw=JSON.parse(localStorage.getItem(key));raw.expansion.checkpoint={mapId:"dungeon",x:40,y:40};localStorage.setItem(key,JSON.stringify(raw));api.load();return true})()' | Out-Null
      Start-Sleep -Milliseconds 100
      $sanitizedCheckpoint = Get-GameSnapshot
      if ($sanitizedCheckpoint.currentMapId -ne 'dungeon' -or $sanitizedCheckpoint.mode -ne 'playing' -or ($sanitizedCheckpoint.checkpoint.x -eq 40 -and $sanitizedCheckpoint.checkpoint.y -eq 40)) { throw 'Blocked checkpoint from a modified save was not replaced with a safe map start.' }
    }
    'monster-facing' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); window.__RPG_DEBUG__.enterMap('field'); window.__RPG_DEBUG__.setEncounterGrace(30); true" | Out-Null
      Start-Sleep -Milliseconds 240
      $targetId = 'slime-1'
      $samples = [Collections.Generic.List[object]]::new()
      for ($sampleIndex = 0; $sampleIndex -lt 48; $sampleIndex += 1) {
        Start-Sleep -Milliseconds 60
        $sample = Get-GameSnapshot
        $state = @($sample.enemyStates | Where-Object { $_.id -eq $targetId }) | Select-Object -First 1
        if ($state) { $samples.Add([PSCustomObject]@{ facing = [string]$state.facing; moving = [bool]$state.moving; locomotionFacing = [string]$state.locomotion.facing; locomotionState = [string]$state.locomotion.state }) }
      }
      $movingSamples = @($samples | Where-Object { $_.moving -and $_.locomotionState -eq 'walk' })
      if ($movingSamples.Count -lt 8) { throw "Monster facing runtime sample did not observe enough walking frames (samples=$($movingSamples.Count))." }
      $desynced = @($movingSamples | Where-Object { $_.facing -ne $_.locomotionFacing })
      if ($desynced.Count -gt 0) { throw "Monster visual facing desynchronised from stable entity facing ($($desynced.Count) frames)." }
      $leftRightFlips = 0
      for ($sampleIndex = 1; $sampleIndex -lt $samples.Count; $sampleIndex += 1) {
        $previous = $samples[$sampleIndex - 1]
        $current = $samples[$sampleIndex]
        if ($previous.moving -and $current.moving -and (($previous.facing -eq 'left' -and $current.facing -eq 'right') -or ($previous.facing -eq 'right' -and $current.facing -eq 'left'))) { $leftRightFlips += 1 }
      }
      if ($leftRightFlips -gt 2) { throw "Monster facing alternated too often in runtime samples (flips=$leftRightFlips)." }
      $monsterFacingRuntime = [PSCustomObject]@{ target = $targetId; totalSamples = $samples.Count; movingSamples = $movingSamples.Count; desyncedFrames = $desynced.Count; leftRightFlips = $leftRightFlips }
    }
    'bgm' {
      $bgm = Invoke-GameExpression -Expression "(async()=>{const api=window.__RPG_DEBUG__,wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));api.newGame();await wait(700);const townBefore=api.snapshot().bgm;api.enterMap('clinic');await wait(180);const clinic=api.snapshot().bgm;api.enterMap('world');await wait(180);const townAfter=api.snapshot().bgm;api.enterMap('shop');await wait(180);const shop=api.snapshot().bgm;api.enterMap('field');await wait(700);const mountain=api.snapshot().bgm;api.enterMap('world');await wait(700);const returned=api.snapshot().bgm;api.enterMap('dungeon');const mine=api.snapshot().bgm;document.getElementById('soundButton').click();const muted=api.snapshot().bgm;api.enterMap('field');const mutedMountain=api.snapshot().bgm;document.getElementById('soundButton').click();await wait(120);const resumed=api.snapshot().bgm;return JSON.stringify({townBefore,clinic,townAfter,shop,mountain,returned,mine,muted,mutedMountain,resumed});})()" | ConvertFrom-Json
      if ($bgm.townBefore.key -ne 'mainTown' -or $bgm.clinic.key -ne 'mainTown' -or $bgm.townAfter.key -ne 'mainTown' -or $bgm.shop.key -ne 'mainTown' -or $bgm.mountain.key -ne 'mountainField' -or $bgm.returned.key -ne 'mainTown' -or $bgm.mine.key -ne 'mountainField') { throw 'BGM map-zone routing did not keep town and mountain families continuous.' }
      if ($bgm.townBefore.source -notmatch 'maintown\.wav' -or $bgm.mountain.source -notmatch 'mountainousareas\.wav') { throw 'BGM routing selected an unexpected source asset.' }
      if ($bgm.clinic.currentTime -lt $bgm.townBefore.currentTime - 0.05 -or $bgm.townAfter.currentTime -lt $bgm.clinic.currentTime - 0.05 -or $bgm.shop.currentTime -lt $bgm.townAfter.currentTime - 0.05) { throw "Same-zone BGM playback position moved backwards or reset (town=$($bgm.townBefore.currentTime), clinic=$($bgm.clinic.currentTime), returned=$($bgm.townAfter.currentTime), shop=$($bgm.shop.currentTime))." }
      if ($bgm.muted.enabled -or $bgm.muted.activeInstances -ne 0 -or $bgm.mutedMountain.activeInstances -ne 0 -or -not $bgm.resumed.enabled) { throw 'BGM mute/unmute did not toggle the single active manager.' }
      if ($bgm.resumed.activeInstances -gt 1 -or $bgm.mutedMountain.activeInstances -gt 1) { throw 'BGM manager reported more than one active instance.' }
    }
    'autoplay' {
      Start-Sleep -Seconds $PlaySeconds
    }
  }

  $after = Get-GameSnapshot
  if ($Scenario -eq 'movement') {
    if ($after.mode -ne 'playing') { throw "Movement scenario left playing mode: $($after.mode)." }
    if ([Math]::Abs([double]$after.x - [double]$before.x) -lt 20) { throw 'Click/touch movement did not move the player far enough.' }
  }
  if ($Scenario -eq 'savelevel' -and ($after.mode -ne 'playing' -or $after.pendingLevelUps -ne 0 -or $after.level -lt 2)) {
    throw "Automatic level growth did not survive save/load (mode=$($after.mode), pending=$($after.pendingLevelUps))."
  }
  if ($Scenario -eq 'autoplay' -and $after.mode -eq 'title') { throw 'Autoplay did not start the game.' }
  if ($Scenario -eq 'battle') {
    $battleUiAfter = (Invoke-GameExpression -Expression 'JSON.stringify({hudHidden:document.getElementById("battleHud").hidden,state:document.getElementById("gameStage").dataset.gameState})') | ConvertFrom-Json
    if ($after.mode -ne 'playing' -or $null -ne $after.battle -or -not $battleUiAfter.hudHidden -or $battleUiAfter.state -ne 'playing' -or $after.aliveEnemies -ge $roundOne.aliveEnemies) {
      throw "Battle did not return cleanly to the map (mode=$($after.mode), hudHidden=$($battleUiAfter.hudHidden), state=$($battleUiAfter.state), alive=$($after.aliveEnemies))."
    }
  }

  $capture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
  [IO.File]::WriteAllBytes($screenshotPath, [Convert]::FromBase64String($capture.result.data))

  if ($Scenario -eq 'dialogue') {
    for ($step = 0; $step -lt 3; $step += 1) {
      Invoke-GameExpression -Expression "document.getElementById('dialogueNext').click(); true" | Out-Null
      Start-Sleep -Milliseconds 60
    }
    $afterDialogue = Get-GameSnapshot
    if ($afterDialogue.mode -ne 'playing') { throw "Touch dialogue did not close cleanly (mode=$($afterDialogue.mode))." }
    $after = $afterDialogue
  }

  Start-Sleep -Milliseconds 140
  Invoke-GameExpression -Expression 'true' | Out-Null
  if ($script:runtimeErrors.Count -gt 0) {
    throw ('Browser runtime errors: ' + ($script:runtimeErrors -join ' | '))
  }

  [PSCustomObject]@{
    scenario = $Scenario
    before = $before
    after = $after
    dialogue = $dialogueSnapshot
    dialoguePortrait = $dialoguePortraitUi
    levelUp = $levelUpSnapshot
    battle = $battleMidSnapshot
    battleScreenshot = $battleScreenshotPath
    exploreUi = $exploreUi
    inventoryUi = $inventoryUi
    inventoryScreenshot = $inventoryScreenshotPath
    equipmentScreenshot = $equipmentScreenshotPath
    statusScreenshot = $statusScreenshotPath
    hudCollapsedScreenshot = $hudCollapsedScreenshotPath
    deckScreenshot = $deckScreenshotPath
    deckViewerScreenshot = $deckViewerScreenshotPath
    dialogueServiceScreenshot = $dialogueServiceScreenshotPath
    dialogueLongScreenshot = $dialogueLongScreenshotPath
    fighterTreeDetailScreenshot = $fighterTreeDetailScreenshotPath
    fighterTreeBottomScreenshot = $fighterTreeBottomScreenshotPath
    abandonScreenshot = $abandonScreenshotPath
    monsterFacingRuntime = $monsterFacingRuntime
    guildBoardScreenshot = $guildBoardScreenshotPath
    guildHelpScreenshot = $guildHelpScreenshotPath
    guildActiveScreenshot = $guildActiveScreenshotPath
    guildCommissionScreenshot = $guildCommissionScreenshotPath
    bgmEvidence = $bgm
    serviceReach = $serviceReachResults
    movementEvidence = $movementEvidence
    movementBeforeScreenshot = $movementBeforeScreenshotPath
    screenshot = $screenshotPath
    runtimeErrors = $script:runtimeErrors.Count
  } | ConvertTo-Json -Depth 8 -Compress
}
finally {
  if ($socket) { $socket.Dispose() }
  if ($edgeProcess -and -not $edgeProcess.HasExited) {
    Stop-Process -Id $edgeProcess.Id -Force
    $edgeProcess.WaitForExit(3000) | Out-Null
  }
  $resolvedProfile = [IO.Path]::GetFullPath($profilePath)
  if ($resolvedProfile.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedProfile)) {
    for ($attempt = 0; $attempt -lt 20 -and (Test-Path -LiteralPath $resolvedProfile); $attempt += 1) {
      try { Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction Stop } catch { Start-Sleep -Milliseconds 150 }
    }
  }
}

