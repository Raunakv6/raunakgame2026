(() => {
  'use strict';

  const W = 960, H = 440, GROUND = 340;
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    menu: document.getElementById('menuScreen'), pause: document.getElementById('pauseScreen'), over: document.getElementById('overScreen'),
    hud: document.getElementById('hud'), score: document.getElementById('score'), best: document.getElementById('topBest'), menuBest: document.getElementById('menuBest'),
    finalScore: document.getElementById('finalScore'), finalBest: document.getElementById('finalBest'), announcement: document.getElementById('announcement'), sound: document.getElementById('soundButton')
  };
  const pad = n => String(Math.max(0, Math.floor(n))).padStart(5, '0');
  const safeGet = key => { try { return Number(localStorage.getItem(key)) || 0; } catch (_) { return 0; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, String(value)); } catch (_) {} };

  class AudioFX {
    constructor() { this.muted = false; this.ctx = null; }
    tone(freq, duration, type = 'sine', volume = .045, endFreq = null) {
      if (this.muted) return;
      try {
        this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, this.ctx.currentTime + duration);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + duration);
      } catch (_) { /* Audio is optional; game remains playable if unavailable. */ }
    }
    jump() { this.tone(420, .13, 'triangle', .05, 700); }
    land() { this.tone(190, .09, 'sine', .035, 110); }
    hit() { this.tone(170, .3, 'sawtooth', .055, 55); }
    click() { this.tone(520, .055, 'sine', .025, 690); }
    milestone() { this.tone(540, .12, 'triangle', .035, 820); setTimeout(() => this.tone(760, .14, 'triangle', .03, 990), 100); }
  }

  class Player {
    constructor() { this.x = 142; this.reset(); }
    reset() { this.y = GROUND; this.vy = 0; this.onGround = true; this.ducking = false; this.anim = 0; this.wasAirborne = false; }
    update(dt, input) {
      this.anim += dt * (input.duck ? 8 : 12);
      this.ducking = input.duck && this.onGround;
      if (input.jumpPressed && this.onGround && !this.ducking) {
        this.vy = -640; this.onGround = false; this.wasAirborne = true; audio.jump();
        game.particles.burst(this.x + 23, GROUND - 3, 6, '#d7a674', 'dust');
      }
      if (!this.onGround) {
        const oldVy = this.vy;
        this.vy += 1700 * dt; this.y += this.vy * dt;
        if (this.y >= GROUND) {
          this.y = GROUND; this.vy = 0; this.onGround = true;
          if (this.wasAirborne) { audio.land(); game.particles.burst(this.x + 25, GROUND - 2, 8, '#d7a674', 'dust'); }
          this.wasAirborne = false;
        }
      }
    }
    bounds() {
      if (this.ducking) return { x: this.x + 5, y: this.y - 30, w: 59, h: 25 };
      const airborne = !this.onGround;
      return { x: this.x + 7, y: this.y - (airborne ? 55 : 53), w: 43, h: 48 };
    }
    draw(c) {
      const x = this.x, base = this.y, duck = this.ducking, airborne = !this.onGround;
      c.save(); c.translate(x, base);
      if (duck) {
        c.fillStyle = '#426b50';
        // Tail, body and head form an original low running silhouette.
        c.beginPath(); c.moveTo(12,-21); c.lineTo(-2,-27); c.lineTo(1,-17); c.lineTo(12,-14); c.closePath(); c.fill();
        rounded(c, 9,-30,49,22,8,'#426b50'); rounded(c, 44,-43,26,22,8,'#426b50');
        c.fillStyle='#f3c874'; c.beginPath(); c.arc(62,-34,2.1,0,Math.PI*2); c.fill();
        c.fillStyle='#d5a252'; c.fillRect(66,-27,8,3);
        c.fillStyle='#315640'; c.fillRect(16,-11,15,7); c.fillRect(43,-11,14,7);
      } else {
        // Tail and rounded body
        c.fillStyle = '#426b50'; c.beginPath(); c.moveTo(20,-31); c.lineTo(-1,-41); c.lineTo(6,-23); c.lineTo(22,-18); c.closePath(); c.fill();
        rounded(c, 14,-49,39,35,12,'#426b50');
        // Back plates
        c.fillStyle='#557d5a'; for(let i=0;i<4;i++){c.beginPath();c.moveTo(24+i*7,-46);c.lineTo(27+i*7,-55);c.lineTo(32+i*7,-46);c.fill();}
        // Neck/head and snout
        rounded(c,42,-69,20,34,8,'#426b50'); rounded(c,47,-77,28,21,8,'#426b50');
        c.fillStyle='#426b50'; c.beginPath(); c.moveTo(68,-67);c.lineTo(80,-61);c.lineTo(68,-57);c.closePath();c.fill();
        c.fillStyle='#f3c874'; c.beginPath();c.arc(67,-69,2.2,0,Math.PI*2);c.fill();
        c.fillStyle='#315640'; c.fillRect(71,-58,7,2);
        // Legs swing when running; tucked slightly during a jump.
        const swing = airborne ? .25 : Math.sin(this.anim) * .68;
        c.strokeStyle='#315640';c.lineWidth=7;c.lineCap='round';
        c.beginPath();c.moveTo(25,-19);c.lineTo(24+Math.sin(swing)*7,-6);c.lineTo(18+Math.sin(swing)*9,-3);c.stroke();
        c.beginPath();c.moveTo(42,-19);c.lineTo(43-Math.sin(swing)*7,-7);c.lineTo(50-Math.sin(swing)*8,-4);c.stroke();
      }
      c.restore();
    }
  }

  class Particles {
    constructor(){this.items=[];}
    burst(x,y,count,color,type='dust'){ for(let i=0;i<count;i++){const a=type==='dust'?Math.PI+Math.random()*Math.PI:Math.random()*Math.PI*2,s=type==='dust'?25+Math.random()*85:35+Math.random()*120;this.items.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,life:.35+Math.random()*.4,max:.75,size:2+Math.random()*3,color});} }
    update(dt){this.items=this.items.filter(p=>p.life>0);for(const p of this.items){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=190*dt;p.life-=dt;}}
    draw(c){for(const p of this.items){c.globalAlpha=Math.max(0,p.life/p.max);c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,p.size,0,Math.PI*2);c.fill();}c.globalAlpha=1;}
  }

  class ObstacleFactory {
    static create(speed) {
      const roll = Math.random();
      if (roll < .24) return { type:'rock', x:W+20, w:33+Math.random()*13, h:23+Math.random()*12 };
      if (roll < .48) return { type:'bird', x:W+20, w:44, h:28, y:Math.random()<.58?GROUND-54:GROUND-103, phase:Math.random()*6 };
      return { type:'cactus', x:W+20, w:roll>.82?56:30, h:roll>.82?58:42+Math.random()*19, count:roll>.82?2:1 };
    }
  }

  class Game {
    constructor(){
      this.state='menu'; this.player=new Player(); this.particles=new Particles(); this.obstacles=[]; this.clouds=[]; this.plants=[]; this.stars=[];
      this.score=0; this.best=safeGet('dinoDashBest'); this.speed=330; this.distance=0; this.spawnIn=1.1; this.elapsed=0; this.shake=0; this.night=0; this.lastMilestone=0; this.lastTime=0; this.input={jumpPressed:false,duck:false}; this.makeScenery(); this.updateBest();
      this.loop=this.loop.bind(this); requestAnimationFrame(this.loop);
    }
    makeScenery(){
      for(let i=0;i<6;i++)this.clouds.push({x:i*210+Math.random()*100,y:45+Math.random()*90,s:.65+Math.random()*.7});
      for(let i=0;i<12;i++)this.plants.push({x:i*105+Math.random()*55,type:Math.random()});
      for(let i=0;i<65;i++)this.stars.push({x:Math.random()*W,y:Math.random()*205,r:.5+Math.random()*1.5,tw:Math.random()*6});
    }
    updateBest(){ui.best.textContent=pad(this.best);ui.menuBest.textContent=pad(this.best);}
    start(){audio.click();this.state='running';this.player.reset();this.obstacles=[];this.particles.items=[];this.score=0;this.speed=330;this.distance=0;this.elapsed=0;this.spawnIn=.9;this.lastMilestone=0;this.shake=0;this.input.jumpPressed=false;this.input.duck=false;this.showScreens();}
    pause(){if(this.state!=='running')return;audio.click();this.state='paused';this.showScreens();}
    resume(){if(this.state!=='paused')return;audio.click();this.state='running';this.showScreens();this.lastTime=performance.now();}
    menu(){audio.click();this.state='menu';this.obstacles=[];this.player.reset();this.showScreens();}
    showScreens(){ui.menu.hidden=this.state!=='menu';ui.pause.hidden=this.state!=='paused';ui.over.hidden=this.state!=='over';ui.hud.hidden=this.state!=='running';}
    finish(){if(this.state!=='running')return;this.state='over';this.shake=.38;audio.hit();const final=Math.floor(this.score);if(final>this.best){this.best=final;safeSet('dinoDashBest',this.best);}ui.finalScore.textContent=pad(final);ui.finalBest.textContent=pad(this.best);this.updateBest();this.showScreens();}
    update(dt){
      this.elapsed+=dt;this.night+=(Math.sin(this.elapsed*.12)+1)/2;
      if(this.state==='running'){
        this.speed=Math.min(620,330+this.score*1.35);this.distance+=this.speed*dt;this.score+=dt*(10+this.speed*.012);
        const whole=Math.floor(this.score/100);
        if(whole>this.lastMilestone){this.lastMilestone=whole;this.announce(`${whole*100} POINTS`);audio.milestone();}
        this.player.update(dt,this.input);this.input.jumpPressed=false;
        this.spawnIn-=dt;
        if(this.spawnIn<=0){const first=ObstacleFactory.create(this.speed);this.obstacles.push(first);if(first.type==='cactus'&&this.score>120&&Math.random()<.21){this.obstacles.push({...ObstacleFactory.create(this.speed),x:W+20+first.w+25});}
          const timeGap=1.28+Math.random()*.64-Math.min(.25,this.score/2600);this.spawnIn=Math.max(.94,timeGap)*(this.speed/390);}
        for(const o of this.obstacles)o.x-=this.speed*dt;
        this.obstacles=this.obstacles.filter(o=>o.x+o.w>-20);
        if(this.obstacles.some(o=>this.collides(o))){this.finish();}
        ui.score.textContent=pad(this.score);
      } else if(this.state==='menu'){
        this.distance+=35*dt;
      }
      this.particles.update(dt);this.shake=Math.max(0,this.shake-dt);
      for(const cloud of this.clouds){cloud.x-= (this.state==='running'?this.speed*.09:13)*dt;if(cloud.x<-100)cloud.x=W+70;}
      if(this.state!=='running')this.obstacles=[];
    }
    collides(o){
      const p=this.player.bounds();let box;
      if(o.type==='cactus')box={x:o.x+5,y:GROUND-o.h+3,w:o.w-10,h:o.h-3};
      else if(o.type==='rock')box={x:o.x+4,y:GROUND-o.h+5,w:o.w-8,h:o.h-5};
      else box={x:o.x+5,y:o.y+5+Math.sin(this.elapsed*8+o.phase)*3,w:o.w-10,h:o.h-10};
      return p.x<box.x+box.w&&p.x+p.w>box.x&&p.y<box.y+box.h&&p.y+p.h>box.y;
    }
    announce(text){ui.announcement.textContent=text;ui.announcement.classList.add('show');clearTimeout(this.announceTimer);this.announceTimer=setTimeout(()=>ui.announcement.classList.remove('show'),1050);}
    loop(now){const dt=Math.min(.033,(now-this.lastTime)/1000||0);this.lastTime=now;this.update(dt);this.draw();requestAnimationFrame(this.loop);}
    draw(){
      const c=ctx;c.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
      const shakeX=this.shake? (Math.random()-.5)*this.shake*24:0,shakeY=this.shake? (Math.random()-.5)*this.shake*15:0;
      c.save();c.translate(shakeX,shakeY);
      const mix=this.night,top=blend([247,230,196],[28,49,56],mix),bottom=blend([250,240,219],[99,92,77],mix);
      const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,rgb(top));grad.addColorStop(1,rgb(bottom));c.fillStyle=grad;c.fillRect(-10,-10,W+20,H+20);
      this.drawSky(c,mix);this.drawLand(c,mix);
      if(this.state==='running'||this.state==='paused'||this.state==='over'){
        for(const o of this.obstacles)this.drawObstacle(c,o,mix);
        this.player.draw(c);
      }else{this.player.anim+=.025;this.player.draw(c);}
      this.particles.draw(c);c.restore();
    }
    drawSky(c,mix){
      for(const s of this.stars){const alpha=mix*(.35+.3*Math.sin(this.elapsed*1.4+s.tw));c.globalAlpha=alpha;c.fillStyle='#fff4c9';c.beginPath();c.arc(s.x,s.y,s.r,0,Math.PI*2);c.fill();}c.globalAlpha=1;
      // Sun and moon share a drifting horizon path for a gradual day/night cycle.
      const sunX=760, sunY=95; c.globalAlpha=1-mix;c.fillStyle='#f1b66f';c.beginPath();c.arc(sunX,sunY,27,0,Math.PI*2);c.fill();
      c.globalAlpha=mix;c.fillStyle='#f5e8bd';c.beginPath();c.arc(760,95,21,0,Math.PI*2);c.fill();c.globalAlpha=1;
      for(const cl of this.clouds){c.globalAlpha=.72*(1-mix*.65);c.fillStyle='#fffaf0';c.beginPath();c.ellipse(cl.x,cl.y,29*cl.s,9*cl.s,0,0,Math.PI*2);c.ellipse(cl.x-12*cl.s,cl.y+2,14*cl.s,8*cl.s,0,0,Math.PI*2);c.ellipse(cl.x+12*cl.s,cl.y+1,17*cl.s,8*cl.s,0,0,Math.PI*2);c.fill();}c.globalAlpha=1;
    }
    drawLand(c,mix){
      const distant=blend([226,199,155],[93,91,76],mix),near=blend([213,176,126],[79,82,67],mix),ground=blend([232,205,158],[117,104,79],mix),line=blend([180,145,103],[62,69,57],mix);
      c.fillStyle=rgb(distant);c.beginPath();c.moveTo(0,260);c.lineTo(80,216);c.lineTo(159,259);c.lineTo(266,194);c.lineTo(383,267);c.lineTo(475,224);c.lineTo(593,263);c.lineTo(710,207);c.lineTo(830,266);c.lineTo(920,224);c.lineTo(960,242);c.lineTo(960,GROUND);c.lineTo(0,GROUND);c.fill();
      c.fillStyle=rgb(near);c.beginPath();c.moveTo(0,295);c.quadraticCurveTo(170,260,345,300);c.quadraticCurveTo(570,328,755,286);c.quadraticCurveTo(850,270,960,295);c.lineTo(960,GROUND);c.lineTo(0,GROUND);c.fill();
      c.fillStyle=rgb(ground);c.fillRect(0,GROUND,W,H-GROUND);c.strokeStyle=rgb(line);c.lineWidth=2;c.beginPath();c.moveTo(0,GROUND);c.lineTo(W,GROUND);c.stroke();
      // Moving ground flecks and distant scrub provide depth without heavy assets.
      for(let i=0;i<23;i++){const x=((i*71-this.distance*.7)%W+W)%W;const y=GROUND+13+(i*29%78);c.globalAlpha=.22;c.fillStyle=i%2?'#fff5dc':'#8d744f';c.fillRect(x,y,5+(i%4)*2,1.3);}c.globalAlpha=1;
      for(const p of this.plants){const x=((p.x-this.distance*.17)% (W+80)+(W+80))%(W+80)-20;c.globalAlpha=.7;c.strokeStyle=rgb(line);c.lineWidth=2;c.beginPath();c.moveTo(x,GROUND);c.lineTo(x,GROUND-13);c.moveTo(x,GROUND-5);c.lineTo(x-6,GROUND-10);c.moveTo(x,GROUND-8);c.lineTo(x+7,GROUND-14);c.stroke();c.globalAlpha=1;}
    }
    drawObstacle(c,o,mix){const color=rgb(blend([64,105,73],[80,102,79],mix));c.fillStyle=color;
      if(o.type==='cactus'){
        const w=o.w,h=o.h,x=o.x,y=GROUND-h;c.beginPath();c.roundRect(x+w*.34,y,w*.34,h,5);c.roundRect(x,y+h*.42,w*.38,h*.12,5);c.roundRect(x,y+h*.28,w*.14,h*.27,5);c.roundRect(x+w*.66,y+h*.31,w*.34,h*.12,5);c.roundRect(x+w*.86,y+h*.17,w*.14,h*.27,5);c.fill();c.fillStyle='rgba(255,241,199,.35)';c.fillRect(x+w*.51,y+6,2,h-10);
      }else if(o.type==='rock'){
        c.beginPath();c.moveTo(o.x,GROUND);c.lineTo(o.x+4,GROUND-o.h*.55);c.lineTo(o.x+o.w*.3,GROUND-o.h);c.lineTo(o.x+o.w*.65,GROUND-o.h*.83);c.lineTo(o.x+o.w,GROUND-o.h*.42);c.lineTo(o.x+o.w-3,GROUND);c.closePath();c.fill();c.fillStyle='rgba(255,245,210,.32)';c.fillRect(o.x+o.w*.3,GROUND-o.h+5,7,2);
      }else{
        const y=o.y+Math.sin(this.elapsed*8+o.phase)*3;c.save();c.translate(o.x,y);c.fillStyle=color;c.beginPath();c.ellipse(22,14,16,8,0,0,Math.PI*2);c.fill();const wing=Math.sin(this.elapsed*16+o.phase)*7;c.beginPath();c.moveTo(18,14);c.quadraticCurveTo(20,-wing,37,5);c.quadraticCurveTo(30,15,18,14);c.fill();c.beginPath();c.moveTo(36,12);c.lineTo(45,15);c.lineTo(36,17);c.fill();c.fillStyle='#f3c874';c.beginPath();c.arc(34,11,1.5,0,Math.PI*2);c.fill();c.restore();
      }
    }
  }

  function rounded(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
  function blend(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t));}
  function rgb(a){return `rgb(${a[0]} ${a[1]} ${a[2]})`;}

  const audio=new AudioFX();
  const game=new Game();
  function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));}
  new ResizeObserver(resize).observe(canvas);resize();

  document.getElementById('playButton').addEventListener('click',()=>game.start());
  document.getElementById('restartButton').addEventListener('click',()=>game.start());
  document.getElementById('resumeButton').addEventListener('click',()=>game.resume());
  document.getElementById('pauseButton').addEventListener('click',()=>game.pause());
  document.getElementById('pauseRestartButton').addEventListener('click',()=>game.start());
  document.getElementById('pauseMenuButton').addEventListener('click',()=>game.menu());
  document.getElementById('gameOverMenuButton').addEventListener('click',()=>game.menu());
  document.getElementById('homeLink').addEventListener('click',e=>{e.preventDefault();game.menu();});
  ui.sound.addEventListener('click',()=>{audio.muted=!audio.muted;ui.sound.textContent=audio.muted?'×':'♪';ui.sound.title=audio.muted?'Sound off':'Sound on';ui.sound.setAttribute('aria-label',audio.muted?'Turn sound on':'Turn sound off');if(!audio.muted)audio.click();});

  function jump(){if(game.state==='running')game.input.jumpPressed=true;else if(game.state==='menu')game.start();}
  function setDuck(value){game.input.duck=value;}
  document.getElementById('jumpButton').addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  const duckButton=document.getElementById('duckButton');
  duckButton.addEventListener('pointerdown',e=>{e.preventDefault();duckButton.setPointerCapture(e.pointerId);setDuck(true);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>duckButton.addEventListener(type,()=>setDuck(false)));
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();jump();}},{passive:false});
  window.addEventListener('keydown',e=>{
    const key=e.code;
    if(['Space','ArrowUp','ArrowDown'].includes(key))e.preventDefault();
    if(key==='Enter'){if(game.state==='menu'||game.state==='over')game.start();else if(game.state==='paused')game.resume();}
    if(key==='Escape'||key==='KeyP'){if(game.state==='running')game.pause();else if(game.state==='paused')game.resume();}
    if(key==='Space'||key==='ArrowUp'){if(!e.repeat)jump();}
    if(key==='ArrowDown')setDuck(true);
  });
  window.addEventListener('keyup',e=>{if(e.code==='ArrowDown')setDuck(false);});
  window.addEventListener('blur',()=>{setDuck(false);if(game.state==='running')game.pause();});
})();
