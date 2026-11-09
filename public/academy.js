/* Interactive chess demonstrations. Uses the same chess.js rules engine as the game. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let ctx=null,enabled=localStorage.getItem('ichess-muted')!=='1';
const AC=window.AudioContext||window.webkitAudioContext;
function tone(freq,start,duration,volume=.055,type='sine'){
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;
  osc.frequency.setValueAtTime(freq,start);gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(volume,start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.015);
}
function sound(kind='move'){
 if(!enabled||!AC)return;
 try{ctx=ctx||new AC();if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 const t=ctx.currentTime+.012;
 const patterns={
 move:[[520,0,.09,.035],[680,.065,.095,.026]],
 capture:[[340,0,.1,.065],[520,.08,.13,.04],[740,.16,.13,.025]],
 check:[[740,0,.12,.06],[930,.12,.16,.045]],
 draw:[[560,0,.18,.045],[470,.18,.2,.04],[520,.38,.28,.03]],
 win:[[523,0,.15,.05],[659,.14,.15,.05],[784,.28,.17,.055],[1046,.46,.36,.06]],
 castle:[[420,0,.11,.04],[630,.13,.13,.04]],
 promote:[[540,0,.1,.04],[740,.1,.12,.04],[980,.22,.22,.045]]};
 for(const [f,delay,dur,vol] of patterns[kind]||patterns.move)tone(f,t+delay,dur,vol);
 }catch(e){console.warn('Sound unavailable',e)}
}
function beep(move){if(move&&move.san&&move.san.includes('#'))return sound('win');if(move&&move.san&&move.san.includes('+'))return sound('check');if(move&&move.captured)return sound('capture');if(move&&move.promotion)return sound('promote');if(move&&move.san&&move.san.startsWith('O-O'))return sound('castle');sound('move')}
window.iChessSound={lastCount:0,play:beep,event:sound};
function updateSound(){ $('sound-toggle').textContent=enabled?'🔊 Sound On':'🔇 Sound Off';$('sound-toggle').setAttribute('aria-pressed',String(enabled))}
$('sound-toggle').onclick=()=>{enabled=!enabled;localStorage.setItem('ichess-muted',enabled?'0':'1');updateSound();if(enabled)sound('move')};updateSound();
// Every line is replayed using legal chess.js moves; practice asks the learner to reproduce the next move.
const lessons=[
['basics','beginner','The board and the center','', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O O-O','Watch the center squares e4 and e5. White starts; players alternate turns.'],
['basics','beginner','How pawns advance','','e4 e5 d4 exd4 Qxd4 Nc6 Qe3 Nf6 Nc3 Bb4','A pawn moves forward but captures diagonally.'],
['basics','beginner','Knight jumps','','Nf3 Nf6 Nc3 Nc6 d4 d5 Bf4 Bf5 e3 e6','Knights jump in an L-shape, even over other pieces.'],
['basics','beginner','Bishop diagonals','','e4 e5 Bc4 Bc5 Nf3 Nc6 d3 d6 Nc3 Nf6','Bishops slide diagonally once the pawn clears their path.'],
['basics','beginner','Rooks and open files','','e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 Re1','Rooks become active on open or semi-open files.'],
['basics','intermediate','King safety and castling','','e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d3 O-O','Castling moves the king and rook together to improve king safety.'],
['basics','intermediate','Pins in the opening','','e4 e5 Nf3 Nc6 Bb5 a6','The bishop on b5 pins a knight to the king in many variations.'],
['basics','pro','A tactical mating pattern','','f3 e5 g4 Qh4#','Fool’s Mate shows how weakening the king can lose immediately.'],
['opening','beginner','Italian Game','','e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 c3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 d4 exd4 cxd4','Develop pieces, contest the center and prepare to castle.'],
['opening','beginner','London System','','d4 d5 Nf3 Nf6 Bf4 e6 e3 Bd6 Bd3 O-O O-O c5 c3 Nc6 Nbd2 b6 Re1 Bb7','A practical setup: develop the dark-square bishop before e3.'],
['opening','beginner','Queen’s Gambit','','d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 Bd3 Bb7','White challenges Black’s central d5 pawn with c4.'],
['opening','intermediate','Ruy Lopez','','e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7','White applies long-term pressure against e5.'],
['opening','intermediate','Sicilian Defense','','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Be2 e6 O-O Be7 Be3 O-O f4 Nc6','Black plays for asymmetric counterplay rather than copying e5.'],
['opening','intermediate','Caro-Kann Defense','','e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3','Black builds a resilient pawn structure and develops the light bishop.'],
['opening','intermediate','French Defense','','e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 Qb6 Na4 Qa5+ c3','White gains space; Black attacks the pawn center.'],
['opening','pro','Najdorf Sicilian structure','','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O','The a6 move prepares queenside expansion and flexible development.'],
['opening','pro','Queen’s Gambit Declined: development','','d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 O-O Nbd7 Rc1 c6 Qc2 Re8 Rfd1','Study piece coordination and the tension in the center.'],
['opening','pro','King’s Indian Defense','','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5','Black permits White a broad center, then strikes it with ...e5.'],
['endgame','beginner','King and pawn promotion','8/8/8/8/4k3/8/4P3/4K3 w - - 0 1','Kd2 Kd4 e3+ Ke4 Ke2','Activate your king to escort a pawn. This is an illustrative position, not a forced win.'],
['endgame','beginner','Queen checkmate pattern','7k/8/5K2/8/8/8/8/6Q1 w - - 0 1','Qg7#','A supported queen gives mate with the king nearby.'],
['endgame','beginner','Rook checking technique','7k/8/5K2/8/8/8/8/R7 w - - 0 1','Ra8#','A rook cuts off the last rank while the king covers escape squares.'],
['endgame','intermediate','Opposition','8/8/8/4k3/8/4K3/4P3/8 w - - 0 1','Kd3 Kd5 e4+','Use king positioning to gain space before advancing the pawn.'],
['endgame','intermediate','Passed pawn race','8/4k3/8/8/4P3/8/8/4K3 w - - 0 1','Kd2 Ke6 Kd3','Calculate the king’s square and the pawn’s promotion race.'],
['endgame','pro','Lucena bridge concept','1K6/1P1k4/8/8/8/8/8/1R5r w - - 0 1','', 'Lucena is a rook-and-pawn winning technique: use a rook bridge to shield your king. Inspect the setup and study the principle.'],
['endgame','pro','Philidor defense concept','8/8/3k4/8/3PK3/8/8/r2R4 b - - 0 1','', 'Philidor defense holds the third rank and checks from behind after the pawn advances. Inspect the setup.'],
['endgame','pro','Zugzwang and calculation','8/8/8/3k4/8/3K4/4P3/8 w - - 0 1','', 'Zugzwang means the obligation to move worsens your position. Explore candidate king moves.']
];
const training=new Chess();let selected=null,step=0,sequence=[],playing=false,timer=null,practice=false,topic=null,previousMove=null,trainingActive=false;
function stop(){playing=false;clearTimeout(timer);timer=null;$('academy-play').textContent='▶ Play'}
function load(){stop();const filtered=lessons.filter(l=>l[0]===$('academy-track').value&&l[1]===$('academy-level').value);$('academy-topic').replaceChildren();for(let i=0;i<filtered.length;i++){const o=document.createElement('option');o.value=i;o.textContent=filtered[i][2];$('academy-topic').append(o)}topic=filtered[0]||null;start()}
function start(){stop();topic=lessons.filter(l=>l[0]===$('academy-track').value&&l[1]===$('academy-level').value)[Number($('academy-topic').value)||0]||null;if(!topic){$('academy-caption').textContent='More lessons coming soon';return}training.load(topic[3]||new Chess().fen());sequence=[];for(const san of topic[4].split(/\s+/).filter(Boolean)){const m=training.move(san,{sloppy:true});if(!m){console.warn('Invalid training move:',topic[2],san);break}sequence.push(m)}training.load(topic[3]||new Chess().fen());step=0;selected=null;previousMove=null;practice=false;render()}
function next(){if(step>=sequence.length){stop();return}const m=sequence[step],played=training.move(m.san);if(!played){stop();$('academy-feedback').textContent='Training position error';return}step++;previousMove=played;beep(played);render()}
function back(){if(step===0)return;training.undo();step--;previousMove=step?sequence[step-1]:null;render()}
function render(){const b=$('academy-board');b.replaceChildren();for(let rank=8;rank>=1;rank--)for(const f of 'abcdefgh'){const sq=f+rank,p=training.get(sq),el=document.createElement('div');el.className='square '+((('abcdefgh'.indexOf(f)+rank)%2)?'light':'dark');if(previousMove&&previousMove.from===sq)el.classList.add('demo-from');if(previousMove&&previousMove.to===sq)el.classList.add('demo-to');if(sq===selected)el.classList.add('selected');if(p){const img=document.createElement('img');img.className='piece';img.alt=(p.color==='w'?'White ':'Black ')+p.type;img.src=`pieces/${p.color}${p.type}.png`;el.append(img)}el.setAttribute('aria-label',sq);el.addEventListener('click',()=>tap(sq));b.append(el)}const upcoming=sequence[step];$('academy-caption').textContent=`${topic[2]} — ${topic[5]} ${step}/${sequence.length} moves shown.${upcoming?' Next: '+upcoming.san:''}`;$('training-status').textContent=trainingActive?`Lesson: ${topic[2]} • ${step}/${sequence.length}`:'';$('academy-back').disabled=step===0;$('academy-forward').disabled=step===sequence.length;$('academy-practice').textContent=practice?'🎯 Practice mode ON':'🎯 Try yourself'}
function tap(sq){if(!practice)return;const p=training.get(sq);if(selected){const expected=sequence[step];if(!expected){$('academy-feedback').textContent='Lesson complete! Replay to practice again.';return}if(expected.from===selected&&expected.to===sq){const played=training.move(expected.san);if(!played)return;step++;previousMove=played;selected=null;beep(played);$('academy-feedback').textContent='✓ Correct! '+played.san+(step===sequence.length?' — Lesson complete!':' — Continue with the next move.');render();return}if(p&&p.color===training.turn()){selected=sq;render();return}$('academy-feedback').textContent='Not this move. Look for '+expected.san+'.';selected=null;render();return}if(p&&p.color===training.turn()){selected=sq;$('academy-feedback').textContent='Choose the destination for '+sq;render()}}
function enterTraining(){trainingActive=true;stop();$('board').hidden=true;$('academy-board').hidden=false;$('training-bar').hidden=false;$('game-controls').hidden=true;$('academy-board').classList.add('training-main-board');$('board-wrap').append($('academy-board'));render();$('board-wrap').scrollIntoView({behavior:'smooth',block:'center'});}
function exitTraining(){stop();trainingActive=false;$('academy-board').hidden=true;$('board').hidden=false;$('training-bar').hidden=true;$('game-controls').hidden=false;$('training-status').textContent='';}
$('enter-training').onclick=enterTraining;$('exit-training').onclick=exitTraining;
$('academy-track').onchange=load;$('academy-level').onchange=load;$('academy-topic').onchange=start;$('academy-forward').onclick=()=>{stop();next()};$('academy-back').onclick=()=>{stop();back()};$('academy-restart').onclick=start;$('academy-play').onclick=()=>{if(playing){stop();return}if(step>=sequence.length)start();if(!sequence.length){$('academy-feedback').textContent='This concept lesson is a position study; no automatic moves are available.';return}playing=true;$('academy-play').textContent='⏸ Pause';const tick=()=>{if(!playing)return;if(step>=sequence.length){stop();return}next();timer=setTimeout(tick,Number($('academy-speed').value))};timer=setTimeout(tick,550)};$('academy-practice').onclick=()=>{stop();practice=!practice;selected=null;$('academy-feedback').textContent=practice?'Select the piece and destination for the next demonstrated move.':'Practice paused.';render()};load();$('academy-board').hidden=true;
})();
