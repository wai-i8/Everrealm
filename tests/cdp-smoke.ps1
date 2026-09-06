param(
  [ValidateSet('title', 'movement', 'town', 'town-plaza', 'town-guild', 'town-services', 'town-tree', 'town-gate', 'town-exit', 'town-doors', 'town-entrance', 'town-equipment', 'clinic', 'clinic-return', 'general-store', 'inn', 'latestui', 'artwalk', 'locomotion', 'spritecollision', 'entrance', 'fightertree', 'forestmap', 'dialogue', 'gate', 'levelup', 'savelevel', 'boss', 'quest', 'battle', 'mountain-art', 'bossbattle', 'skillbattle', 'guildmap', 'shopmap', 'dungeonmap', 'guildview', 'shopview', 'skills', 'portal', 'expansion', 'guild-commission', 'monster-facing', 'autoplay')]
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

try {
  if (-not (Test-Path -LiteralPath $edgePath)) { throw 'Microsoft Edge was not found.' }
  New-Item -ItemType Directory -Path $profilePath | Out-Null
  $arguments = @(
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
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
  $fighterTreeDetailScreenshotPath = $null
  $fighterTreeBottomScreenshotPath = $null
  $monsterFacingRuntime = $null
  switch ($Scenario) {
    'title' {
      if ($before.mode -ne 'title') { throw "Expected title mode, got $($before.mode)." }
    }
    'movement' {
      Invoke-GameExpression -Expression 'window.__RPG_DEBUG__.newGame(); true' | Out-Null
      $before = Get-GameSnapshot
      Invoke-GameExpression -Expression "(()=>{const canvas=document.getElementById('gameCanvas'),r=canvas.getBoundingClientRect();canvas.dispatchEvent(new PointerEvent('pointerdown',{pointerId:41,button:0,clientX:r.left+r.width*.64,clientY:r.top+r.height*.55,bubbles:true,cancelable:true}));return true})()" | Out-Null
      Start-Sleep -Milliseconds 650
      $questUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const q=document.getElementById("questHud").getBoundingClientRect(),m=document.querySelector(".minimap-wrap").getBoundingClientRect(),contract=document.querySelector("[data-quest-track=contract]");contract.click();const side=window.__RPG_DEBUG__.snapshot();document.querySelector("[data-quest-track=main]").click();return {overlap:!(q.right<=m.left||q.left>=m.right||q.bottom<=m.top||q.top>=m.bottom),sideMode:side.questTrackerMode,mainMode:window.__RPG_DEBUG__.snapshot().questTrackerMode};})())') | ConvertFrom-Json
      if ($questUi.overlap) { throw 'Quest tracker overlapped the minimap at the tested viewport.' }
      if ($questUi.sideMode -ne 'contract' -or $questUi.mainMode -ne 'main') { throw 'Main/contract quest tabs did not switch tracking modes.' }
      $exploreUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__,stage=document.getElementById("gameStage").getBoundingClientRect(),side=document.getElementById("exploreSidebar").getBoundingClientRect(),map=document.querySelector(".minimap-wrap").getBoundingClientRect(),inventory=document.getElementById("inventoryButton").getBoundingClientRect(),skills=document.getElementById("skillTreeButton").getBoundingClientRect(),quest=document.getElementById("questHud").getBoundingClientRect(),mid=stage.left+stage.width/2,buttons=[...document.querySelectorAll("[data-zoom-level]")],fontSizes={menu:parseFloat(getComputedStyle(document.querySelector(".explore-menu-copy b")).fontSize),zoom:parseFloat(getComputedStyle(buttons[0]).fontSize),quest:parseFloat(getComputedStyle(document.getElementById("questTitle")).fontSize)};buttons.find(b=>b.dataset.zoomLevel==="far").click();const far=api.snapshot();buttons.find(b=>b.dataset.zoomLevel==="mid").click();const middle=api.snapshot();buttons.find(b=>b.dataset.zoomLevel==="near").click();const near=api.snapshot();buttons.find(b=>b.dataset.zoomLevel==="mid").click();return {sideLeft:side.left>=stage.left-1,leftTools:[inventory,skills,quest].every(r=>r.right<=mid+1),mapRight:map.left>=mid-1,overlap:!(side.right<=map.left||side.left>=map.right||side.bottom<=map.top||side.top>=map.bottom),fontSizes,far:far.targetCameraZoom,middle:middle.targetCameraZoom,near:near.targetCameraZoom,active:buttons.find(b=>b.getAttribute("aria-pressed")==="true")?.dataset.zoomLevel,stored:localStorage.getItem("everrealm-zoom")};})())') | ConvertFrom-Json
      if (-not $exploreUi.sideLeft -or -not $exploreUi.leftTools -or -not $exploreUi.mapRight -or $exploreUi.overlap) { throw 'Exploration UI was not split into a left tool rail and right-only minimap.' }
      if (-not ($exploreUi.far -lt $exploreUi.middle -and $exploreUi.middle -lt $exploreUi.near) -or $exploreUi.active -ne 'mid' -or $exploreUi.stored -ne 'mid') { throw 'Far/mid/near zoom controls were not ordered, selected or persisted correctly.' }
      if ($exploreUi.fontSizes.menu -lt 11 -or $exploreUi.fontSizes.zoom -lt 11 -or $exploreUi.fontSizes.quest -lt 11) { throw 'Exploration typography remained too small at 100% browser zoom.' }
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
        $approachOffset = if ($entry.map -eq 'general-store') { 300 } else { -300 }
        $approachExpression = if (@('guild', 'clinic', 'inn') -contains $entry.map) { 'door.x,door.y+70' } else { 'door.x,door.y-70' }
        $doorData = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;const door=api.entityPosition('$($entry.portal)');api.teleport($approachExpression);const blocked=api.collisionAt(door.x,door.y,12);api.clickMoveTo(door.x,door.y);return JSON.stringify({door,blocked,start:api.snapshot()});})()" | ConvertFrom-Json
        $arrived = $false
        for ($attempt = 0; $attempt -lt 18 -and -not $arrived; $attempt += 1) {
          Start-Sleep -Milliseconds 250
          $doorSnapshot = Get-GameSnapshot
          $arrived = $doorSnapshot.currentMapId -eq $entry.map -and $doorSnapshot.mode -eq 'playing'
        }
        if (-not $arrived) { throw "Physical town door did not enter $($entry.map) (map=$($doorSnapshot.currentMapId), mode=$($doorSnapshot.mode), door=$($doorData.door.x),$($doorData.door.y), blocked=$($doorData.blocked), player=$($doorSnapshot.x),$($doorSnapshot.y), remaining=$($doorSnapshot.explorePath.remaining))." }
        Start-Sleep -Milliseconds 500
        $exitApproachExpression = if (@('guild', 'shop') -contains $entry.map) { 'exit.x,exit.y-70' } else { 'exit.x-100,exit.y' }
        $exitData = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;const exit=api.entityPosition('$($entry.map)-to-world');api.teleport($exitApproachExpression);api.clickMoveTo(exit.x,exit.y);return JSON.stringify({exit,blocked:api.collisionAt(exit.x,exit.y,12),start:api.snapshot()});})()" | ConvertFrom-Json
        $returned = $false
        for ($attempt = 0; $attempt -lt 18 -and -not $returned; $attempt += 1) {
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
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('clinic'); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleport(400,280); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $clinicMap = Get-GameSnapshot
      if ($clinicMap.mode -ne 'playing' -or $clinicMap.currentMapId -ne 'clinic') { throw 'Clinic interior did not remain visible.' }
      $clinicService = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.interactWith('clinic-healer-siu-moon');return JSON.stringify({mode:api.snapshot().mode,choices:document.querySelectorAll('.dialogue-choice').length});})()" | ConvertFrom-Json
      if ($clinicService.mode -ne 'dialogue' -or $clinicService.choices -lt 2) { throw 'Clinic healer service did not open from the interior NPC.' }
      Invoke-GameExpression -Expression "document.querySelector('.dialogue-choice:last-child').click(); true" | Out-Null
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
    'general-store' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('general-store'); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleport(400,280); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $generalStoreMap = Get-GameSnapshot
      if ($generalStoreMap.mode -ne 'playing' -or $generalStoreMap.currentMapId -ne 'general-store') { throw 'General store interior did not remain visible.' }
      $generalStoreService = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.interactWith('store-merchant-gin');return JSON.stringify({mode:api.snapshot().mode,choices:document.querySelectorAll('.dialogue-choice').length});})()" | ConvertFrom-Json
      if ($generalStoreService.mode -ne 'dialogue' -or $generalStoreService.choices -lt 2) { throw 'General store service did not open from the interior NPC.' }
      Invoke-GameExpression -Expression "document.querySelector('.dialogue-choice:last-child').click(); true" | Out-Null
    }
    'inn' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('inn'); document.querySelector('[data-zoom-level=far]').click(); window.__RPG_DEBUG__.teleport(400,280); true" | Out-Null
      Start-Sleep -Milliseconds 2600
      $innMap = Get-GameSnapshot
      if ($innMap.mode -ne 'playing' -or $innMap.currentMapId -ne 'inn') { throw 'Inn interior did not remain visible.' }
      $innService = Invoke-GameExpression -Expression "(()=>{const api=window.__RPG_DEBUG__;api.interactWith('inn-keeper');return JSON.stringify({mode:api.snapshot().mode,choices:document.querySelectorAll('.dialogue-choice').length});})()" | ConvertFrom-Json
      if ($innService.mode -ne 'dialogue' -or $innService.choices -lt 2) { throw 'Inn service did not open from the interior NPC.' }
      Invoke-GameExpression -Expression "document.querySelector('.dialogue-choice:last-child').click(); true" | Out-Null
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
      Invoke-GameExpression -Expression "document.getElementById('statusButton').click(); true" | Out-Null
      Start-Sleep -Milliseconds 100
      $statusUi = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),stats:document.querySelectorAll(".status-stat-grid>div").length,labels:[...document.querySelectorAll(".status-stat-grid dt")].map(node=>node.textContent),forbidden:[...document.querySelectorAll(".status-stat-grid dt")].some(node=>["\u901f\u5ea6","\u66b4\u64ca","\u63a2\u7d22"].some(term=>node.textContent.includes(term))),canvas:!!document.getElementById("statusCharacterCanvas"),font:parseFloat(getComputedStyle(document.querySelector(".status-stat-grid dd")).fontSize)})') | ConvertFrom-Json
      if ($statusUi.snapshot.facility.tab -ne 'status' -or $statusUi.stats -ne 5 -or -not $statusUi.canvas -or $statusUi.font -lt 11 -or $statusUi.forbidden) { throw 'Clickable character status panel did not render the focused HP/attack/defence/move/DECK stats.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.facilityTab('equipment'); true" | Out-Null
      $fighterIconCount = Invoke-GameExpression -Expression 'document.querySelectorAll(".fighter-equipment-icon-atlas").length'
      if ($fighterIconCount -lt 1) { throw 'Fighter equipment did not use its dedicated glove atlas.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.teleport(1000,1000); document.getElementById('deckButton').click(); true" | Out-Null
      $farDeck = Get-GameSnapshot
      $farDeckUi = (Invoke-GameExpression -Expression 'JSON.stringify({actions:document.querySelectorAll("[data-facility-action=equip-skill],[data-facility-action=unequip-skill]").length,tabs:!!document.getElementById("facilityTabs"),summary:!!document.getElementById("facilitySummary")})') | ConvertFrom-Json
      if ($farDeck.mode -ne 'facility' -or $farDeck.facility.context -ne 'deck-view' -or $farDeckUi.actions -ne 0 -or $farDeckUi.tabs -or $farDeckUi.summary) { throw "Portable DECK did not open as a focused read-only view (mode=$($farDeck.mode), context=$($farDeck.facility.context))." }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.teleportTo('harbour-gate-deck-console'); window.__RPG_DEBUG__.interactWith('harbour-gate-deck-console'); true" | Out-Null
      Start-Sleep -Milliseconds 100
      $deckUi = (Invoke-GameExpression -Expression 'JSON.stringify({snapshot:window.__RPG_DEBUG__.snapshot(),slots:document.querySelectorAll(".deck-slot").length,filled:document.querySelectorAll(".deck-slot.is-filled").length,empty:[...document.querySelectorAll(".deck-slot.is-empty strong")].every(node=>node.textContent==="\u6c92\u6709\u6280\u80fd")})') | ConvertFrom-Json
      if ($deckUi.snapshot.facility.context -ne 'deck' -or $deckUi.slots -ne 3 -or $deckUi.filled -ne 1 -or -not $deckUi.empty) { throw 'City-gate DECK panel did not show the editable fighter loadout with correctly named empty slots.' }
      $deckRewards = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const api=window.__RPG_DEBUG__;api.setQuestStage(3);const four=api.snapshot().skills.deckCapacity;api.setGuildMarks(10);const five=api.snapshot().skills.deckCapacity;api.setQuestStage(4);api.facilityTab("deck");const final=api.snapshot();return {four,five,six:final.skills.deckCapacity,milestones:final.skills.deckUpgradeMilestones.length,slots:document.querySelectorAll(".deck-slot").length};})())') | ConvertFrom-Json
      if ($deckRewards.four -ne 4 -or $deckRewards.five -ne 5 -or $deckRewards.six -ne 6 -or $deckRewards.milestones -ne 3 -or $deckRewards.slots -ne 6) { throw 'Main/guild DECK milestone rewards did not expand the city-gate panel from three to six slots.' }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.grantSkillBook(1); window.__RPG_DEBUG__.openSkillBook(1); window.__RPG_DEBUG__.closeFacility(); window.__RPG_DEBUG__.openFacility('bag'); true" | Out-Null
      Start-Sleep -Milliseconds 90
      Invoke-GameExpression -Expression "document.querySelector('[data-facility-action=use-manual]').click(); true" | Out-Null
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
      Start-Sleep -Milliseconds 1100
      $punchRange = (Invoke-GameExpression -Expression 'JSON.stringify(window.__RPG_DEBUG__.battleSkillRange("kentotsu"))') | ConvertFrom-Json
      if ($punchRange.Count -ne 5) { throw "Straight Punch did not expose exactly five front/side range cells (count=$($punchRange.Count))." }
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
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter');window.__RPG_DEBUG__.setEncounterGrace(30);true" | Out-Null
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
        Invoke-GameExpression -Expression "(()=>{const a=window.__RPG_DEBUG__;a.newGame('fighter');a.setPlayer({level:5});a.setQuestStage(3);a.enterMap('field');a.setEncounterGrace(30);a.teleport($approachX,$approachY);a.portalTick();if(a.collisionAt($approachX,$approachY))throw Error('Blocked start');const p=a.entityPosition('field-to-dungeon');a.clickMoveTo(p.x,p.y);return true})()" | Out-Null
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
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.teleportTo('ah-ching'); true" | Out-Null
      Start-Sleep -Milliseconds 220
      Invoke-GameExpression -Expression "window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE',key:'e',bubbles:true})); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $dialogueSnapshot = Get-GameSnapshot
      if ($dialogueSnapshot.mode -ne 'dialogue') { throw "Touch dialogue did not open: $($dialogueSnapshot.mode)." }
      $dialoguePortraitUi = (Invoke-GameExpression -Expression 'JSON.stringify((()=>{const canvas=document.getElementById("dialoguePortraitCanvas"),rect=canvas.getBoundingClientRect();return {speaker:document.getElementById("speakerName").textContent,actor:canvas.dataset.actor,displayWidth:rect.width,displayHeight:rect.height,canvasWidth:canvas.width,canvasHeight:canvas.height,art:window.LanternArt.spriteStatus()};})())') | ConvertFrom-Json
      # Keep this comparison ASCII-only so Windows PowerShell 5.1 does not
      # reinterpret the UTF-8 source literal through the active ANSI codepage.
      $expectedAhChing = ([string][char]0x963F) + ([string][char]0x6F84)
      if ($dialoguePortraitUi.speaker -ne $expectedAhChing) { throw "Expected Ah Ching dialogue, got $($dialoguePortraitUi.speaker)." }
      if ($dialoguePortraitUi.actor -ne 'keeper') { throw "Expected Ah Ching portrait actor keeper, got $($dialoguePortraitUi.actor)." }
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
      if ($dialoguePortraitUi.displayWidth -lt 1 -or $dialoguePortraitUi.displayHeight -lt 1 -or $dialoguePortraitUi.canvasWidth -lt 1 -or $dialoguePortraitUi.canvasHeight -lt 1) { throw 'Dialogue portrait canvas did not have a visible display and backing size.' }
      $displayAspect = [double]$dialoguePortraitUi.displayWidth / [double]$dialoguePortraitUi.displayHeight
      $backingAspect = [double]$dialoguePortraitUi.canvasWidth / [double]$dialoguePortraitUi.canvasHeight
      if ([Math]::Abs($displayAspect - $backingAspect) -gt 0.02) {
        throw "Dialogue portrait canvas was stretched (display=$displayAspect, backing=$backingAspect)."
      }
    }
    'gate' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.setQuestStage(1); window.__RPG_DEBUG__.teleportTo('gate'); window.__RPG_DEBUG__.clickMoveTo(2020,620); true" | Out-Null
      Start-Sleep -Milliseconds 850
      $closedGateSnapshot = Get-GameSnapshot
      if ($closedGateSnapshot.x -ge 1970) { throw "Closed gate was bypassed at x=$($closedGateSnapshot.x)." }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.setQuestStage(3); window.__RPG_DEBUG__.clickMoveTo(2020,620); true" | Out-Null
      Start-Sleep -Milliseconds 850
      $openGateSnapshot = Get-GameSnapshot
      if ($openGateSnapshot.x -le 1970) { throw "Click path did not cross the opened gate (x=$($openGateSnapshot.x))." }
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
    'boss' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('field'); window.__RPG_DEBUG__.setQuestStage(3); window.__RPG_DEBUG__.teleportTo('boss-mistfang'); window.__RPG_DEBUG__.damageEnemy('boss-mistfang',99999); true" | Out-Null
      Start-Sleep -Milliseconds 350
    }
    'quest' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('field'); window.__RPG_DEBUG__.setQuestStage(1); ['warden-west','warden-north','warden-hollow'].forEach(id=>window.__RPG_DEBUG__.damageEnemy(id,99999)); window.__RPG_DEBUG__.collectAllDrops(); true" | Out-Null
      Start-Sleep -Milliseconds 600
      Invoke-GameExpression -Expression "for(let i=0;i<10&&window.__RPG_DEBUG__.snapshot().mode==='levelup';i++) window.__RPG_DEBUG__.chooseUpgrade('edge'); window.__RPG_DEBUG__.teleportTo('gate'); true" | Out-Null
      Start-Sleep -Milliseconds 220
      Invoke-GameExpression -Expression "window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE',key:'e',bubbles:true})); true" | Out-Null
      Start-Sleep -Milliseconds 80
      Invoke-GameExpression -Expression "document.getElementById('dialogueNext').click(); document.getElementById('dialogueNext').click(); true" | Out-Null
      Start-Sleep -Milliseconds 100
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.teleportTo('boss-mistfang'); window.__RPG_DEBUG__.damageEnemy('boss-mistfang',99999); true" | Out-Null
      Start-Sleep -Milliseconds 600
      Invoke-GameExpression -Expression "for(let i=0;i<10&&window.__RPG_DEBUG__.snapshot().mode==='levelup';i++) window.__RPG_DEBUG__.chooseUpgrade('edge'); window.__RPG_DEBUG__.enterMap('world'); window.__RPG_DEBUG__.teleportTo('ah-ching'); true" | Out-Null
      Start-Sleep -Milliseconds 220
      Invoke-GameExpression -Expression "window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE',key:'e',bubbles:true})); true" | Out-Null
      Start-Sleep -Milliseconds 80
      Invoke-GameExpression -Expression "document.getElementById('dialogueNext').click(); document.getElementById('dialogueNext').click(); document.getElementById('dialogueNext').click(); true" | Out-Null
      Start-Sleep -Milliseconds 120
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

      Invoke-GameExpression -Expression "document.getElementById('pauseButton').click(); true" | Out-Null
      Start-Sleep -Milliseconds 420
      $pausedBattle = Get-GameSnapshot
      if ($pausedBattle.mode -ne 'paused' -or $pausedBattle.battle.phase -ne 'resolving_move') { throw "Battle pause did not freeze simultaneous movement (mode=$($pausedBattle.mode), phase=$($pausedBattle.battle.phase))." }
      Invoke-GameExpression -Expression "document.getElementById('resumeButton').click(); true" | Out-Null
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
      Start-Sleep -Milliseconds 1130
      $battleMidSnapshot = Get-GameSnapshot
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
      $mountainScreenshotPath = Join-Path $runtimeOutputPath "mountain-battle-normal-$ViewportWidth.png"
      $mountainCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($mountainScreenshotPath, [Convert]::FromBase64String($mountainCapture.result.data))
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleCommitMove(); true" | Out-Null
      Start-Sleep -Milliseconds 1160
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleAction('skill:straight_punch'); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $mountainAttack = Get-GameSnapshot
      if ($mountainAttack.battle.phase -ne 'planning_action' -or $mountainAttack.battle.selectedAction -ne 'skill:straight_punch') {
        throw "Mountain attack preview did not initialize (phase=$($mountainAttack.battle.phase), action=$($mountainAttack.battle.selectedAction))."
      }
      $mountainAttackScreenshotPath = Join-Path $runtimeOutputPath "mountain-battle-attack-preview-$ViewportWidth.png"
      $mountainAttackCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($mountainAttackScreenshotPath, [Convert]::FromBase64String($mountainAttackCapture.result.data))
    }
    'bossbattle' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('field'); window.__RPG_DEBUG__.setQuestStage(3); window.__RPG_DEBUG__.startBattle('boss-mistfang'); true" | Out-Null
      Start-Sleep -Milliseconds 150
      $bossRound = Get-GameSnapshot
      $fleeDisabled = [bool](Invoke-GameExpression -Expression 'document.getElementById("battleFleeButton").disabled')
      if ($bossRound.mode -ne 'battle' -or $bossRound.battle.sourceId -ne 'boss-mistfang' -or $bossRound.battle.phase -ne 'planning_move' -or $bossRound.battle.ap -ne 10 -or $bossRound.battle.enemies.Count -ne 3 -or $bossRound.battle.plans.Count -ne 3 -or -not $fleeDisabled) {
        throw "Boss tactical setup failed (phase=$($bossRound.battle.phase), enemies=$($bossRound.battle.enemies.Count), plans=$($bossRound.battle.plans.Count), fleeDisabled=$fleeDisabled)."
      }
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.battleAction('flee'); true" | Out-Null
      Start-Sleep -Milliseconds 80
      $bossAfterFlee = Get-GameSnapshot
      if ($bossAfterFlee.mode -ne 'battle' -or $bossAfterFlee.battle.phase -ne 'planning_move') { throw 'Boss battle incorrectly allowed retreat.' }
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
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('guild'); true" | Out-Null
      Start-Sleep -Milliseconds 160
      $guildMap = Get-GameSnapshot
      if ($guildMap.mode -ne 'playing' -or $guildMap.currentMapId -ne 'guild') { throw 'Guild map did not remain visible.' }
    }
    'shopmap' {
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.enterMap('shop'); true" | Out-Null
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
      $inventoryUi = (Invoke-GameExpression -Expression 'JSON.stringify({books:document.querySelectorAll("[data-item-id^=skill_book]").length,badge:document.getElementById("inventoryBookBadge").textContent,badgeHidden:document.getElementById("inventoryBookBadge").hidden,potions:document.querySelectorAll("[data-facility-action=use-potion]").length,cards:document.querySelectorAll(".inventory-grid-item").length,icons:document.querySelectorAll(".inventory-grid-item .atlas-icon").length,bodyFont:parseFloat(getComputedStyle(document.querySelector(".inventory-item-copy > p")).fontSize),titleFont:parseFloat(getComputedStyle(document.getElementById("facilityTitle")).fontSize)})') | ConvertFrom-Json
      if ($inventoryUi.books -ne 3 -or $inventoryUi.badge -ne '3' -or $inventoryUi.badgeHidden -or $inventoryUi.potions -ne 1 -or $inventoryUi.cards -lt 4 -or $inventoryUi.icons -ne $inventoryUi.cards) { throw 'Inventory did not expose a complete icon grid for potions and three book tiers.' }
      if ($inventoryUi.bodyFont -lt 11 -or $inventoryUi.titleFont -gt 35 -or $inventoryUi.titleFont / $inventoryUi.bodyFont -gt 2.8) { throw 'Facility title and inventory typography remained disproportionate.' }
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
      if ($equipmentUi.slots -ne 6 -or $equipmentUi.cards -lt 2) { throw 'Equipment inventory did not render the six-slot paper doll and owned gear.' }
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
      Invoke-GameExpression -Expression '(()=>{const api=window.__RPG_DEBUG__;api.enterMap("field");api.setQuestStage(3);const door=api.entityPosition("field-to-dungeon");api.teleport(door.x,door.y+50);api.clickMoveTo(door.x,door.y);return true;})()' | Out-Null
      Start-Sleep -Milliseconds 520
      $dungeonWarning = Get-GameSnapshot
      if ($dungeonWarning.mode -ne 'dialogue' -or $dungeonWarning.currentMapId -ne 'field') { throw 'Automatic dungeon portal did not preserve its under-level warning choice.' }
    }
    'guild-commission' {
      $commissionIds = @('guild_hunt_chick_1star', 'guild_delivery_mountain_2star', 'guild_hunt_coyote_3star', 'guild_hunt_bear_4star', 'guild_hunt_snake_5star')
      $targets = @('chick', 'mountain_delivery_recipient', 'coyote', 'bear', 'snake')
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame('fighter'); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.interactWith('guild-request-board'); true" | Out-Null
      Start-Sleep -Milliseconds 120
      $board = (Invoke-GameExpression -Expression 'JSON.stringify({offers:window.__RPG_DEBUG__.offers().map(o=>({id:o.id,star:o.star,type:o.type})),acceptCards:document.querySelectorAll("[data-facility-action=accept]").length,internalIds:document.body.innerText.includes("mountain_delivery_recipient")})') | ConvertFrom-Json
      if ($board.offers.Count -ne 5 -or $board.acceptCards -ne 5 -or $board.internalIds) { throw 'Guild V1 board did not render exactly five user-facing commission offers.' }
      $guildBoardScreenshotPath = Join-Path $runtimeOutputPath "smoke-guild-board-$ViewportWidth.png"
      $guildBoardCapture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
      [IO.File]::WriteAllBytes($guildBoardScreenshotPath, [Convert]::FromBase64String($guildBoardCapture.result.data))

      for ($index = 0; $index -lt $commissionIds.Count; $index += 1) {
        $commissionId = $commissionIds[$index]
        $targetId = $targets[$index]
        $star = $index + 1
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
      Invoke-GameExpression -Expression "window.__RPG_DEBUG__.newGame(); window.__RPG_DEBUG__.setQuestStage(3); window.__RPG_DEBUG__.enterMap('guild'); window.__RPG_DEBUG__.interactWith('guild-request-board'); true" | Out-Null
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
    'autoplay' {
      Start-Sleep -Seconds $PlaySeconds
    }
  }

  $after = Get-GameSnapshot
  if ($Scenario -eq 'movement') {
    if ($after.mode -ne 'playing') { throw "Movement scenario left playing mode: $($after.mode)." }
    if ([Math]::Abs([double]$after.x - [double]$before.x) -lt 20) { throw 'Click/touch movement did not move the player far enough.' }
  }
  if ($Scenario -eq 'boss' -and (-not $after.bossDefeated -or $after.questStage -ne 4)) {
    throw "Boss completion failed (defeated=$($after.bossDefeated), quest=$($after.questStage))."
  }
  if ($Scenario -eq 'gate' -and $after.x -le 2010) { throw "Open gate did not allow passage (x=$($after.x))." }
  if ($Scenario -eq 'quest' -and ($after.mode -ne 'victory' -or $after.questStage -ne 5 -or -not $after.bossDefeated -or $after.crystals.Count -ne 3)) {
    throw "Main quest did not complete (mode=$($after.mode), quest=$($after.questStage), crystals=$($after.crystals.Count))."
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
    if ($afterDialogue.mode -ne 'playing' -or $afterDialogue.questStage -ne 1) {
      throw "Touch dialogue could not advance the quest (mode=$($afterDialogue.mode), quest=$($afterDialogue.questStage))."
    }
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
    fighterTreeDetailScreenshot = $fighterTreeDetailScreenshotPath
    fighterTreeBottomScreenshot = $fighterTreeBottomScreenshotPath
    monsterFacingRuntime = $monsterFacingRuntime
    guildBoardScreenshot = $guildBoardScreenshotPath
    guildCommissionScreenshot = $guildCommissionScreenshotPath
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

