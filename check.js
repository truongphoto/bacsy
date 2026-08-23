

(() => {
  const APP_VERSION='v1.0.24',BUILD_ID='24';
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false}),stage=document.getElementById('stage'),$=id=>document.getElementById(id);
  const DEBUG=new URLSearchParams(location.search).get('debug')==='1'; if(DEBUG)document.body.classList.add('debug-on');
  const logoImg=new Image(); logoImg.decoding='async'; logoImg.src='logo-gpp.png?v=24';
  let W=0,H=0,DPR=1,groundY=0; const GAME_H=720,BASE_GAME_W=1280,FIXED_MS=1000/60,PHYSICS={jump:-17.5,gravity:.82};
  let state='menu',score=0,coinCount=0,speed=5.25,time=0,shake=0;
  let menuConfirmReturnState='playing',menuConfirmFromBack=false,gameHistoryActive=false,pendingMenuHistoryBack=false;
  let muted=localStorage.getItem('doctor-rush-muted')==='1',vibrationEnabled=localStorage.getItem('doctor-rush-vibration')!=='0',difficulty=localStorage.getItem('doctor-rush-difficulty')||'medium';
  const difficultyConfigs={
    easy:{label:'DỄ',baseSpeed:3.40,maxSpeed:6.80,speedTau:260,challengeTau:300,firstEncounter:[150,240],airChance:[.035,.07],comboChance:[0,.012],movingAirChance:.90,gaps:[[850,1050],[600,760]],bonus:[240,380],gpp:[2100,3000]},
    medium:{label:'TRUNG BÌNH',baseSpeed:3.90,maxSpeed:8.20,speedTau:240,challengeTau:275,firstEncounter:[125,215],airChance:[.08,.16],comboChance:[0,.06],movingAirChance:.75,gaps:[[720,900],[500,650]],bonus:[310,500],gpp:[2100,3000]},
    hard:{label:'KHÓ',baseSpeed:4.40,maxSpeed:9.80,speedTau:220,challengeTau:250,firstEncounter:[105,195],airChance:[.15,.27],comboChance:[.01,.10],movingAirChance:.65,gaps:[[620,780],[420,560]],bonus:[390,610],gpp:[2100,3000]}
  }; if(!difficultyConfigs[difficulty])difficulty='medium';
  let health=10,maxHealth=10,shieldTimer=0,magnetTimer=0,hitCooldown=0,encounterTimer=0,pillTimer=0,bonusTimer=0,gppTimer=0,itemRefillTimer=0,visibleItemGoal=3,sceneTheme=0,gppCollected=0,firstObstacleSpawned=false;
  let gppNextEligibleTime=0,gppNextEligibleCoins=0,lastGppSpawnTime=-1e9,gppRewardPopupTimer=0,gppCelebrationTimer=0;
  const obstacles=[],items=[],particles=[],clouds=[],skyline=[],popups=[],scheduledSpawns=[];
  const deptLabels=['KHOA NHI','KHOA SẢN','KHOA DƯỢC','KHOA CẤP CỨU','KHOA NGOẠI','KHOA NỘI','KHOA XÉT NGHIỆM','KHOA TIM MẠCH'];
  const hero={x:150,y:0,w:62,h:74,vy:0,onGround:true,rot:0,run:0,crashTimer:0,crashVX:0};
  let audioCtx=null,lastBeepAt=0,assetsReady=false,quality='high',fps=60,fpsAccumMs=0,fpsFrames=0,goodFpsWindows=0,lastFrameTs=performance.now(),simAccumulator=0,simSteps=0,pendingVersionUpdate=false,pendingControllerReload=false,autoPausedReason='';
  const bestKey=d=>`doctor-rush-best-${d}`;
  const bestScores={easy:Number(localStorage.getItem(bestKey('easy'))||0),medium:Number(localStorage.getItem(bestKey('medium'))||0),hard:Number(localStorage.getItem(bestKey('hard'))||0)};
  const getBest=d=>bestScores[d]||0;
  function saveBest(d,value){bestScores[d]=value;localStorage.setItem(bestKey(d),String(value))}
  const totalStats={plays:Number(localStorage.getItem('doctor-rush-total-plays')||0),items:Number(localStorage.getItem('doctor-rush-total-items')||0)};
  const hudCache=Object.create(null);
  function hudText(id,value){const v=String(value);if(hudCache[id]!==v){$(id).textContent=v;hudCache[id]=v}}
  function hudDisplay(id,value){if(hudCache[id+'-display']!==value){$(id).style.display=value;hudCache[id+'-display']=value}}
  function hudStyle(id,prop,value){const key=id+'-'+prop;if(hudCache[key]!==value){$(id).style[prop]=value;hudCache[key]=value}}
  function beep(freq=440,dur=.06,type='sine',vol=.04){if(muted)return;const now=performance.now();if(now-lastBeepAt<22)return;lastBeepAt=now;try{audioCtx||=new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);o.stop(audioCtx.currentTime+dur)}catch(e){}}
  function vibrate(pattern){if(vibrationEnabled&&navigator.vibrate)try{navigator.vibrate(pattern)}catch(e){}}
  function fxBlur(v){return quality==='low'?0:v}
  function randomRange(a,b){return a+Math.random()*(b-a)}
  function distanceToFrames(dist){return Math.max(20,dist/Math.max(2.8,speed))}
  function isMobileLike(){return matchMedia('(pointer:coarse)').matches}
  function targetDPR(){const base=isMobileLike()?(quality==='low'?1:Math.min(devicePixelRatio||1,1.35)):(quality==='low'?Math.min(devicePixelRatio||1,1.35):Math.min(devicePixelRatio||1,2));return Math.max(1,base)}
  function resize(){const r=stage.getBoundingClientRect();DPR=targetDPR();const aspect=Math.max(16/9,r.width/Math.max(1,r.height));H=GAME_H;W=Math.round(GAME_H*aspect);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);groundY=H*.78;hero.x=Math.round(BASE_GAME_W*.117);if(state==='menu')hero.y=groundY-hero.h;buildScene()}
  function buildScene(){clouds.length=0;skyline.length=0;const cloudCount=quality==='low'?7:12;for(let i=0;i<cloudCount;i++){const layer=i<Math.ceil(cloudCount*.4)?.22:i<Math.ceil(cloudCount*.75)?.38:.55;clouds.push({x:Math.random()*W*1.35,y:28+Math.random()*H*.25,w:90+Math.random()*150,h:28+Math.random()*42,s:layer,a:.48+Math.random()*.24})}const layerSpecs=[{depth:.24,alpha:.24,minW:54,maxW:92,minH:58,maxH:108,spacing:[quality==='low'?14:8,quality==='low'?23:16],labelChance:.14,crossChance:.16,brandChance:.22,brandMode:'rear'},{depth:.50,alpha:.50,minW:76,maxW:128,minH:92,maxH:156,spacing:[quality==='low'?18:12,quality==='low'?30:22],labelChance:.32,crossChance:.24,brandChance:.12,brandMode:'mid'},{depth:.84,alpha:.84,minW:100,maxW:182,minH:128,maxH:220,spacing:[quality==='low'?26:18,quality==='low'?38:30],labelChance:.48,crossChance:.34,brandChance:0,brandMode:'front'}];layerSpecs.forEach((spec,layerIndex)=>{let x=layerIndex===0?0:layerIndex===1?20:40;while(x<W*1.95){const w=randomRange(spec.minW,spec.maxW),h=randomRange(spec.minH,spec.maxH),cols=Math.max(2,Math.floor(w/18)),rows=Math.max(3,Math.floor(h/22)),win=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const lit=Math.random()<(layerIndex===0?.35:layerIndex===1?.50:.64);win.push({r,c,tone:lit?(Math.random()<.54?'warm':'cool'):'off'})}skyline.push({x,w,h,depth:spec.depth,alpha:spec.alpha,cross:Math.random()<spec.crossChance,brand:Math.random()<spec.brandChance,brandMode:spec.brandMode,label:Math.random()<spec.labelChance?deptLabels[Math.floor(Math.random()*deptLabels.length)]:'',cols,rows,win,roof:Math.random()<.42?'flat':Math.random()<.5?'step':'dome'});x+=w+randomRange(spec.spacing[0],spec.spacing[1])}});skyline.sort((a,b)=>a.depth-b.depth)}
  addEventListener('resize',resize);resize();

  function reset(){
    score=0;coinCount=0;time=0;shake=0;sceneTheme=0;health=maxHealth;shieldTimer=0;magnetTimer=0;hitCooldown=0;gppCollected=0;firstObstacleSpawned=false;
    obstacles.length=items.length=particles.length=popups.length=scheduledSpawns.length=0;
    hero.x=Math.round(BASE_GAME_W*.117);hero.y=groundY-hero.h;hero.vy=0;hero.onGround=true;hero.rot=0;hero.run=0;hero.crashTimer=0;hero.crashVX=0;
    const cfg=difficultyConfigs[difficulty];speed=cfg.baseSpeed;encounterTimer=randomRange(cfg.firstEncounter[0],cfg.firstEncounter[1]);
    pillTimer=55;bonusTimer=randomRange(cfg.bonus[0],cfg.bonus[1]);gppTimer=0;itemRefillTimer=0;visibleItemGoal=2+Math.floor(Math.random()*5);
    gppRewardPopupTimer=0;gppCelebrationTimer=0;lastGppSpawnTime=-1e9;scheduleNextGPP(true);
    lastFrameTs=performance.now();simAccumulator=0;simSteps=0;updateHUD();
    // Bắt đầu ván với vật phẩm đã nằm trong khung hình, tránh khoảng trống nhàm chán.
    spawnContinuousItemCluster(true);
  }
  function isInstalled(){return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true}
  async function requestLandscape(){try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch(e){}}
  async function requestAppFullscreen(){if(!isMobileLike()||document.fullscreenElement||isInstalled())return;try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch(e){}}
  function showPanel(id){['startPanel','gameOverPanel','tutorialPanel'].forEach(x=>$(x).classList.toggle('hidden',x!==id));if(id)stage.classList.remove('game-active')}
  function armGameHistory(){if(!isMobileLike()||gameHistoryActive)return;try{history.pushState({doctorRushGame:true},'',location.href);gameHistoryActive=true}catch(e){}}
  function openMenuConfirm(fromBack=false){if(!['playing','paused'].includes(state))return;menuConfirmReturnState=state;menuConfirmFromBack=fromBack;if(state==='playing')state='paused';$('menuConfirmLayer').classList.remove('hidden');vibrate(8)}
  function closeMenuConfirm(){if($('menuConfirmLayer').classList.contains('hidden'))return;$('menuConfirmLayer').classList.add('hidden');if(menuConfirmFromBack){armGameHistory();menuConfirmFromBack=false}state=menuConfirmReturnState;if(state==='playing'){lastFrameTs=performance.now();simAccumulator=0}}
  function goMainMenuCore(){menuConfirmFromBack=false;$('menuConfirmLayer').classList.add('hidden');state='menu';autoPausedReason='';showPanel('startPanel');updateHUD();if(pendingVersionUpdate)applyPendingUpdate()}
  function requestMainMenu(){if(['playing','paused'].includes(state)){openMenuConfirm(false);return}if(['over','crash'].includes(state)){returnToMainMenu()} }
  function returnToMainMenu(){
    if(isMobileLike()&&gameHistoryActive){pendingMenuHistoryBack=true;gameHistoryActive=false;try{history.back();setTimeout(()=>{if(pendingMenuHistoryBack){pendingMenuHistoryBack=false;goMainMenuCore()}},180);return}catch(e){pendingMenuHistoryBack=false}}
    goMainMenuCore()
  }
  function beginRun(){reset();state='playing';showPanel('');stage.classList.add('game-active');armGameHistory();totalStats.plays++;localStorage.setItem('doctor-rush-total-plays',totalStats.plays);beep(540,.08,'triangle',.05);vibrate(18)}
  let tutorialTimer=null,tutorialStartedAt=0;
  function stopTutorialTimer(){if(tutorialTimer){clearInterval(tutorialTimer);tutorialTimer=null}}
  function finishTutorialAndStart(){stopTutorialTimer();localStorage.setItem('doctor-rush-tutorial-done','1');beginRun()}
  function showTutorial(){showPanel('tutorialPanel');tutorialStartedAt=performance.now();$('tutorialProgress').style.width='0%';$('tutorialCountdown').textContent='Tự bắt đầu sau 7 giây';stopTutorialTimer();tutorialTimer=setInterval(()=>{const elapsed=performance.now()-tutorialStartedAt,p=Math.min(1,elapsed/7000);$('tutorialProgress').style.width=`${p*100}%`;$('tutorialCountdown').textContent=`Tự bắt đầu sau ${Math.max(0,Math.ceil((7000-elapsed)/1000))} giây`;if(p>=1)finishTutorialAndStart()},100)}
  async function requestStart(){if(!assetsReady)return;await requestAppFullscreen();await requestLandscape();if(localStorage.getItem('doctor-rush-tutorial-done')!=='1')showTutorial();else beginRun()}
  function jump(){if(state!=='playing')return;if(hero.onGround){hero.vy=PHYSICS.jump;hero.onGround=false;burst(hero.x+26,groundY-4,10,'dust');beep(640,.055,'square',.03);vibrate(8)}}
  function burst(x,y,n,type='spark'){const count=quality==='low'?Math.max(3,Math.ceil(n*.58)):n;for(let i=0;i<count;i++){if(particles.length>90)particles.shift();particles.push({x,y,vx:(Math.random()-.5)*7,vy:(Math.random()-.75)*7,life:25+Math.random()*25,size:2+Math.random()*4,type})}}
  function addPopup(x,y,text,color='#ff6879',size=22){if(popups.length>8)popups.shift();popups.push({x,y,text,color,size,life:72,maxLife:72,vy:-.82})}

  function pickGroundType(){
    const roll=Math.random();
    if(difficulty==='easy'){
      if(roll<.70) return {kind:'virus1',damage:1,w:42,h:42};
      return {kind:'virus2',damage:2,w:52,h:50};
    }
    if(difficulty==='medium'){
      if(roll<.32) return {kind:'virus1',damage:1,w:42,h:42};
      if(roll<.63) return {kind:'virus2',damage:2,w:52,h:50};
      if(roll<.87) return {kind:'bio',damage:3,w:54,h:56};
      return {kind:'toxic',damage:4,w:58,h:62};
    }
    if(roll<.24) return {kind:'virus1',damage:1,w:42,h:42};
    if(roll<.48) return {kind:'virus2',damage:2,w:52,h:50};
    if(roll<.70) return {kind:'bio',damage:3,w:54,h:56};
    if(roll<.95) return {kind:'toxic',damage:4,w:58,h:62};
    return {kind:'hazard5',damage:5,w:64,h:68};
  }
  function pickAirType(opts={}){
    if(opts.moving){
      const roll=Math.random();
      if(roll<.46) return {kind:'drone',damage:1,w:60,h:36,moving:true,amplitude:16,bottomLimit:groundY-46};
      if(roll<.82) return {kind:'rotorvirus',damage:1,w:58,h:58,moving:true,amplitude:20,spinSpeed:.18,bottomLimit:groundY-52};
      return {kind:'scarecrowl',damage:1,w:60,h:36,moving:true,amplitude:42,spinSpeed:.06,bottomLimit:groundY-52};
    }
    const roll=Math.random();
    if(difficulty==='easy'){
      return roll<.72 ? {kind:'batvirus',damage:1,w:54,h:40,moving:false,driftX:.35} : {kind:'nightreaper',damage:2,w:62,h:38,moving:false,driftX:.50};
    }
    if(difficulty==='medium'){
      if(roll<.38) return {kind:'batvirus',damage:2,w:54,h:40,moving:false,driftX:.50};
      if(roll<.68) return {kind:'nightreaper',damage:2,w:62,h:38,moving:false,driftX:.70};
      if(roll<.90) return {kind:'spikeball',damage:3,w:54,h:54,moving:false,spinSpeed:.1};
      return {kind:'airmine4',damage:4,w:60,h:60,moving:false,spinSpeed:.13};
    }
    if(roll<.28) return {kind:'batvirus',damage:2,w:54,h:40,moving:false,driftX:.65};
    if(roll<.52) return {kind:'nightreaper',damage:2,w:62,h:38,moving:false,driftX:.90};
    if(roll<.82) return {kind:'spikeball',damage:3,w:54,h:54,moving:false,spinSpeed:.1};
    if(roll<.95) return {kind:'airmine4',damage:4,w:60,h:60,moving:false,spinSpeed:.13};
    return {kind:'airmine5',damage:5,w:60,h:60,moving:false,spinSpeed:.14};
  }
  function spawnLineX(){return hero.x+1220}
  function canSpawnAt(x,lane,minDist=190){return!obstacles.some(o=>Math.abs(o.x-x)<minDist&&(o.lane===lane||Math.abs((o.y+o.h/2)-(groundY-130))<95))}
  function makeGroundObstacle(type=null,x=spawnLineX()){const t=type||pickGroundType();return{x,y:groundY-t.h,w:t.w,h:t.h,kind:t.kind,damage:t.damage,pulse:Math.random()*6,lane:'ground',warned:false}}
  function makeAirObstacle(opts={},x=spawnLineX()){const t=pickAirType(opts),baseY=opts.baseY??(t.moving?randomRange(groundY-205,groundY-160):randomRange(groundY-248,groundY-190));return{x,y:baseY,w:t.w,h:t.h,kind:t.kind,damage:t.damage,pulse:Math.random()*6,lane:'air',moving:!!t.moving,baseY,phase:Math.random()*Math.PI*2,bottomLimit:t.bottomLimit||groundY-92,amplitude:t.amplitude||0,spinSpeed:t.spinSpeed||0,driftX:t.driftX||0,warned:false}}
  function itemSafetyEnvelope(){return difficulty==='easy'?420:difficulty==='medium'?360:320}
  function obstacleSpawnSafeFromItems(x=spawnLineX()){const margin=itemSafetyEnvelope();return !items.some(it=>Math.abs(it.x-x)<margin)}
  function collectiblePlanSafe(plan,margin=360){if(!plan.length)return false;const minX=Math.min(...plan.map(p=>p.x))-margin,maxX=Math.max(...plan.map(p=>p.x))+margin;return !obstacles.some(o=>o.x+o.w>minX&&o.x<maxX)}
  function spawnGroundObstacle(type=null,x=spawnLineX()){const o=makeGroundObstacle(type,x);if(canSpawnAt(x,'ground')&&obstacleSpawnSafeFromItems(x))obstacles.push(o);return o}
  function spawnAirObstacle(opts={},x=spawnLineX()){const o=makeAirObstacle(opts,x);if(canSpawnAt(x,'air')&&obstacleSpawnSafeFromItems(x))obstacles.push(o);return o}
  function scheduleSpawn(delayFrames,type,opts={}){scheduledSpawns.push({delay:delayFrames,type,opts})}
  function progressStage(){if(coinCount>=1000)return 3;if(coinCount>=500)return 2;if(coinCount>=250)return 1;return 0}
  function lerp(a,b,t){return a+(b-a)*Math.max(0,Math.min(1,t))}
  function challengeProgress(){
    const cfg=difficultyConfigs[difficulty],seconds=time/60;
    const timeP=1-Math.exp(-seconds/cfg.challengeTau),itemP=1-Math.exp(-coinCount/800);
    return Math.max(0,Math.min(1,timeP*.78+itemP*.22));
  }
  function jumpRecoveryDistance(){const flight=2*Math.abs(PHYSICS.jump)/PHYSICS.gravity;return speed*flight+84}
  function patternHasEscapePath(primaryLane,secondaryLane,distance,primaryMoving=false,secondaryMoving=false){if(primaryMoving||secondaryMoving)return false;if(primaryLane==='ground'&&secondaryLane==='air')return distance>=jumpRecoveryDistance();if(primaryLane==='air'&&secondaryLane==='ground')return distance>=Math.max(300,speed*22);return distance>=jumpRecoveryDistance()+70}
  function spawnEncounter(){
    const cfg=difficultyConfigs[difficulty],lineX=spawnLineX();
    // Vật cản đầu tiên luôn là vật cản đất -1, xuất hiện sớm nhưng vẫn nằm sau cụm vật phẩm một khoảng an toàn.
    if(!firstObstacleSpawned){
      const rightmost=items.length?Math.max(...items.map(it=>it.x)):hero.x+320;
      const firstX=Math.max(lineX,rightmost+itemSafetyEnvelope());
      const starter={kind:'virus1',damage:1,w:42,h:42};
      const o=makeGroundObstacle(starter,firstX);
      if(canSpawnAt(firstX,'ground',180)){obstacles.push(o);firstObstacleSpawned=true;const gap=cfg.gaps[0];encounterTimer=distanceToFrames(randomRange(gap[0],gap[1]));return}
      encounterTimer=18;return;
    }
    // Vật phẩm vẫn được ưu tiên, nhưng chỉ trì hoãn ngắn để không tạo những đoạn quá dài không có vật cản.
    if(!obstacleSpawnSafeFromItems(lineX)){encounterTimer=18;return}
    const p=challengeProgress();
    const airChance=lerp(cfg.airChance[0],cfg.airChance[1],p),comboChance=lerp(cfg.comboChance[0],cfg.comboChance[1],p);
    const primaryAir=Math.random()<airChance,primaryMoving=primaryAir&&Math.random()<cfg.movingAirChance;
    if(primaryAir)spawnAirObstacle({moving:primaryMoving});else spawnGroundObstacle();
    let usedCombo=false;
    if(!primaryMoving&&Math.random()<comboChance){
      const secondaryLane=primaryAir?'ground':'air',desired=difficulty==='easy'?randomRange(650,780):difficulty==='medium'?randomRange(560,700):randomRange(500,650),safeDistance=Math.max(desired,primaryAir?Math.max(390,speed*26):jumpRecoveryDistance()+90);
      if(patternHasEscapePath(primaryAir?'air':'ground',secondaryLane,safeDistance,false,false)){
        scheduleSpawn(distanceToFrames(safeDistance),secondaryLane,secondaryLane==='air'?{moving:false,baseY:groundY-245}:{});usedCombo=true;encounterTimer=distanceToFrames(safeDistance+randomRange(420,560));
      }
    }
    if(!usedCombo){
      const minGap=lerp(cfg.gaps[0][0],cfg.gaps[1][0],p),maxGap=lerp(cfg.gaps[0][1],cfg.gaps[1][1],p);
      encounterTimer=distanceToFrames(randomRange(minGap,maxGap));
    }
  }
  function collectibleTopLimit(kind='pill',r=11){const apex=PHYSICS.jump*PHYSICS.jump/(2*PHYSICS.gravity),pickupRange=kind==='gpp'?30:kind==='medkit'?28:24,heroCenterAtApex=groundY-hero.h/2-apex;return heroCenterAtApex-(r+pickupRange)+12}
  function clampCollectibleY(y,kind='pill',r=11){return Math.max(collectibleTopLimit(kind,r),Math.min(groundY-52,y))}
  function jumpFlightSteps(){let y=0,vy=PHYSICS.jump,steps=0;while(steps<120){vy+=PHYSICS.gravity;y+=vy;steps++;if(y>=0&&steps>2)break}return steps}
  function heroPickupYAtStep(t){const top=groundY-hero.h+PHYSICS.jump*t+PHYSICS.gravity*t*(t+1)/2;return top+hero.h*.45}
  function visibleCollectibleCount(){return items.reduce((n,it)=>n+(it.x>hero.x+95&&it.x<W-18?1:0),0)}
  function countOnScreen(kind){return items.reduce((n,it)=>n+((!kind||it.kind===kind)&&it.x>-80&&it.x<W+80?1:0),0)}
  function scheduleNextGPP(initial=false){
    const sec=initial?randomRange(20,25):randomRange(35,50);
    const itemsNeed=initial?randomRange(20,25):randomRange(40,60);
    gppNextEligibleTime=time+sec*60;
    gppNextEligibleCoins=coinCount+itemsNeed;
  }
  function directionalCollectibleSafe(plan,leftMargin=170,rightMargin=390){
    if(!plan.length)return false;
    const minX=Math.min(...plan.map(p=>p.x))-leftMargin,maxX=Math.max(...plan.map(p=>p.x))+rightMargin;
    return !obstacles.some(o=>o.x+o.w>minX&&o.x<maxX);
  }
  function buildPillRowPlan(kind,n,lowRow=false,rowSpeed=Math.max(4.2,speed),preferredStart=null){
    const offsets=[],ys=[];
    if(lowRow){
      const y=clampCollectibleY(groundY-randomRange(58,74),kind,11);
      for(let i=0;i<n;i++){offsets.push(i*44);ys.push(y)}
    }else{
      const flight=Math.max(32,jumpFlightSteps()-4);
      for(let i=0;i<n;i++){const ratio=i/(n-1||1),t=ratio*flight;offsets.push(rowSpeed*t);ys.push(clampCollectibleY(heroPickupYAtStep(t)-2,kind,11))}
    }
    const width=offsets.length?Math.max(...offsets):0;
    const naturalStart=Math.max(hero.x+330,W-width-randomRange(82,155));
    const startX=preferredStart==null?naturalStart:preferredStart;
    return offsets.map((dx,i)=>({x:startX+dx,y:ys[i]}));
  }
  function makeContinuousPlan(n=null,forceLow=false,shift=0){
    const count=n??(2+Math.floor(Math.random()*5));
    const commonKinds=['pill','capsule','tablet'],kind=commonKinds[Math.floor(Math.random()*commonKinds.length)];
    const lowRow=forceLow||Math.random()<.48;
    const base=buildPillRowPlan(kind,count,lowRow);
    if(shift)for(const pt of base)pt.x-=shift;
    return {kind,plan:base};
  }
  function spawnContinuousItemCluster(force=false){
    const visible=visibleCollectibleCount();
    if(!force&&visible>=Math.max(2,visibleItemGoal))return false;
    const need=Math.max(2,visibleItemGoal-visible);
    const count=Math.min(6,Math.max(2,need+Math.floor(Math.random()*3)));
    const rightMargin=difficulty==='easy'?430:difficulty==='medium'?390:350;
    const shifts=[0,120,240,360,480,600];
    for(const shift of shifts){
      const pack=makeContinuousPlan(count,Math.random()<.50,shift);
      const minX=Math.min(...pack.plan.map(p=>p.x));
      if(minX<hero.x+250)continue;
      if(directionalCollectibleSafe(pack.plan,150,rightMargin)){
        for(const pt of pack.plan)items.push({x:pt.x,y:pt.y,r:11,t:Math.random()*6,kind:pack.kind});
        visibleItemGoal=2+Math.floor(Math.random()*5);
        // Ưu tiên phần thưởng: nới thời điểm sinh vật cản để không biến vật phẩm thành mồi bẫy.
        if(firstObstacleSpawned)encounterTimer=Math.max(encounterTimer,distanceToFrames(difficulty==='easy'?330:difficulty==='medium'?285:245));
        return true;
      }
    }
    return false;
  }
  function ensureVisibleCollectibles(dt=1){
    itemRefillTimer=Math.max(0,itemRefillTimer-dt);
    const visible=visibleCollectibleCount();
    if(visible>=2)return;
    if(itemRefillTimer>0)return;
    // Nếu khung hình sắp trống, vật phẩm được quyền ưu tiên trước encounter tiếp theo.
    if(firstObstacleSpawned)encounterTimer=Math.max(encounterTimer,distanceToFrames(difficulty==='easy'?300:difficulty==='medium'?260:225));
    itemRefillTimer=spawnContinuousItemCluster(false)?24:12;
  }
  function spawnPillRow(){
    const visible=visibleCollectibleCount();if(visible>=7)return false;
    const n=Math.min(2+Math.floor(Math.random()*5),Math.max(2,8-visible)),commonKinds=['pill','capsule','tablet'],rowKind=commonKinds[Math.floor(Math.random()*commonKinds.length)],lowRow=Math.random()<.44,plan=buildPillRowPlan(rowKind,n,lowRow);
    if(!directionalCollectibleSafe(plan,170,difficulty==='easy'?450:difficulty==='medium'?410:370))return false;
    for(const pt of plan)items.push({x:pt.x,y:pt.y,r:11,t:Math.random()*6,kind:rowKind});
    return true;
  }
  function spawnBonusItem(){
    const roll=Math.random(),kind=roll<.46?'bottle':roll<.78?'syringe':'medkit',r=15,y=clampCollectibleY(groundY-randomRange(95,175),kind,r),candidate={x:Math.max(hero.x+430,W-randomRange(100,185)),y};
    if(!directionalCollectibleSafe([candidate],170,difficulty==='easy'?470:difficulty==='medium'?430:390))return false;
    items.push({x:candidate.x,y,r,t:Math.random()*6,kind});return true;
  }
  function spawnGPP(){
    if(countOnScreen('gpp')>0)return false;
    const r=20,y=clampCollectibleY(groundY-randomRange(108,176),'gpp',r),candidate={x:Math.max(hero.x+520,W-randomRange(130,210)),y};
    if(!directionalCollectibleSafe([candidate],280,difficulty==='easy'?760:difficulty==='medium'?700:650))return false;
    items.push({x:candidate.x,y,r,t:0,kind:'gpp',announced:false});
    lastGppSpawnTime=time;
    encounterTimer=Math.max(encounterTimer,distanceToFrames(difficulty==='easy'?560:difficulty==='medium'?520:480));
    return true;
  }
  function heroHitbox(){return{x:hero.x+10,y:hero.y+8,w:hero.w-19,h:hero.h-13}}
  function obstacleHitbox(o){const ix=o.lane==='air'?8:7,iy=o.lane==='air'?7:6;return{x:o.x+ix,y:o.y+iy,w:Math.max(8,o.w-ix*2),h:Math.max(8,o.h-iy*2)}}
  function boxesOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function finishGameOver(){state='over';const s=Math.floor(score),oldBest=getBest(difficulty),isNew=s>oldBest,newBestValue=Math.max(oldBest,s);if(isNew)saveBest(difficulty,s);totalStats.items+=coinCount;localStorage.setItem('doctor-rush-total-items',totalStats.items);$('finalScore').textContent=s;$('finalCoins').textContent=coinCount;$('finalTime').textContent=`${Math.floor(time/60)}s`;$('finalGpp').textContent=gppCollected;$('finalDifficulty').textContent=difficultyConfigs[difficulty].label;$('finalBest').textContent=newBestValue;$('newBest').textContent=isNew?'★ Kỷ lục mới của cấp độ này!':'';updateHUD();showPanel('gameOverPanel');if(pendingVersionUpdate)showUpdateToast('Bản mới đã sẵn sàng • về Màn hình chính để cập nhật')}
  function gameOver(){if(state!=='playing')return;state='crash';shake=16;hero.crashTimer=34;hero.crashVX=4.6;hero.vy=-8.6;hero.onGround=false;hero.rot=-.18;burst(hero.x+hero.w/2,hero.y+hero.h/2,22,'spark');burst(hero.x+hero.w*.78,hero.y+hero.h*.26,9,'mask');beep(130,.25,'sawtooth',.055);vibrate([90,45,130])}
  function currentSpeed(){const cfg=difficultyConfigs[difficulty],seconds=time/60;return cfg.maxSpeed-(cfg.maxSpeed-cfg.baseSpeed)*Math.exp(-seconds/cfg.speedTau)}
  function updateHUD(){
    hudText('score',Math.floor(score));hudText('coins',coinCount);hudText('difficultyChip',difficultyConfigs[difficulty].label);hudText('best',getBest(difficulty));
    const shieldOn=shieldTimer>0,magnetOn=magnetTimer>0;hudDisplay('shieldChip',shieldOn?'flex':'none');hudDisplay('magnetChip',magnetOn?'flex':'none');
    if(shieldOn)hudText('shieldTime',`${Math.ceil(shieldTimer/60)}s`);if(magnetOn)hudText('magnetTime',`${Math.ceil(magnetTimer/60)}s`);
    const ratio=health/maxHealth;hudText('healthText',`${health}/${maxHealth}`);hudStyle('healthFill','width',`${ratio*100}%`);
    const healthBg=ratio>.6?'linear-gradient(90deg,#18cd88,#69dd60)':ratio>.3?'linear-gradient(90deg,#ffd85a,#ffb347)':'linear-gradient(90deg,#ff7286,#ff3c5f)';hudStyle('healthFill','background',healthBg);
  }
  function handleDamage(dmg,x,y){if(hitCooldown>0||state!=='playing')return;if(shieldTimer>0){burst(x,y,18,'ice');addPopup(hero.x+hero.w/2,hero.y-16,'🛡 KHIÊN CHẶN ĐÒN','#168fd0',22);beep(220,.08,'square',.04);vibrate(10);return}health=Math.max(0,health-dmg);hitCooldown=28;shake=dmg>=5?16:10;addPopup(hero.x+hero.w/2,hero.y-18,`-${dmg} SINH TỒN`,'#ff405c',dmg>=5?30:26);burst(x,y,dmg>=5?22:14,'spark');beep(dmg>=5?150:210,dmg>=5?.14:.08,dmg>=5?'sawtooth':'square',dmg>=5?.055:.04);vibrate(dmg>=5?[80,35,110]:dmg>=3?[45,25,55]:18);$('flash').classList.remove('on');void $('flash').offsetWidth;$('flash').classList.add('on');updateHUD();if(health<=0)gameOver()}

  function update(dt=1){
    if(state==='crash'){
      time+=dt;hero.run+=speed*.04*dt;hero.x+=hero.crashVX*dt;hero.crashVX*=Math.pow(.96,dt);hero.vy+=.9*dt;hero.y+=hero.vy*dt;hero.rot+=.17*dt;
      if(hero.y>=groundY-hero.h){hero.y=groundY-hero.h;hero.vy=-hero.vy*.18;if(Math.abs(hero.vy)<1.2)hero.vy=0}
      const before=hero.crashTimer;hero.crashTimer-=dt;if(before>20&&hero.crashTimer<=20)burst(hero.x+hero.w*.82,hero.y+hero.h*.18,8,'mask');if(hero.crashTimer<=0)finishGameOver();
      for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.18*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
      for(let i=popups.length-1;i>=0;i--){const p=popups[i];p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)popups.splice(i,1)}
      shake*=Math.pow(.9,dt);return;
    }
    if(state!=='playing')return;
    time+=dt;speed=currentSpeed();score+=.09*speed*dt;hero.run+=speed*.1*dt;sceneTheme+=(progressStage()-sceneTheme)*Math.min(1,.015*dt);
    if(shieldTimer>0)shieldTimer=Math.max(0,shieldTimer-dt);if(magnetTimer>0)magnetTimer=Math.max(0,magnetTimer-dt);if(hitCooldown>0)hitCooldown=Math.max(0,hitCooldown-dt);
    hero.vy+=PHYSICS.gravity*dt;hero.y+=hero.vy*dt;if(hero.y>=groundY-hero.h){hero.y=groundY-hero.h;hero.vy=0;hero.onGround=true;hero.rot*=Math.pow(.7,dt)}else hero.rot=Math.max(-.2,Math.min(.26,hero.vy*.012));
    encounterTimer-=dt;if(encounterTimer<=0)spawnEncounter();
    for(let i=scheduledSpawns.length-1;i>=0;i--){const s=scheduledSpawns[i];s.delay-=dt;if(s.delay<=0){if(!obstacleSpawnSafeFromItems(spawnLineX())){s.delay=distanceToFrames(difficulty==='easy'?300:240);continue}if(s.type==='ground')spawnGroundObstacle();else spawnAirObstacle(s.opts);scheduledSpawns.splice(i,1)}}
    ensureVisibleCollectibles(dt);pillTimer-=dt;if(pillTimer<=0){pillTimer=spawnPillRow()?(85+Math.random()*95):28}
    bonusTimer-=dt;if(bonusTimer<=0){const cfg=difficultyConfigs[difficulty];bonusTimer=spawnBonusItem()?randomRange(cfg.bonus[0],cfg.bonus[1]):70}
    if(gppRewardPopupTimer>0){const before=gppRewardPopupTimer;gppRewardPopupTimer=Math.max(0,gppRewardPopupTimer-dt);if(before>0&&gppRewardPopupTimer===0){addPopup(hero.x+hero.w/2,hero.y-28,'★ GPP ĐẶC BIỆT','#087d70',22);addPopup(hero.x+hero.w/2,hero.y-2,'+100 ĐIỂM • +4 SINH TỒN • 🛡 10s • 🧲 8s','#168fd0',18);updateHUD()}}
    if(gppCelebrationTimer>0)gppCelebrationTimer=Math.max(0,gppCelebrationTimer-dt);
    const gppCooldownPassed=time-lastGppSpawnTime>=30*60;
    const gppEligible=(time>=gppNextEligibleTime||coinCount>=gppNextEligibleCoins);
    if(gppCooldownPassed&&gppEligible&&countOnScreen('gpp')===0){ if(spawnGPP()) scheduleNextGPP(false); else gppNextEligibleTime=time+45; }
    for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.x-=(speed+(o.lane==='air'?(o.driftX||0):0))*dt;if(o.lane==='air'&&o.moving){const amp=o.amplitude||18;o.y=o.baseY+Math.sin(time*.065+o.phase)*amp;const maxY=o.bottomLimit-o.h;if(o.y>maxY)o.y=maxY}if(o.damage===5&&!o.warned&&o.x-hero.x<390&&o.x>hero.x){o.warned=true;addPopup(o.x+o.w/2,Math.max(80,o.y-20),'⚠ NGUY HIỂM','#d73554',20);beep(300,.08,'square',.038);vibrate([25,25,25])}if(o.x+o.w<-110){obstacles.splice(i,1);continue}if(boxesOverlap(heroHitbox(),obstacleHitbox(o))){handleDamage(o.damage,o.x+o.w/2,o.y+o.h/2);obstacles.splice(i,1)}}
    for(let i=items.length-1;i>=0;i--){const c=items[i];c.x-=speed*dt;c.t+=.12*dt;if(c.x<-70){items.splice(i,1);continue}const hx=hero.x+hero.w*.55,hy=hero.y+hero.h*.45;if(magnetTimer>0){const mx=hx-c.x,my=hy-c.y,md2=mx*mx+my*my;if(md2<340*340){const pull=Math.min(.16,.055*dt+.03*(1-Math.sqrt(md2)/340));c.x+=mx*pull;c.y+=my*pull}}const range=c.kind==='gpp'?30:c.kind==='medkit'?28:24;if(c.kind==='gpp'&&!c.announced&&c.x<W-120){c.announced=true;addPopup(c.x,c.y-36,'★ GPP ĐẶC BIỆT','#0f8d80',18);burst(c.x,c.y,14,'gpp');beep(760,.06,'triangle',.032)}const dx=hx-c.x,dy=hy-c.y;if(c.kind==='gpp'&&Math.random()<.38*dt){particles.push({x:c.x-randomRange(10,32),y:c.y+randomRange(-12,12),vx:-randomRange(.4,1.1),vy:randomRange(-.2,.2),life:16+Math.random()*12,size:2+Math.random()*2,type:'star'})}if(dx*dx+dy*dy<(c.r+range)*(c.r+range)){coinCount++;if([250,500,1000].includes(coinCount)){addPopup(W*.5,H*.14,`MỐC ${coinCount} VẬT PHẨM`,'#0d8c98',28);beep(700,.14,'triangle',.04);vibrate([25,20,25])}if(c.kind==='gpp'){gppCollected++;health=Math.min(maxHealth,health+4);shieldTimer=Math.max(shieldTimer,10*60);magnetTimer=Math.max(magnetTimer,8*60);score+=100;gppCelebrationTimer=28;gppRewardPopupTimer=28;burst(c.x,c.y,34,'gpp');burst(c.x,c.y,12,'star');beep(930,.17,'triangle',.055);beep(1160,.11,'sine',.032);vibrate([22,18,34]);$('flash').classList.remove('on');void $('flash').offsetWidth;$('flash').classList.add('on')}else if(c.kind==='medkit'){health=Math.min(maxHealth,health+1);score+=24;addPopup(hero.x+hero.w/2,hero.y-20,'+24 ĐIỂM • +1 SINH TỒN','#168f69',22);burst(c.x,c.y,12,'ice');beep(760,.08,'triangle',.035);vibrate(12)}else if(c.kind==='syringe'){score+=22;addPopup(hero.x+hero.w/2,hero.y-20,'+22 ĐIỂM','#357bd1',24);burst(c.x,c.y,10,'ice');beep(820,.06,'sine',.03)}else if(c.kind==='bottle'){score+=18;magnetTimer=Math.max(magnetTimer,8*60);addPopup(hero.x+hero.w/2,hero.y-20,'+18 ĐIỂM • NAM CHÂM 8s','#8150ca',22);burst(c.x,c.y,12,'ice');beep(760,.08,'triangle',.035);vibrate(12)}else if(c.kind==='capsule'){score+=16;addPopup(hero.x+hero.w/2,hero.y-20,'+16 ĐIỂM','#ef763b',24);burst(c.x,c.y,8,'gold');beep(900,.045,'sine',.03)}else if(c.kind==='tablet'){score+=12;addPopup(hero.x+hero.w/2,hero.y-20,'+12 ĐIỂM','#268fc2',24);burst(c.x,c.y,7,'gold');beep(860,.045,'sine',.028)}else{score+=10;addPopup(hero.x+hero.w/2,hero.y-20,'+10 ĐIỂM','#ed5067',24);burst(c.x,c.y,7,'gold');beep(980,.045,'sine',.03)}items.splice(i,1);updateHUD()}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.18*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
    for(let i=popups.length-1;i>=0;i--){const p=popups[i];p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)popups.splice(i,1)}
    shake*=Math.pow(.9,dt);ensureVisibleCollectibles(0);updateHUD();
  }

  function roundedRect(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); }
  function bg(){
    const phase=(Math.sin(time/700)+1)/2;
    const themeHue=(sceneTheme*18)%360;
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,`hsla(${186+themeHue*.25+phase*6}, 74%, 95%, 1)`);
    sky.addColorStop(.58,`hsla(${189+themeHue*.25+phase*8}, 78%, ${82-Math.sin(sceneTheme)*3}%, 1)`);
    sky.addColorStop(1,`hsla(${192+themeHue*.22}, 72%, ${78-Math.cos(sceneTheme)*4}%, 1)`);
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);

    const sun=ctx.createRadialGradient(W*.84,H*.18,10,W*.84,H*.18,H*.14);
    sun.addColorStop(0,'rgba(255,255,255,.95)'); sun.addColorStop(.4,'rgba(255,250,210,.8)'); sun.addColorStop(1,'rgba(255,250,210,0)');
    ctx.fillStyle=sun; ctx.fillRect(0,0,W,H);

    // Logo GPP nền thu gọn: cố định, căn giữa cụm chữ BỆNH VIỆN, nằm phía sau chữ và chìm nhẹ vào nền.
    if(logoImg.complete && logoImg.naturalWidth){
      const giantSize=Math.min(H*.38,W*.25);
      const giantX=W*.58-giantSize*.5;
      const giantY=H*.18-giantSize*.50;
      ctx.save();
      ctx.globalCompositeOperation='multiply';
      ctx.globalAlpha=.105;
      ctx.filter='blur(.8px)';
      ctx.drawImage(logoImg,giantX,giantY,giantSize,giantSize);
      ctx.filter='none';
      ctx.restore();
      // Lớp sương rất nhẹ giúp logo chìm vào hậu cảnh thay vì trông như vật phẩm.
      ctx.save();
      ctx.globalAlpha=.085;
      ctx.fillStyle='rgba(235,251,253,.92)';
      ctx.filter='blur(7px)';
      ctx.beginPath();
      ctx.ellipse(W*.58,H*.19,giantSize*.34,giantSize*.19,0,0,Math.PI*2);
      ctx.fill();
      ctx.filter='none';
      ctx.restore();
    }

    ctx.save(); ctx.font=`900 ${Math.min(140,W*.12)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='rgba(32,132,146,.20)'; ctx.fillText('BỆNH VIỆN', W*.58, H*.18); ctx.restore();

    skyline.forEach(b=>{
      let x=(b.x-time*speed*b.depth*.12)%(W*2.05); if(x<-b.w-30) x+=W*2.05;
      const y=groundY-b.h, alpha=b.alpha;
      ctx.save(); ctx.globalAlpha=alpha;
      const hue=190+themeHue*.16+b.depth*8;
      const topL = 88 - b.depth*12 + Math.sin(sceneTheme*.7+b.depth)*2;
      const botL = 68 - b.depth*18 + Math.cos(sceneTheme*.5+b.depth)*2;
      const g=ctx.createLinearGradient(0,y,0,y+b.h); g.addColorStop(0,`hsla(${hue}, 48%, ${topL}%, ${.96*alpha})`); g.addColorStop(1,`hsla(${hue+4}, 38%, ${botL}%, ${alpha})`); ctx.fillStyle=g;
      if(b.roof==='step'){ roundedRect(x+8,y+12,b.w-16,b.h-12,10); ctx.fill(); roundedRect(x,y+28,b.w,b.h-28,10); ctx.fill(); }
      else if(b.roof==='dome'){ roundedRect(x,y+18,b.w,b.h-18,10); ctx.fill(); ctx.beginPath(); ctx.ellipse(x+b.w*.5,y+18,b.w*.22,16,0,Math.PI,0,true); ctx.fill(); }
      else { roundedRect(x,y,b.w,b.h,10); ctx.fill(); }
      ctx.strokeStyle=`rgba(255,255,255,${.22+.25*alpha})`; ctx.lineWidth=1.1; ctx.stroke();

      const padX=Math.max(8,b.w*.08), padTop=18, spacingX=(b.w-padX*2)/Math.max(1,b.cols), spacingY=(b.h-padTop-18)/Math.max(1,b.rows);
      b.win.forEach(win=>{ const wx=x+padX+win.c*spacingX+1, wy=y+padTop+win.r*spacingY, ww=Math.min(10,spacingX*.48), wh=Math.min(12,spacingY*.46); if(win.tone==='warm') ctx.fillStyle=`rgba(255,236,185,${.22+.42*alpha})`; else if(win.tone==='cool') ctx.fillStyle=`rgba(217,247,255,${.2+.36*alpha})`; else ctx.fillStyle=`rgba(64,124,136,${.08+.1*alpha})`; ctx.fillRect(wx,wy,ww,wh); });
      if(b.label){ const signW=Math.min(b.w-14, Math.max(54, b.w*.68)), signH=18, signX=x+(b.w-signW)/2, signY=y+Math.max(10,b.h*.12); ctx.fillStyle=`rgba(255,255,255,${.26+.3*alpha})`; ctx.beginPath(); ctx.roundRect(signX,signY,signW,signH,7); ctx.fill(); ctx.fillStyle=`rgba(9,92,101,${.5+.35*alpha})`; ctx.font=`700 ${Math.max(8,Math.min(11,b.w*.085))}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(b.label, signX+signW/2, signY+signH/2+0.5); }
      if(b.cross){ const cx=x+b.w*.5, cy=y+Math.max(20,b.h*.1), cs=Math.max(6,Math.min(11,b.w*.08)); ctx.fillStyle=`rgba(255,255,255,${.4+.28*alpha})`; ctx.fillRect(cx-cs*.3,cy-cs,cs*.6,cs*2); ctx.fillRect(cx-cs,cy-cs*.3,cs*2,cs*.6); }
      if(b.brand){
        // Logo nền chỉ nằm trên các tòa phía sau/trung, luôn hiện cùng tòa nhà, không chớp để tránh nhầm với vật phẩm đặc biệt.
        const rearFactor=b.brandMode==='rear' ? 1 : .72;
        const size=Math.max(44, Math.min(126, b.w*(b.brandMode==='rear' ? 0.92 : 0.70)));
        const logoX=x+b.w*.5-size/2;
        const logoY=y-size*.52;
        const fogAlpha=b.brandMode==='rear' ? .34 : .18;
        const logoAlpha=b.brandMode==='rear' ? .44 : .30;
        ctx.save();
        ctx.globalAlpha=fogAlpha;
        ctx.fillStyle='rgba(233,247,250,.95)';
        ctx.filter=quality==='low'?'none':`blur(${b.brandMode==='rear'?8:5}px)`;
        ctx.beginPath();
        ctx.ellipse(x+b.w*.5, logoY+size*.55, size*.34*rearFactor, size*.20*rearFactor, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha=logoAlpha;
        if(logoImg.complete) ctx.drawImage(logoImg,logoX,logoY,size,size);
        ctx.restore();
      }
      ctx.restore();
    });

    clouds.forEach(c=>{ let x=(c.x-time*speed*c.s)%(W+c.w+130); if(x<-c.w-60) x+=W+c.w+130; ctx.fillStyle=`rgba(255,255,255,${c.a})`; ctx.beginPath(); ctx.arc(x,c.y,c.h*.45,0,Math.PI*2); ctx.arc(x+c.w*.2,c.y-8,c.h*.55,0,Math.PI*2); ctx.arc(x+c.w*.42,c.y,c.h*.42,0,Math.PI*2); ctx.fill(); });

    ctx.fillStyle='rgba(212,250,254,.82)'; ctx.fillRect(0,groundY-36,W,20); ctx.fillStyle='rgba(168,235,241,.9)'; ctx.fillRect(0,groundY-16,W,16);
    const road=ctx.createLinearGradient(0,groundY,0,H); road.addColorStop(0,`hsla(${198+themeHue*.15},70%,97%,1)`); road.addColorStop(1,`hsla(${194+themeHue*.12},48%,88%,1)`); ctx.fillStyle=road; ctx.fillRect(0,groundY,W,H-groundY);
    ctx.strokeStyle='rgba(41,180,191,.65)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,groundY+.5); ctx.lineTo(W,groundY+.5); ctx.stroke();
    ctx.save(); ctx.globalAlpha=.45; ctx.strokeStyle='#71ced6'; ctx.lineWidth=2; ctx.beginPath(); let startX=-(time*speed*2.6)%140; for(let x=startX; x<W+140; x+=140){ ctx.moveTo(x,groundY+34); ctx.lineTo(x+18,groundY+34); ctx.lineTo(x+28,groundY+18); ctx.lineTo(x+42,groundY+48); ctx.lineTo(x+58,groundY+22); ctx.lineTo(x+74,groundY+34); ctx.lineTo(x+104,groundY+34);} ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha=.32; ctx.fillStyle='#9dd8de'; for(let i=0;i<12;i++){ let x=(i*130-(time*speed*1.6)%130); ctx.beginPath(); ctx.moveTo(x,groundY+18); ctx.lineTo(x+92,H); ctx.lineTo(x+120,H); ctx.lineTo(x+28,groundY+18); ctx.closePath(); ctx.fill(); } ctx.restore();
  }

  function drawObstacle(o){
    ctx.save(); ctx.translate(o.x,o.y+o.h/2); const pulse=1+Math.sin(time*.2+o.pulse)*.05; ctx.scale(pulse,pulse);
    if(o.lane==='air'){
      if(o.kind==='drone'){
        ctx.shadowColor='rgba(76,154,255,.28)'; ctx.shadowBlur=fxBlur(14);
        ctx.fillStyle='#eff7ff'; roundedRect(6,-8,o.w-12,16,7); ctx.fill(); ctx.strokeStyle='#71a9eb'; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle='#4fa1e0'; ctx.fillRect(o.w*.38,-6,o.w*.12,12);
        ctx.strokeStyle='#5b7f9e'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(8,-10); ctx.lineTo(-4,-16); ctx.moveTo(o.w-8,-10); ctx.lineTo(o.w+4,-16); ctx.moveTo(8,10); ctx.lineTo(-4,16); ctx.moveTo(o.w-8,10); ctx.lineTo(o.w+4,16); ctx.stroke();
        ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(-6,-16); ctx.lineTo(2,-16); ctx.moveTo(o.w-2,-16); ctx.lineTo(o.w+6,-16); ctx.moveTo(-6,16); ctx.lineTo(2,16); ctx.moveTo(o.w-2,16); ctx.lineTo(o.w+6,16); ctx.stroke();
      } else if(o.kind==='scarecrowl'){
        ctx.save();
        ctx.translate(o.w/2,0); ctx.rotate(Math.sin(time*.06+o.phase)*0.18); ctx.translate(-o.w/2,0);
        ctx.shadowColor='rgba(150,79,238,.35)'; ctx.shadowBlur=fxBlur(20);
        ctx.fillStyle='#5b2aa3'; ctx.beginPath(); ctx.ellipse(o.w/2,0,o.w*.22,o.h*.44,0,0,Math.PI*2); ctx.fill();
        ctx.shadowColor='rgba(255,55,90,.75)'; ctx.shadowBlur=fxBlur(12); ctx.fillStyle='#ff425f'; ctx.beginPath(); ctx.arc(o.w*.42,-3,4.8,0,Math.PI*2); ctx.arc(o.w*.58,-3,4.8,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=fxBlur(0); ctx.strokeStyle='#efe8ff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(o.w*.28,-8); ctx.lineTo(o.w*.08,-18); ctx.lineTo(o.w*.15,-4); ctx.moveTo(o.w*.72,-8); ctx.lineTo(o.w*.92,-18); ctx.lineTo(o.w*.85,-4); ctx.moveTo(o.w*.22,7); ctx.lineTo(o.w*.02,18); ctx.lineTo(o.w*.18,18); ctx.moveTo(o.w*.78,7); ctx.lineTo(o.w*.98,18); ctx.lineTo(o.w*.82,18); ctx.stroke();
        ctx.strokeStyle='#ffd7e8'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(o.w*.36,8); ctx.quadraticCurveTo(o.w*.5,16,o.w*.64,8); ctx.stroke();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(o.w*.43,10); ctx.lineTo(o.w*.47,17); ctx.lineTo(o.w*.50,10); ctx.moveTo(o.w*.50,10); ctx.lineTo(o.w*.54,17); ctx.lineTo(o.w*.58,10); ctx.fill();
        ctx.restore();
      } else if(o.kind==='rotorvirus'){
        ctx.save();
        ctx.translate(o.w/2,0); ctx.rotate(time*(o.spinSpeed||.18)+o.phase); ctx.translate(-o.w/2,0);
        ctx.shadowColor='rgba(255,104,148,.35)'; ctx.shadowBlur=fxBlur(18);
        ctx.fillStyle='#d94885'; ctx.beginPath(); ctx.arc(o.w/2,0,o.h*.23,0,Math.PI*2); ctx.fill();
        for(let i=0;i<8;i++){ const a=Math.PI*2*i/8; ctx.fillStyle=i%2?'#ffc3d8':'#ff86b0'; ctx.beginPath(); ctx.moveTo(o.w/2,0); ctx.lineTo(o.w/2+Math.cos(a-.22)*(o.h*.24),Math.sin(a-.22)*(o.h*.24)); ctx.lineTo(o.w/2+Math.cos(a)*(o.h*.46),Math.sin(a)*(o.h*.46)); ctx.lineTo(o.w/2+Math.cos(a+.22)*(o.h*.24),Math.sin(a+.22)*(o.h*.24)); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle='#fff4c8'; ctx.beginPath(); ctx.arc(o.w*.43,-3,3.2,0,Math.PI*2); ctx.arc(o.w*.57,-3,3.2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#6b173a'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.moveTo(o.w*.40,10); ctx.quadraticCurveTo(o.w*.5,15,o.w*.60,10); ctx.stroke();
        ctx.restore();
      } else if(o.kind==='batvirus'){
        ctx.shadowColor='rgba(205,70,111,.34)'; ctx.shadowBlur=fxBlur(18);
        ctx.fillStyle='#84365f'; ctx.beginPath(); ctx.ellipse(o.w/2,0,o.w*.18,o.h*.26,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(o.w*.18,-2); ctx.quadraticCurveTo(o.w*.06,-16,o.w*.02,-2); ctx.quadraticCurveTo(o.w*.10,9,o.w*.22,5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(o.w*.82,-2); ctx.quadraticCurveTo(o.w*.94,-16,o.w*.98,-2); ctx.quadraticCurveTo(o.w*.90,9,o.w*.78,5); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#ffef8e'; ctx.beginPath(); ctx.arc(o.w*.43,-3,3.2,0,Math.PI*2); ctx.arc(o.w*.57,-3,3.2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#ffe5eb'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(o.w*.40,8); ctx.lineTo(o.w*.46,13); ctx.moveTo(o.w*.54,13); ctx.lineTo(o.w*.60,8); ctx.stroke();
      } else if(o.kind==='nightreaper'){
        ctx.shadowColor='rgba(81,55,148,.36)'; ctx.shadowBlur=fxBlur(18);
        ctx.fillStyle='#26153d'; ctx.beginPath(); ctx.ellipse(o.w/2,0,o.w*.17,o.h*.28,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(o.w*.22,-2); ctx.quadraticCurveTo(o.w*.02,-20,o.w*.03,-2); ctx.quadraticCurveTo(o.w*.16,8,o.w*.28,2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(o.w*.78,-2); ctx.quadraticCurveTo(o.w*.98,-20,o.w*.97,-2); ctx.quadraticCurveTo(o.w*.84,8,o.w*.72,2); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#ff425f'; ctx.beginPath(); ctx.arc(o.w*.45,-3,3.6,0,Math.PI*2); ctx.arc(o.w*.55,-3,3.6,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#d9cff8'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.moveTo(o.w*.50,10); ctx.lineTo(o.w*.50,16); ctx.moveTo(o.w*.42,13); ctx.lineTo(o.w*.58,13); ctx.stroke();
      } else if(o.kind==='spikeball'){
        ctx.save();
        ctx.translate(o.w/2,0); ctx.rotate(time*(o.spinSpeed||.1)+o.phase); ctx.translate(-o.w/2,0);
        ctx.shadowColor='rgba(255,167,61,.28)'; ctx.shadowBlur=fxBlur(16);
        ctx.fillStyle='#ffbf59'; ctx.beginPath(); ctx.arc(o.w/2,0,o.h*.26,0,Math.PI*2); ctx.fill();
        for(let i=0;i<10;i++){ const a=Math.PI*2*i/10; const x1=Math.cos(a)*(o.h*.18)+o.w/2, y1=Math.sin(a)*(o.h*.18); const x2=Math.cos(a)*(o.h*.36)+o.w/2, y2=Math.sin(a)*(o.h*.36); ctx.strokeStyle='#d68f24'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
        ctx.fillStyle='#6b3e00'; ctx.beginPath(); ctx.arc(o.w*.42,-3,2.4,0,Math.PI*2); ctx.arc(o.w*.58,-3,2.4,0,Math.PI*2); ctx.fill();
        ctx.restore();
      } else if(o.kind==='airmine5' || o.kind==='airmine4'){
        ctx.save();
        ctx.translate(o.w/2,0); ctx.rotate(time*(o.spinSpeed||.14)+o.phase); ctx.translate(-o.w/2,0);
        ctx.shadowColor='rgba(255,81,112,.38)'; ctx.shadowBlur=fxBlur(22);
        ctx.fillStyle='#ff637d'; ctx.beginPath(); ctx.arc(o.w/2,0,o.h*.3,0,Math.PI*2); ctx.fill();
        for(let i=0;i<12;i++){ const a=Math.PI*2*i/12; const x2=Math.cos(a)*(o.h*.3+10)+o.w/2, y2=Math.sin(a)*(o.h*.3+10); ctx.strokeStyle='#d93457'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(o.w/2,0); ctx.lineTo(x2,y2); ctx.stroke(); }
        ctx.fillStyle='#fff1f4'; ctx.font='900 18px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',o.w/2,1);
        ctx.restore();
      }
    } else if(o.kind==='virus1' || o.kind==='virus2'){
      ctx.shadowColor='rgba(255,108,125,.4)'; ctx.shadowBlur=fxBlur(18); ctx.fillStyle=o.kind==='virus1'?'#ff8796':'#ff667f';
      ctx.beginPath(); ctx.arc(o.w/2,0,o.h*.32,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#ff5670'; ctx.lineWidth=4;
      const spikes=o.kind==='virus1'?8:10, len=o.kind==='virus1'?10:12;
      for(let i=0;i<spikes;i++){ const a=Math.PI*2*i/spikes, r=o.h*.32; const x1=Math.cos(a)*r+o.w/2, y1=Math.sin(a)*r; const x2=Math.cos(a)*(r+len)+o.w/2, y2=Math.sin(a)*(r+len); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.fillStyle='#ffb4bf'; ctx.beginPath(); ctx.arc(x2,y2,4.5,0,Math.PI*2); ctx.fill(); }
      ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(o.w/2-7,-5,5,0,Math.PI*2); ctx.arc(o.w/2+7,3,3.6,0,Math.PI*2); ctx.fill();
    } else if(o.kind==='bio'){
      ctx.shadowColor='rgba(255,193,56,.35)'; ctx.shadowBlur=fxBlur(16); ctx.fillStyle='#ffcf5e'; ctx.beginPath(); ctx.moveTo(o.w/2,0); ctx.lineTo(o.w, o.h*.55); ctx.lineTo(o.w*.75,o.h); ctx.lineTo(o.w*.25,o.h); ctx.lineTo(0,o.h*.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#754100'; ctx.font='bold 24px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('☣',o.w/2,o.h*.56);
    } else if(o.kind==='hazard5'){
      ctx.shadowColor='rgba(255,74,98,.34)'; ctx.shadowBlur=fxBlur(20); ctx.fillStyle='#ff687c'; roundedRect(0,10,o.w,o.h-10,8); ctx.fill();
      ctx.fillStyle='#fff2f4'; ctx.beginPath(); ctx.arc(o.w*.5, o.h*.44, 12,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#e53f61'; ctx.font='900 18px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',o.w*.5,o.h*.44+1);
      ctx.fillStyle='#ffd95b'; ctx.fillRect(8,18,o.w-16,8); ctx.fillRect(8,o.h-6,o.w-16,6);
    } else {
      ctx.shadowColor='rgba(115,95,255,.30)'; ctx.shadowBlur=fxBlur(16); ctx.fillStyle='#6f88d9'; roundedRect(0,10,o.w,o.h-10,8); ctx.fill(); ctx.fillStyle='#94a8eb'; ctx.fillRect(8,18,o.w-16,12); ctx.fillStyle='#e4efff'; for(let i=0;i<3;i++){ ctx.fillRect(12+i*14,35,8,18); } ctx.fillStyle='#ff6879'; ctx.beginPath(); ctx.arc(o.w*.76, o.h*.58, 10,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawItem(it){
    ctx.save(); ctx.translate(it.x,it.y); ctx.rotate(it.t*.28);
    if(it.kind==='gpp'){
      const pulse=.92+.08*Math.sin(time*.14+it.t),aura=28+Math.sin(time*.16+it.t)*4;
      ctx.rotate(Math.sin(time*.06+it.t)*.04);
      ctx.shadowColor='rgba(39,183,176,.52)'; ctx.shadowBlur=fxBlur(28);
      const grad=ctx.createRadialGradient(0,0,8,0,0,40); grad.addColorStop(0,'rgba(255,255,255,.96)'); grad.addColorStop(.45,'rgba(96,236,227,.62)'); grad.addColorStop(1,'rgba(96,236,227,0)');
      ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(0,0,40,0,Math.PI*2); ctx.fill();
      ctx.save(); ctx.rotate(time*.05+it.t*.25); ctx.globalAlpha=.9; ctx.strokeStyle='rgba(77,214,232,.95)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,aura,0,Math.PI*2); ctx.stroke(); ctx.rotate(-time*.11-it.t*.2); ctx.strokeStyle='rgba(255,211,96,.95)'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.ellipse(0,0,aura+6,aura-2,0,0,Math.PI*2); ctx.stroke(); ctx.restore();
      for(let i=0;i<4;i++){ const ang=time*.09+it.t+i*Math.PI/2, ox=Math.cos(ang)*(aura+10), oy=Math.sin(ang)*(aura+10); ctx.fillStyle=i%2?'#ffe27a':'#87f0ec'; ctx.beginPath(); ctx.arc(ox,oy,2.7,0,Math.PI*2); ctx.fill(); }
      ctx.save(); ctx.translate(-14,0); ctx.rotate(-.18); ctx.strokeStyle='rgba(255,214,110,.85)'; ctx.lineWidth=1.8; for(let i=0;i<3;i++){ const tx=-18-i*10; ctx.beginPath(); ctx.moveTo(tx,0); ctx.lineTo(tx-7,-4); ctx.lineTo(tx-3,0); ctx.lineTo(tx-7,4); ctx.closePath(); ctx.stroke(); } ctx.restore();
      ctx.save(); ctx.scale(pulse,pulse); if(logoImg.complete) ctx.drawImage(logoImg,-23,-23,46,46); else { ctx.fillStyle='#27b7b0'; ctx.font='bold 16px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('GPP',0,0); } ctx.restore();
      ctx.fillStyle='#0d7f6f'; ctx.font='900 7px system-ui'; ctx.textAlign='center'; ctx.fillText('ĐẶC BIỆT',0,39);
    } else if(it.kind==='pill'){
      ctx.shadowColor='rgba(255,108,125,.30)'; ctx.shadowBlur=fxBlur(12); ctx.fillStyle='#fff'; ctx.strokeStyle='#f2d9e1'; ctx.lineWidth=2; roundedRect(-16,-8,32,16,8); ctx.fill(); ctx.stroke(); ctx.fillStyle='#ff7585'; roundedRect(-16,-8,16,16,8); ctx.fill();
    } else if(it.kind==='capsule'){
      ctx.shadowColor='rgba(255,139,85,.28)'; ctx.shadowBlur=fxBlur(12); ctx.fillStyle='#fff'; roundedRect(-17,-8,34,16,8); ctx.fill(); ctx.fillStyle='#ff925c'; roundedRect(-17,-8,17,16,8); ctx.fill(); ctx.strokeStyle='#f1d8ca'; ctx.lineWidth=2; roundedRect(-17,-8,34,16,8); ctx.stroke();
    } else if(it.kind==='tablet'){
      ctx.shadowColor='rgba(64,168,216,.25)'; ctx.shadowBlur=fxBlur(12); ctx.fillStyle='#e9fbff'; ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#63bfdc'; ctx.lineWidth=2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-7,7); ctx.lineTo(7,-7); ctx.stroke();
    } else if(it.kind==='bottle'){
      ctx.shadowColor='rgba(58,168,224,.30)'; ctx.shadowBlur=fxBlur(15); ctx.fillStyle='#75ccec'; roundedRect(-12,-13,24,28,6); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(-8,-5,16,11); ctx.fillStyle='#328fc5'; ctx.fillRect(-8,-17,16,6); ctx.strokeStyle='#1f9fc1';ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(0,0,5.5,.12*Math.PI,.88*Math.PI,true);ctx.stroke();ctx.fillStyle='#ff667f';ctx.fillRect(-6,-3,3,6);ctx.fillStyle='#357bd1';ctx.fillRect(3,-3,3,6);
    } else if(it.kind==='syringe'){
      ctx.shadowColor='rgba(64,126,216,.24)'; ctx.shadowBlur=fxBlur(13); ctx.strokeStyle='#3f7ed8'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-16,0); ctx.lineTo(12,0); ctx.stroke(); ctx.fillStyle='#e8f4ff'; roundedRect(-9,-5,20,10,3); ctx.fill(); ctx.strokeStyle='#76a9e8'; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle='#4ba3df'; ctx.fillRect(-3,-4,10,8); ctx.strokeStyle='#3f7ed8'; ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(19,0); ctx.stroke();
    } else if(it.kind==='medkit'){
      ctx.shadowColor='rgba(31,159,116,.28)'; ctx.shadowBlur=fxBlur(14); ctx.fillStyle='#fff'; roundedRect(-16,-13,32,26,7); ctx.fill(); ctx.strokeStyle='#8ad9bf'; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle='#ff667f'; ctx.fillRect(-3,-8,6,16); ctx.fillRect(-8,-3,16,6); ctx.strokeStyle='#71bca7'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,-14,7,Math.PI,0); ctx.stroke();
    }
    ctx.restore();
  }

  function drawDoctor(){
    const crashed = state==='crash';
    ctx.save(); ctx.translate(hero.x+hero.w/2,hero.y+hero.h/2); ctx.rotate(hero.rot); ctx.translate(-hero.w/2,-hero.h/2); const bob=!crashed && hero.onGround?Math.sin(hero.run)*1.5:0; ctx.translate(0,bob);
    ctx.globalAlpha=.18; ctx.fillStyle='#3caab2'; ctx.beginPath(); ctx.ellipse(hero.w/2,hero.h-3,22,6,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    const armSwing=crashed?10:(Math.sin(hero.run)>0?1:-1)*5; const leg=(crashed?8:(Math.sin(hero.run)>0?1:-1)*5);
    ctx.shadowColor='rgba(39,183,176,.22)'; ctx.shadowBlur=fxBlur(12); ctx.fillStyle='#ffffff';
    if(crashed){ ctx.beginPath(); ctx.moveTo(16,28); ctx.lineTo(45,25); ctx.quadraticCurveTo(50,43,43,58); ctx.lineTo(15,56); ctx.quadraticCurveTo(9,43,16,28); ctx.closePath(); ctx.fill(); ctx.fillStyle='#defcff'; ctx.beginPath(); ctx.moveTo(18,30); ctx.lineTo(30,46); ctx.lineTo(14,57); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(41,27); ctx.lineTo(32,43); ctx.lineTo(47,52); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.roundRect(13,26,34,31,10); ctx.fill(); ctx.fillStyle='#defcff'; ctx.beginPath(); ctx.moveTo(23,26); ctx.lineTo(31,45); ctx.lineTo(19,57); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(38,26); ctx.lineTo(31,45); ctx.lineTo(44,57); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle='#21bbb2'; ctx.fillRect(28,31,6,18); ctx.fillStyle='#ff7383'; ctx.beginPath(); if(crashed){ ctx.moveTo(33,33); ctx.lineTo(24,42); ctx.lineTo(34,47); ctx.lineTo(38,37); } else { ctx.moveTo(31,32); ctx.lineTo(26,39); ctx.lineTo(31,44); ctx.lineTo(36,39); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=8; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(16,33); ctx.lineTo(crashed?4:8, crashed?26:44-armSwing*.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(45,34); ctx.lineTo(crashed?56:53, crashed?47:43+armSwing*.2); ctx.stroke(); ctx.strokeStyle='#f2c7a8'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(crashed?4:8, crashed?26:44-armSwing*.2); ctx.lineTo(crashed?1:5, crashed?22:48-armSwing*.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(crashed?56:53, crashed?47:43+armSwing*.2); ctx.lineTo(crashed?58:56, crashed?51:47+armSwing*.2); ctx.stroke();
    ctx.strokeStyle='#264f8f'; ctx.lineWidth=7; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(26,57); ctx.lineTo(crashed?18:22+leg, crashed?72:70); ctx.stroke(); ctx.beginPath(); ctx.moveTo(36,57); ctx.lineTo(crashed?47:40-leg, crashed?68:70); ctx.stroke(); ctx.strokeStyle='#ffffff'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(crashed?18:22+leg, crashed?72:70); ctx.lineTo(crashed?13:18+leg, crashed?73:71); ctx.stroke(); ctx.beginPath(); ctx.moveTo(crashed?47:40-leg, crashed?68:70); ctx.lineTo(crashed?51:44-leg, crashed?70:71); ctx.stroke();
    ctx.shadowBlur=fxBlur(0); ctx.fillStyle='#f2c7a8'; ctx.beginPath(); ctx.arc(31,18,12.8,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(40,22,5.3,6.2,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#5c433d'; if(crashed){ ctx.beginPath(); ctx.moveTo(18,17); ctx.quadraticCurveTo(25,3,42,8); ctx.quadraticCurveTo(45,15,42,21); ctx.quadraticCurveTo(33,16,26,18); ctx.closePath(); ctx.fill(); } else { ctx.beginPath(); ctx.moveTo(18,18); ctx.quadraticCurveTo(22,5,41,9); ctx.quadraticCurveTo(45,13,43,22); ctx.quadraticCurveTo(33,18,22,20); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle='#efbe9b'; ctx.beginPath(); ctx.arc(22,22,3.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#27b7b0'; if(crashed){ ctx.save(); ctx.translate(30,8); ctx.rotate(-.25); ctx.beginPath(); ctx.roundRect(-10,-4,20,8,4); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(-2,-3,4,6); ctx.fillRect(-3,-2,6,4); ctx.restore(); } else { ctx.beginPath(); ctx.roundRect(22,6,18,8,4); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(29,7,4,6); ctx.fillRect(28,8,6,4); }
    ctx.strokeStyle='#17343a'; ctx.lineWidth=1.8; ctx.fillStyle='#17343a'; if(crashed){ ctx.beginPath(); ctx.moveTo(31,17); ctx.lineTo(35,15); ctx.lineTo(37,17); ctx.stroke(); ctx.beginPath(); ctx.moveTo(31,27); ctx.quadraticCurveTo(36,30,40,27); ctx.stroke(); ctx.beginPath(); ctx.moveTo(31,21); ctx.lineTo(37,23); ctx.stroke(); ctx.save(); const mX=54+(34-hero.crashTimer)*1.8, mY=8-(34-hero.crashTimer)*0.75; ctx.translate(mX,mY); ctx.rotate(.55+(34-hero.crashTimer)*.03); ctx.fillStyle='#e7fbfd'; ctx.strokeStyle='#8dcfd6'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.roundRect(-10,-5,20,10,4); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10,-1); ctx.lineTo(-15,-4); ctx.moveTo(10,-1); ctx.lineTo(15,-4); ctx.stroke(); ctx.restore(); } else { ctx.fillStyle='#dff9fc'; ctx.beginPath(); ctx.roundRect(30,19,13,9,4); ctx.fill(); ctx.strokeStyle='#8dcfd6'; ctx.lineWidth=1.6; ctx.stroke(); ctx.beginPath(); ctx.moveTo(30,21); ctx.lineTo(25,19); ctx.moveTo(43,21); ctx.lineTo(46,20); ctx.stroke(); ctx.fillStyle='#17343a'; ctx.beginPath(); ctx.arc(33.5,17.5,1.4,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#17343a'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(36.5,21); ctx.lineTo(40.5,21.5); ctx.stroke(); }
    ctx.strokeStyle='#2aa3a8'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.arc(21,32,6,Math.PI*.2,Math.PI*1.1,true); ctx.moveTo(41,33); ctx.arc(41,32,6,Math.PI*.9,Math.PI*1.8); ctx.moveTo(26,38); ctx.quadraticCurveTo(31,46,31,52); ctx.stroke(); ctx.fillStyle='#1f7f88'; ctx.beginPath(); ctx.arc(31,54,3,0,Math.PI*2); ctx.fill();
    if(shieldTimer>0){ ctx.globalAlpha=.36+.12*Math.sin(time*.2); ctx.strokeStyle='#7ddfff'; ctx.lineWidth=3; ctx.shadowColor='#7ddfff'; ctx.shadowBlur=fxBlur(24); ctx.beginPath(); ctx.arc(31,36,43,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }
    if(hitCooldown>0 && Math.floor(hitCooldown/3)%2===0){ ctx.globalAlpha=.55; ctx.fillStyle='rgba(255,120,136,.14)'; ctx.fillRect(8,0,48,74); ctx.globalAlpha=1; }
    ctx.restore();
  }

  function drawParticles(){ particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/45); ctx.fillStyle=p.type==='gold'?'#ff7585':p.type==='ice'?'#8befff':p.type==='dust'?'#7fc0c8':p.type==='mask'?'#dff9fc':p.type==='gpp'?'#2abcae':p.type==='star'?'#ffe078':'#ff9faf'; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1; }
  function drawPopups(){ popups.forEach(p=>{ const t=Math.max(0,p.life/(p.maxLife||72)), scale=1+(1-t)*.08; ctx.save(); ctx.globalAlpha=Math.min(1,t*1.6); ctx.translate(p.x,p.y); ctx.scale(scale,scale); ctx.font=`1000 ${p.size||22}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round'; ctx.lineWidth=7; ctx.strokeStyle='rgba(255,255,255,.96)'; ctx.shadowColor='rgba(13,61,70,.22)'; ctx.shadowBlur=fxBlur(10); ctx.strokeText(p.text,0,0); ctx.shadowBlur=fxBlur(0); ctx.fillStyle=p.color; ctx.fillText(p.text,0,0); ctx.restore(); }); ctx.globalAlpha=1; }

  function drawDebugHitboxes(){if(!DEBUG)return;ctx.save();ctx.lineWidth=2;ctx.strokeStyle='rgba(0,255,210,.9)';const h=heroHitbox();ctx.strokeRect(h.x,h.y,h.w,h.h);ctx.strokeStyle='rgba(255,70,100,.86)';obstacles.forEach(o=>{const b=obstacleHitbox(o);ctx.strokeRect(b.x,b.y,b.w,b.h)});ctx.restore()}
  function render(){ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);bg();obstacles.forEach(drawObstacle);items.forEach(drawItem);drawParticles();drawDoctor();drawDebugHitboxes();ctx.restore();drawPopups();if(gppCelebrationTimer>0){const t=gppCelebrationTimer/28,scale=1.14+(1-t)*.55;ctx.save();ctx.globalAlpha=Math.min(.95,1-t+ .1);const flash=ctx.createRadialGradient(W*.5,H*.36,10,W*.5,H*.36,190);flash.addColorStop(0,'rgba(255,255,255,.30)');flash.addColorStop(.35,'rgba(120,245,238,.16)');flash.addColorStop(1,'rgba(120,245,238,0)');ctx.fillStyle=flash;ctx.fillRect(0,0,W,H);ctx.translate(W*.5,H*.33);ctx.scale(scale,scale);ctx.shadowColor='rgba(39,183,176,.55)';ctx.shadowBlur=fxBlur(26);if(logoImg.complete)ctx.drawImage(logoImg,-44,-44,88,88);ctx.restore();ctx.save();ctx.globalAlpha=Math.min(1,1-t+.05);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='1000 28px system-ui';ctx.lineWidth=8;ctx.strokeStyle='rgba(255,255,255,.96)';ctx.strokeText('★ GPP ĐẶC BIỆT',W*.5,H*.46);ctx.fillStyle='#0f8d80';ctx.fillText('★ GPP ĐẶC BIỆT',W*.5,H*.46);ctx.restore();}if(state==='paused'){ctx.fillStyle='rgba(235,255,255,.58)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#0c5f67';ctx.textAlign='center';ctx.font='900 30px system-ui';ctx.fillText('TẠM DỪNG',W/2,H/2);ctx.font='600 14px system-ui';ctx.fillStyle='rgba(12,95,103,.75)';ctx.fillText(isMobileLike()?'Chạm màn hình hoặc nút ⏸ để tiếp tục':'Click chuột hoặc nhấn P để tiếp tục',W/2,H/2+30)}}
  function setQuality(next){if(next===quality)return;quality=next;resize();showUpdateToast(next==='low'?'Đã giảm hiệu ứng để giữ nhịp game mượt':'Hiệu ứng hình ảnh đã trở lại mức cao',1500)}
  function updatePerformance(deltaMs){fpsAccumMs+=deltaMs;fpsFrames++;if(fpsAccumMs<2000)return;fps=fpsFrames*1000/fpsAccumMs;if(fps<46&&quality==='high'){goodFpsWindows=0;setQuality('low')}else if(quality==='low'&&fps>56){goodFpsWindows++;if(goodFpsWindows>=3){goodFpsWindows=0;setQuality('high')}}else goodFpsWindows=0;fpsAccumMs=0;fpsFrames=0}
  function updateDebug(){if(!DEBUG)return;$('debugPanel').textContent=`${APP_VERSION}  build ${BUILD_ID}
FPS ${fps.toFixed(1)}  quality ${quality}  DPR ${DPR.toFixed(2)}
state ${state}  diff ${difficultyConfigs[difficulty].label}  stage ${progressStage()}
speed ${speed.toFixed(2)}  simSteps ${simSteps}
obstacles ${obstacles.length}  items ${items.length}  fx ${particles.length}
hero x ${hero.x}  jump ${PHYSICS.jump}  gravity ${PHYSICS.gravity}
cache doctor-rush-v${BUILD_ID}`}
  function loop(ts){let deltaMs=ts-lastFrameTs;if(!Number.isFinite(deltaMs)||deltaMs<=0)deltaMs=FIXED_MS;lastFrameTs=ts;deltaMs=Math.min(100,deltaMs);updatePerformance(deltaMs);simAccumulator+=deltaMs;simSteps=0;while(simAccumulator>=FIXED_MS-0.0001&&simSteps<6){update(1);simAccumulator-=FIXED_MS;simSteps++}if(simSteps>=6)simAccumulator=Math.min(simAccumulator,FIXED_MS);render();updateDebug();requestAnimationFrame(loop)}
  requestAnimationFrame(ts=>{lastFrameTs=ts;simAccumulator=0;requestAnimationFrame(loop)});
  function togglePause(){if(state==='playing'){state='paused';autoPausedReason='manual'}else if(state==='paused'){state='playing';autoPausedReason='';lastFrameTs=performance.now();simAccumulator=0}}
  function selectDifficulty(level){if(!difficultyConfigs[level])return;difficulty=level;localStorage.setItem('doctor-rush-difficulty',difficulty);document.querySelectorAll('.difficulty-option').forEach(btn=>btn.classList.toggle('active',btn.dataset.difficulty===difficulty));updateHUD()}
  document.querySelectorAll('.difficulty-option').forEach(btn=>btn.onclick=()=>selectDifficulty(btn.dataset.difficulty));selectDifficulty(difficulty);$('versionLabel').textContent=APP_VERSION;
  $('startBtn').onclick=requestStart;
  $('restartBtn').onclick=async()=>{if(pendingVersionUpdate){applyPendingUpdate();return}await requestAppFullscreen();await requestLandscape();beginRun()};
  $('homeBtn').onclick=returnToMainMenu;
  $('tutorialStartBtn').onclick=finishTutorialAndStart;$('tutorialSkipBtn').onclick=finishTutorialAndStart;
  function syncPreferenceButtons(){$('soundBtn').textContent=muted?'🔇 Âm thanh: Tắt':'🔊 Âm thanh: Bật';$('vibrationBtn').textContent=vibrationEnabled?'📳 Rung: Bật':'📴 Rung: Tắt'}
  $('soundBtn').onclick=()=>{muted=!muted;localStorage.setItem('doctor-rush-muted',muted?'1':'0');syncPreferenceButtons();if(!muted)beep(660,.05,'sine',.03)};
  $('vibrationBtn').onclick=()=>{vibrationEnabled=!vibrationEnabled;localStorage.setItem('doctor-rush-vibration',vibrationEnabled?'1':'0');syncPreferenceButtons();if(vibrationEnabled)vibrate([20,20,35])};syncPreferenceButtons();
  $('gameHome').onclick=e=>{e.preventDefault();requestMainMenu()};$('menuContinueBtn').onclick=e=>{e.preventDefault();closeMenuConfirm()};$('menuConfirmBtn').onclick=e=>{e.preventDefault();returnToMainMenu()};
  $('mobileJump').onclick=e=>{e.preventDefault();if(state==='playing')jump()};$('mobilePause').onclick=e=>{e.preventDefault();togglePause()};
  stage.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('button'))return;if(e.pointerType==='mouse'&&(state==='playing'||state==='paused')){togglePause();return}if(e.pointerType!=='mouse'&&state==='paused'){togglePause();return}if(e.pointerType!=='mouse'&&state==='playing')jump()});
  addEventListener('popstate',()=>{
    if(pendingMenuHistoryBack){pendingMenuHistoryBack=false;goMainMenuCore();return}
    if(!isMobileLike())return;
    if(['playing','paused'].includes(state)){gameHistoryActive=false;openMenuConfirm(true);return}
    if(state==='over'){gameHistoryActive=false;goMainMenuCore()}
  });
  addEventListener('keydown',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();jump()}else if(e.code==='KeyP')togglePause();else if(e.code==='Escape'&&['playing','paused'].includes(state)){e.preventDefault();requestMainMenu()}});
  function checkPortrait(){if(isMobileLike()&&innerHeight>innerWidth&&state==='playing'){state='paused';autoPausedReason='portrait'}}
  addEventListener('orientationchange',()=>setTimeout(()=>{resize();checkPortrait()},140));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&state==='playing'){state='paused';autoPausedReason='hidden'}else if(document.visibilityState==='visible'){lastFrameTs=performance.now();simAccumulator=0;checkForVersionUpdate();checkForAppUpdate()}});
  let deferredInstallPrompt=null;const installBtn=$('installBtn'),installTip=$('installTip'),isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  function refreshInstallUI(){if(isInstalled()){installBtn.disabled=true;installBtn.classList.add('installed');installBtn.textContent='✓ Đã cài';installTip.classList.remove('show')}else{installBtn.disabled=false;installBtn.classList.remove('installed');installBtn.textContent='📲 Cài ứng dụng'}}
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;refreshInstallUI()});
  addEventListener('appinstalled',()=>{deferredInstallPrompt=null;refreshInstallUI();installTip.textContent='✓ Đã cài Doctor Rush. Mở bằng icon bác sĩ ngoài màn hình để chơi dạng ứng dụng, không có thanh địa chỉ.';installTip.classList.add('show')});
  installBtn.onclick=async()=>{if(isInstalled())return;if(deferredInstallPrompt){deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice}catch(e){}deferredInstallPrompt=null;refreshInstallUI();return}installTip.textContent=isiOS?'iPhone/iPad: mở bằng Safari → Chia sẻ → Thêm vào Màn hình chính. Sau đó mở từ icon bác sĩ để không còn thanh địa chỉ.':'Nếu hộp cài chưa xuất hiện: mở menu trình duyệt → Cài ứng dụng / Thêm vào màn hình chính.';installTip.classList.add('show')};refreshInstallUI();
  function preloadOne(url,type='image'){return new Promise(resolve=>{if(type==='image'){const im=new Image();im.onload=()=>resolve(true);im.onerror=()=>resolve(false);im.src=url}else fetch(url,{cache:'no-cache'}).then(r=>resolve(r.ok)).catch(()=>resolve(false))})}
  async function preloadAssets(){const assets=[['logo-gpp.png?v=24','image'],['icon-192.png?v=24','image'],['icon-512.png?v=24','image'],['apple-touch-icon.png?v=24','image'],['manifest.webmanifest?v=24','fetch'],['version.json?v=24','fetch']];let done=0;for(const[url,type]of assets){await preloadOne(url,type);done++;const pct=Math.round(done/assets.length*100);$('preloadFill').style.width=`${pct}%`;$('preloadText').textContent=`Đang tải ${pct}%`}assetsReady=true;$('startBtn').disabled=false;$('startBtn').textContent='▶ Chơi ngay';$('loadingStatus').textContent='✓ Sẵn sàng • '+APP_VERSION;const overlay=$('preloadOverlay');overlay.style.opacity='0';setTimeout(()=>overlay.remove(),260)}
  let toastTimer=null;function showUpdateToast(text='Có phiên bản mới • sẽ cập nhật sau ván này',duration=2600){const el=$('updateToast');el.textContent=text;el.classList.add('show-toast');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show-toast'),duration)}
  let swRegistration=null,serverBuild=BUILD_ID,applyingUpdate=false;
  async function checkForVersionUpdate(){if(location.protocol==='file:'||location.protocol==='data:')return false;try{const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return false;const v=await r.json();serverBuild=String(v.version||v.build||'');if(serverBuild&&serverBuild!==BUILD_ID){pendingVersionUpdate=true;showUpdateToast(['playing','paused','crash'].includes(state)?'Có phiên bản mới • sẽ cập nhật sau ván này':'Có phiên bản mới • đang chuẩn bị cập nhật');await checkForAppUpdate();return true}}catch(e){}return false}
  async function checkForAppUpdate(){if(!swRegistration)return;try{await swRegistration.update();if(swRegistration.waiting&&pendingVersionUpdate&&['menu','over'].includes(state))swRegistration.waiting.postMessage('SKIP_WAITING')}catch(e){}}
  async function applyPendingUpdate(){if(applyingUpdate)return;applyingUpdate=true;showUpdateToast('Đang cập nhật Doctor Rush…',4000);try{if(swRegistration){await swRegistration.update();if(swRegistration.waiting){swRegistration.waiting.postMessage('SKIP_WAITING');return}}}catch(e){}setTimeout(()=>location.replace(`./?v=${encodeURIComponent(serverBuild||Date.now())}`),500)}
  if('serviceWorker'in navigator&&!['file:','data:'].includes(location.protocol)){addEventListener('load',async()=>{try{swRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await checkForVersionUpdate();await checkForAppUpdate()}catch(e){}});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(['playing','paused','crash'].includes(state)){pendingControllerReload=true;pendingVersionUpdate=true;showUpdateToast('Bản mới đã tải • sẽ áp dụng sau ván này')}else location.replace(`./?v=${encodeURIComponent(serverBuild||Date.now())}`)});setInterval(()=>{if(document.visibilityState==='visible')checkForVersionUpdate()},300000)}
  if(DEBUG){window.__doctorDebug={snapshot:()=>({version:APP_VERSION,build:BUILD_ID,state,difficulty,score,coinCount,speed,time,health,magnetTimer,challenge:challengeProgress(),hero:{...hero},fps,quality,DPR,W,H,groundY,obstacles:obstacles.map(o=>({...o})),items:items.map(i=>({...i})),best:getBest(difficulty)}),selectDifficulty,pickGround:(d,n=1000)=>{const old=difficulty;difficulty=d;const out={};for(let i=0;i<n;i++){const t=pickGroundType();out[t.damage]=(out[t.damage]||0)+1}difficulty=old;return out},pickAir:(d,moving,n=1000)=>{const old=difficulty;difficulty=d;const out={};for(let i=0;i<n;i++){const t=pickAirType({moving});out[t.damage]=(out[t.damage]||0)+1}difficulty=old;return out},simulateJump:(hz=60)=>{const frameMs=1000/hz;let acc=0,y=0,vy=PHYSICS.jump,min=0,renderFrames=0,sim=0,done=false;while(renderFrames<hz*3&&!done){acc+=frameMs;while(acc>=FIXED_MS-0.0001){vy+=PHYSICS.gravity;y+=vy;min=Math.min(min,y);sim++;acc-=FIXED_MS;if(y>=0&&sim>2){done=true;break}}renderFrames++}return{hz,apex:-min,seconds:renderFrames/hz,virtualFrames:sim}},simulateTravel:(hz=60,seconds=10,s=8)=>{const frameMs=1000/hz;let acc=0,x=0;for(let i=0;i<Math.round(hz*seconds);i++){acc+=frameMs;while(acc>=FIXED_MS-0.0001){x+=s;acc-=FIXED_MS}}return x},validateRow:(rowSpeed=8,n=7)=>{const plan=buildPillRowPlan('pill',n,false,rowSpeed),flight=Math.max(34,jumpFlightSteps()-2);let maxError=0;for(let i=0;i<plan.length;i++){const t=(i/(n-1||1))*flight;maxError=Math.max(maxError,Math.abs(plan[i].y-heroPickupYAtStep(t)))}return{rowSpeed,n,width:plan.at(-1).x-plan[0].x,maxCenterError:maxError,topLimit:collectibleTopLimit('pill',11),minY:Math.min(...plan.map(p=>p.y))}},collectibleTopLimit,progressStageFor:n=>{const old=coinCount;coinCount=n;const r=progressStage();coinCount=old;return r},patternSafe:(a,b,d,pm=false,sm=false)=>patternHasEscapePath(a,b,d,pm,sm),forceCoins:n=>{coinCount=n;updateHUD()},beginRun,finishGameOver,jump}}
  try{if(!history.state||(!history.state.doctorRushRoot&&!history.state.doctorRushGame))history.replaceState({doctorRushRoot:true},'',location.href)}catch(e){}
  preloadAssets();updateHUD();
})();

