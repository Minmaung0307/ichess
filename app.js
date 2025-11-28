"use strict";

/* ---------- Config: Network (Firebase) ---------- */
// Set enableNetwork = true to enable real-time play (must provide firebaseConfig)
const enableNetwork = true; // set false to disable network features
const firebaseConfig = {
  apiKey: "AIzaSyA3Qv64SXZMejW9IX5ayzUFXuTlmZlFM8A",
  authDomain: "chess-mm.firebaseapp.com",
  projectId: "chess-mm",
  storageBucket: "chess-mm.firebasestorage.app",
  messagingSenderId: "875549272410",
  appId: "1:875549272410:web:d7bb303a2f17cfa0a5eb63",
  measurementId: "G-FDH4HE6L9T"
};

const clientId = Math.random().toString(36).slice(2,9); // unique id for this client session
let networkGameId = null; // assigned when creating/joining a network game
let networkRef = null;

if(enableNetwork){
  if(typeof firebase !== "undefined"){
    firebase.initializeApp(firebaseConfig);
    var database = firebase.database();
  } else {
    console.warn("Firebase scripts not loaded. Network disabled.");
  }
}

/* ---------- DOM refs ---------- */
const boardElem = document.getElementById("board");
const movesText = document.getElementById("movesText");
const stateText = document.getElementById("stateText");
const selectedInfo = document.getElementById("selectedInfo");
const advText = document.getElementById("advText");
const drillArea = document.getElementById("drillArea");
const toggleHints = document.getElementById("toggleHints");

/* ---------- Globals ---------- */
let orientation = "white";
let game = null;

/* unicode */
const PIECE_UNICODE = {
  'K': '♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙',
  'k': '♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟︎'
};

/* initial fen */
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

/* helpers (same as before) */
function createEmptyBoard(){ return Array.from({length:8},()=>Array(8).fill("")); }
function fenToBoard(fen){
  const rows = fen.split(" ")[0].split("/");
  const b = createEmptyBoard();
  for(let r=0;r<8;r++){
    let file=0;
    for(const ch of rows[r]){
      if(/\d/.test(ch)){ file += Number(ch); }
      else { b[r][file] = ch; file++; }
    }
  }
  return b;
}
function cloneBoard(b){ return b.map(row=>row.slice()); }
function inBounds(x,y){ return x>=0 && x<8 && y>=0 && y<8; }
function pieceColor(piece){ if(!piece) return null; return piece === piece.toUpperCase() ? 'w' : 'b'; }
function otherColor(c){ return c === 'w' ? 'b' : 'w'; }
function findKing(b, color){ const match = color==='w' ? /K/ : /k/; for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(match.test(b[r][c])) return [r,c]; return null; }
const PIECE_VALUE = { 'p':1,'n':3,'b':3,'r':5,'q':9,'k':900 };

/* --------- Attacks, pseudo moves, legal move generation (same as prior) ---------- */

function isSquareAttacked(b, targetR, targetC, byColor){
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p = b[r][c]; if(!p) continue; if(pieceColor(p)!==byColor) continue;
    const type = p.toLowerCase();
    if(type === 'p'){
      const dir = byColor === 'w' ? -1 : 1;
      const attacks = [[r+dir, c-1],[r+dir, c+1]];
      for(const [ar,ac] of attacks) if(ar===targetR && ac===targetC) return true;
    } else if(type === 'n'){
      const del = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for(const [dr,dc] of del) if(r+dr===targetR && c+dc===targetC) return true;
    } else if(type === 'b' || type === 'q'){
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
      for(const [dr,dc] of dirs){
        let rr=r+dr, cc=c+dc;
        while(inBounds(rr,cc)){
          if(rr===targetR && cc===targetC) return true;
          if(b[rr][cc]) break;
          rr+=dr; cc+=dc;
        }
      }
    }
    if(type === 'r' || type==='q'){
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for(const [dr,dc] of dirs){
        let rr=r+dr, cc=c+dc;
        while(inBounds(rr,cc)){
          if(rr===targetR && cc===targetC) return true;
          if(b[rr][cc]) break;
          rr+=dr; cc+=dc;
        }
      }
    }
    if(type === 'k'){
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
        if(dr===0 && dc===0) continue;
        if(r+dr===targetR && c+dc===targetC) return true;
      }
    }
  }
  return false;
}

function generatePseudoMoves(b, r, c){
  const p = b[r][c]; if(!p) return [];
  const color = pieceColor(p); const type = p.toLowerCase(); const moves = [];
  if(type === 'p'){
    const dir = color === 'w' ? -1 : 1; const startRow = color === 'w' ? 6 : 1;
    if(inBounds(r+dir,c) && !b[r+dir][c]) { moves.push([r+dir,c]); if(r===startRow && !b[r+2*dir][c]) moves.push([r+2*dir,c]); }
    for(const dc of [-1,1]){ const rr=r+dir, cc=c+dc; if(inBounds(rr,cc) && b[rr][cc] && pieceColor(b[rr][cc]) !== color) moves.push([rr,cc]); }
  } else if(type === 'n'){
    const del = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for(const [dr,dc] of del){ const rr=r+dr, cc=c+dc; if(!inBounds(rr,cc)) continue; if(!b[rr][cc] || pieceColor(b[rr][cc]) !== color) moves.push([rr,cc]); }
  } else if(type === 'b' || type === 'r' || type==='q'){
    const dirs = [];
    if(type==='b' || type==='q') dirs.push(...[[-1,-1],[-1,1],[1,-1],[1,1]]);
    if(type==='r' || type==='q') dirs.push(...[[-1,0],[1,0],[0,-1],[0,1]]);
    for(const [dr,dc] of dirs){
      let rr=r+dr, cc=c+dc;
      while(inBounds(rr,cc)){
        if(!b[rr][cc]) { moves.push([rr,cc]); rr+=dr; cc+=dc; continue; }
        if(pieceColor(b[rr][cc]) !== color) moves.push([rr,cc]);
        break;
      }
    }
  } else if(type==='k'){
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(dr===0 && dc===0) continue; const rr=r+dr, cc=c+dc; if(!inBounds(rr,cc)) continue; if(!b[rr][cc] || pieceColor(b[rr][cc]) !== color) moves.push([rr,cc]); }
    if(color==='w' && r===7 && c===4){
      if(game.castling.wk && !b[7][5] && !b[7][6] && !isSquareAttacked(b,7,4,'b') && !isSquareAttacked(b,7,5,'b') && !isSquareAttacked(b,7,6,'b')) moves.push([7,6]);
      if(game.castling.wq && !b[7][3] && !b[7][2] && !b[7][1] && !isSquareAttacked(b,7,4,'b') && !isSquareAttacked(b,7,3,'b') && !isSquareAttacked(b,7,2,'b')) moves.push([7,2]);
    }
    if(color==='b' && r===0 && c===4){
      if(game.castling.bk && !b[0][5] && !b[0][6] && !isSquareAttacked(b,0,4,'w') && !isSquareAttacked(b,0,5,'w') && !isSquareAttacked(b,0,6,'w')) moves.push([0,6]);
      if(game.castling.bq && !b[0][3] && !b[0][2] && !b[0][1] && !isSquareAttacked(b,0,4,'w') && !isSquareAttacked(b,0,3,'w') && !isSquareAttacked(b,0,2,'w')) moves.push([0,2]);
    }
  }
  return moves;
}

function generateLegalMoves(b, r, c){
  const p = b[r][c]; if(!p) return [];
  const color = pieceColor(p); const pseudo = generatePseudoMoves(b,r,c); const legal = [];
  for(const [tr,tc] of pseudo){
    const copy = cloneBoard(b);
    if(p.toLowerCase()==='k' && Math.abs(tc - c) === 2){
      copy[tr][tc] = copy[r][c]; copy[r][c] = "";
      if(tc === 6){ copy[tr][5] = copy[tr][7]; copy[tr][7] = ""; }
      else if(tc === 2){ copy[tr][3] = copy[tr][0]; copy[tr][0] = ""; }
    } else {
      copy[tr][tc] = copy[r][c]; copy[r][c] = "";
    }
    if(p.toLowerCase()==='p' && (tr===0 || tr===7)) copy[tr][tc] = (color==='w'?'Q':'q');
    const kingPos = findKing(copy, color);
    if(!kingPos) continue;
    const [kr,kc] = kingPos;
    if(!isSquareAttacked(copy, kr,kc, otherColor(color))) legal.push([tr,tc]);
  }
  return legal;
}

/* ---------- Game object & move application ---------- */

function newGame(){
  const b = fenToBoard(START_FEN);
  game = {
    board: b,
    turn: 'w',
    selected: null,
    history: [],
    castling: { wk:true,wq:true,bk:true,bq:true },
    halfmoveClock:0,
    fullmove:1,
    flipped:false
  };
  renderBoard(); updateStatus(); advText.innerText = ""; drillArea.innerText = "No drill loaded.";
  // if network, create or join game (for demo, we auto-create small gameId)
  if(enableNetwork && database){
    networkGameId = prompt("Enter gameId to join or leave blank to create new game:");
    if(!networkGameId){
      networkGameId = "g_" + Math.random().toString(36).slice(2,8);
      alert("Created gameId: " + networkGameId + "\nShare this id with opponent to join.");
    } else {
      alert("Joining gameId: " + networkGameId);
    }
    setupNetworkListeners(networkGameId);
  }
}

function makeMove(fromR,fromC,toR,toC, byNetwork=false){
  const b = game.board;
  const piece = b[fromR][fromC];
  const captured = b[toR][toC];
  const beforeCastling = {...game.castling};
  const fenBefore = boardToSimpleFen(b);

  if(piece.toLowerCase()==='k' && Math.abs(toC - fromC) === 2){
    b[toR][toC] = b[fromR][fromC]; b[fromR][fromC] = "";
    if(toC === 6){ b[toR][5] = b[toR][7]; b[toR][7] = ""; }
    else if(toC === 2){ b[toR][3] = b[toR][0]; b[toR][0] = ""; }
  } else {
    b[toR][toC] = b[fromR][fromC]; b[fromR][fromC] = "";
  }

  if(piece.toLowerCase()==='p' && (toR===0 || toR===7)){
    b[toR][toC] = piece === piece.toUpperCase() ? 'Q' : 'q';
  }

  updateCastlingRights(piece, fromR,fromC, toR,toC, captured);

  game.history.push({from:[fromR,fromC], to:[toR,toC], piece, captured, fenBefore, castlingBefore: beforeCastling});
  game.turn = otherColor(game.turn);
  if(game.turn === 'w') game.fullmove++;
  renderBoard(); updateStatus(); checkGameOver();

  // if network and this move was local, push to network
  if(enableNetwork && !byNetwork && networkRef && clientId){
    pushMoveToNetwork(networkRef, { from:[fromR,fromC], to:[toR,toC], piece, by: clientId, fen: boardToSimpleFen(game.board) });
  }
}

function updateCastlingRights(piece, fr,fc, tr,tc, captured){
  const p = piece.toLowerCase();
  if(p === 'k'){
    if(piece === piece.toUpperCase()) { game.castling.wk = false; game.castling.wq = false; }
    else { game.castling.bk = false; game.castling.bq = false; }
  }
  if(p === 'r'){
    if(fr===7 && fc===0) game.castling.wq = false;
    if(fr===7 && fc===7) game.castling.wk = false;
    if(fr===0 && fc===0) game.castling.bq = false;
    if(fr===0 && fc===7) game.castling.bk = false;
  }
  if(captured){
    const cp = captured.toLowerCase();
    if(cp === 'r'){
      if(tr===7 && tc===0) game.castling.wq = false;
      if(tr===7 && tc===7) game.castling.wk = false;
      if(tr===0 && tc===0) game.castling.bq = false;
      if(tr===0 && tc===7) game.castling.bk = false;
    }
  }
}

function undo(){
  if(game.history.length===0) return;
  const last = game.history.pop();
  game.board = fenToBoard(last.fenBefore);
  game.castling = {...last.castlingBefore};
  game.turn = pieceColor(last.piece) === 'w' ? 'w' : 'b';
  if(game.turn === 'b') game.fullmove = Math.max(1, game.fullmove - 1);
  renderBoard(); updateStatus(); advText.innerText = "";
}

/* ---------- FEN conversion ---------- */
function boardToSimpleFen(b){
  return b.map(row=>{
    let fenRow = ""; let empty=0;
    for(const sq of row){
      if(!sq) empty++;
      else { if(empty>0){ fenRow += empty; empty=0;} fenRow += sq; }
    }
    if(empty>0) fenRow += empty;
    return fenRow;
  }).join("/");
}

/* ---------- render UI ---------- */

function renderBoard(){
  boardElem.innerHTML = "";
  const b = game.board;
  const rows = orientation === 'white' ? [...Array(8).keys()] : [...Array(8).keys()].reverse();
  const cols = orientation === 'white' ? [...Array(8).keys()] : [...Array(8).keys()].reverse();

  for(const r of rows){
    for(const c of cols){
      const square = document.createElement("div");
      square.classList.add("square");
      const isLight = ((r + c) % 2 === 0);
      square.classList.add(isLight ? "light" : "dark");
      square.dataset.r = r; square.dataset.c = c;

      const p = b[r][c];
      if(p){
        const span = document.createElement("div");
        span.classList.add("piece");
        // color class: white or black
        span.classList.add(pieceColor(p) === 'w' ? 'white' : 'black');
        span.innerText = PIECE_UNICODE[p] || p;
        square.appendChild(span);
      } else {
        const dot = document.createElement("div");
        dot.className = "dot";
        dot.style.display = "none";
        square.appendChild(dot);
      }

      square.addEventListener("click", onSquareClick);
      boardElem.appendChild(square);
    }
  }
  if(game.history.length>0){
    const last = game.history[game.history.length-1];
    highlightLastMove(last.from, last.to);
  }
}

function highlightLastMove(from, to){
  const squares = boardElem.querySelectorAll(".square");
  squares.forEach(sq=>sq.classList.remove("last-move","legal","attacked","highlight"));
  for(const sq of squares){
    const r = Number(sq.dataset.r), c = Number(sq.dataset.c);
    if(r===from[0] && c===from[1]) sq.classList.add("last-move");
    if(r===to[0] && c===to[1]) sq.classList.add("last-move");
  }
}

function updateStatus(){
  movesText.innerText = game.history.map((m,i)=> `${i+1}. ${shortMove(m)}`).join(" ");
  const checkStatus = isInCheck(game.board, game.turn);
  const mate = isCheckmate(game.board, game.turn);
  stateText.innerText = `${game.turn === 'w' ? 'White' : 'Black'} to move${checkStatus ? ' — CHECK' : ''}${mate ? ' — CHECKMATE' : ''}`;
}
function shortMove(m){ const p = m.piece; const name = p.toUpperCase(); const to = posToAlg(m.to[0],m.to[1]); return `${name}${to}`; }
function posToAlg(r,c){ const file = String.fromCharCode('a'.charCodeAt(0) + c); const rank = 8 - r; return `${file}${rank}`; }

/* ---------- click handling with alerts for each legal target ---------- */

let legalCache = [];

function onSquareClick(e){
  const sq = e.currentTarget;
  const r = Number(sq.dataset.r), c = Number(sq.dataset.c);
  const piece = game.board[r][c];

  // select own piece
  if(piece && pieceColor(piece) === game.turn){
    selectSquareAndAlertEach(r,c);
    return;
  }

  // if a target square is clicked to move
  if(game.selected){
    const [sr,sc] = game.selected;
    const found = legalCache.find(([tr,tc]) => tr===r && tc===c);
    if(found){
      // show short hint (alert) and then perform move
      let shortHint = "";
      if(toggleHints.checked){
        shortHint = showAdvantageExplain(sr,sc,r,c) || "";
      } else {
        shortHint = `${PIECE_UNICODE[game.board[sr][sc]] || game.board[sr][sc]} ${posToAlg(sr,sc)}→${posToAlg(r,c)}`;
      }
      try { alert(shortHint || "Move selected."); } catch(e) { console.log("Alert suppressed:", e); }
      // perform move (if network, makeMove will push it)
      makeMove(sr,sc,r,c);
      game.selected = null; legalCache = []; renderBoard();
      return;
    }
  }
  clearHighlights();
}

/* When selecting piece: highlight legal moves and alert each move's short hint in sequence */
function selectSquareAndAlertEach(r,c){
  clearHighlights();
  game.selected = [r,c];
  const p = game.board[r][c];
  selectedInfo.innerText = `Selected: ${PIECE_UNICODE[p] || p} at ${posToAlg(r,c)} (${pieceColor(p)==='w'?'White':'Black'})`;
  legalCache = generateLegalMoves(game.board, r,c);

  const squares = boardElem.querySelectorAll(".square");
  for(const sq of squares){
    const rr = Number(sq.dataset.r), cc = Number(sq.dataset.c);
    if(legalCache.find(([tr,tc])=>tr===rr && tc===cc)){
      sq.classList.add("legal");
      const dot = sq.querySelector(".dot"); if(dot) dot.style.display = "block";
    }
    if(isSquareAttacked(game.board, rr,cc, otherColor(game.turn))) sq.classList.add("attacked");
    if(rr===r && cc===c) sq.classList.add("highlight");
  }

  // Now, for each legal move produce a short hint and alert sequentially.
  // We space alerts slightly so they don't appear all at once (alerts are blocking anyway).
  if(legalCache.length>0){
    if(toggleHints.checked){
      // iterate and alert each short hint
      // Use synchronous alerts in series with small delays (user will dismiss each)
      legalCache.forEach(([tr,tc], idx) => {
        // compute short hint (we call showAdvantageExplain but that also sets advText — we will call a helper to compute short)
        const short = computeShortHint(r,c,tr,tc);
        // schedule alert (setTimeout gives small spacing)
        setTimeout(()=> {
          try { alert(`Move ${idx+1}/${legalCache.length} — ${posToAlg(tr,tc)}: ${short}`); } catch(e){ console.log("Alert suppressed",e); }
        }, idx * 350); // 350ms spacing
      });
    } else {
      // if hints not checked, still show a minimal line for all moves as one alert
      const summary = legalCache.map(([tr,tc],i)=>`${i+1}) ${posToAlg(tr,tc)}`).join(", ");
      try { alert(`Legal targets: ${summary}`); } catch(e){ /* ignore */ }
    }
  }
}

/* compute short hint (not alerting) */
function computeShortHint(fr,fc,tr,tc){
  const before = cloneBoard(game.board);
  const prevEval = evaluateBoard(before);
  const sim = cloneBoard(before);
  const piece = sim[fr][fc];
  if(piece.toLowerCase()==='k' && Math.abs(tc - fc) === 2){
    sim[tr][tc] = sim[fr][fc]; sim[fr][fc] = "";
    if(tc === 6){ sim[tr][5] = sim[tr][7]; sim[tr][7] = ""; }
    else { sim[tr][3] = sim[tr][0]; sim[tr][0] = ""; }
  } else {
    sim[tr][tc] = sim[fr][fc]; sim[fr][fc] = "";
  }
  if(piece.toLowerCase()==='p' && (tr===0 || tr===7)) sim[tr][tc] = piece === piece.toUpperCase() ? 'Q' : 'q';
  const afterEval = evaluateBoard(sim); const delta = afterEval - prevEval;
  const captured = game.board[tr][tc];
  const attacks = listAttacks(sim,tr,tc);
  const centerCoords = [[3,3],[3,4],[4,3],[4,4]];
  let parts = [];
  if(captured) parts.push(`Captures ${PIECE_UNICODE[captured] || captured}`);
  if(attacks.length>=2) parts.push("Fork potential");
  if(centerCoords.some(([x,y])=>x===tr && y===tc)) parts.push("Takes center");
  if(Math.abs(delta) < 0.05) parts.push("≈ equal");
  else if(delta > 0) parts.push(`Better for White +${delta.toFixed(2)}`);
  else parts.push(`Better for Black ${delta.toFixed(2)}`);
  return parts.join("; ");
}

/* showAdvantageExplain now returns short summary (and sets advText) */
function showAdvantageExplain(fr,fc,tr,tc){
  const before = cloneBoard(game.board);
  const prevEval = evaluateBoard(before);
  const sim = cloneBoard(before);
  const piece = sim[fr][fc];
  if(piece.toLowerCase()==='k' && Math.abs(tc - fc) === 2){
    sim[tr][tc] = sim[fr][fc]; sim[fr][fc] = "";
    if(tc === 6){ sim[tr][5] = sim[tr][7]; sim[tr][7] = ""; }
    else { sim[tr][3] = sim[tr][0]; sim[tr][0] = ""; }
  } else {
    sim[tr][tc] = sim[fr][fc]; sim[fr][fc] = "";
  }
  if(piece.toLowerCase()==='p' && (tr===0 || tr===7)) sim[tr][tc] = piece === piece.toUpperCase() ? 'Q' : 'q';
  const afterEval = evaluateBoard(sim);
  const delta = afterEval - prevEval;
  const side = game.turn === 'w' ? 'White' : 'Black';
  let explanation = `${side} plays ${PIECE_UNICODE[game.board[fr][fc]] || game.board[fr][fc]} ${posToAlg(fr,fc)}→${posToAlg(tr,tc)}\n\n`;
  const captured = game.board[tr][tc];
  if(captured) explanation += `Captures ${PIECE_UNICODE[captured] || captured} — material gain.\n`;
  if(Math.abs(delta) < 0.05) explanation += "Small change in eval (≈ equal).\n";
  else if(delta > 0) explanation += `Improves White by ≈ +${delta.toFixed(2)}.\n`;
  else explanation += `Improves Black by ≈ ${delta.toFixed(2)}.\n`;
  const attacks = listAttacks(sim, tr,tc);
  if(attacks.length>=2) explanation += "Tactical: attacks multiple targets (fork potential).\n";
  const centerCoords = [[3,3],[3,4],[4,3],[4,4]];
  if(centerCoords.some(([x,y])=>x===tr && y===tc)) explanation += "Good: occupies/controls central square.\n";
  const mAfter = generatePseudoMoves(sim,tr,tc).length;
  if(mAfter >= 4) explanation += `Mobility: approx ${mAfter} available squares.\n`;
  advText.innerText = explanation;
  // return short for alert
  return computeShortHint(fr,fc,tr,tc);
}

/* ---------- listAttacks helper ---------- */
function listAttacks(b, r,c){
  const p = b[r][c]; if(!p) return [];
  const color = pieceColor(p); const attacked = [];
  for(let rr=0;rr<8;rr++) for(let cc=0;cc<8;cc++){
    if(!b[rr][cc]) continue; if(pieceColor(b[rr][cc]) === color) continue;
    const pseudo = generatePseudoMoves(b,r,c);
    if(pseudo.find(([tr,tc])=>tr===rr && tc===cc)) attacked.push([rr,cc,b[rr][cc]]);
  }
  return attacked;
}

/* ---------- check / checkmate ---------- */
function isInCheck(b, color){ const king = findKing(b, color); if(!king) return true; const [kr,kc] = king; return isSquareAttacked(b,kr,kc, otherColor(color)); }
function isCheckmate(b, color){
  if(!isInCheck(b,color)) return false;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    if(!b[r][c] || pieceColor(b[r][c])!==color) continue;
    const legal = generateLegalMoves(b,r,c);
    if(legal.length>0) return false;
  }
  return true;
}

/* ---------- evaluation ---------- */
function evaluateBoard(b){
  let score = 0;
  const centerSquares = [[3,3],[3,4],[4,3],[4,4]];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p = b[r][c]; if(!p) continue;
    const val = PIECE_VALUE[p.toLowerCase()] || 0; const color = pieceColor(p);
    score += (color==='w' ? 1 : -1) * val;
    if(centerSquares.some(([x,y])=>x===r && y===c)) score += (color==='w' ? 0.25 : -0.25) * (val>0?1:0);
    const moves = generatePseudoMoves(b,r,c).length;
    score += (color==='w' ? 1 : -1) * (moves * 0.02);
  }
  return score;
}

/* ---------- Training placeholders ---------- */
const TACTICS = [ /* ... */ ];
const OPENINGS = [ /* ... */ ];
const ENDGAMES = [ /* ... */ ];

function loadTactic(i=0){ drillArea.innerText = "Tactic loaded."; }
function loadOpening(i=0){ drillArea.innerText = "Opening loaded."; }
function loadEndgame(i=0){ drillArea.innerText = "Endgame loaded."; }

/* ---------- network helpers (Firebase Realtime DB based) ---------- */

function setupNetworkListeners(gameId){
  if(!database) return;
  networkRef = database.ref('games/' + gameId + '/moves');
  // listen for incoming moves
  networkRef.on('child_added', snapshot => {
    const m = snapshot.val();
    // ignore moves originated from this client
    if(m.by === clientId) return;
    // apply move (safely)
    const from = m.from, to = m.to;
    // make move as network move (avoid re-pushing)
    try {
      makeMove(from[0],from[1],to[0],to[1], true);
    } catch(e){
      console.warn("Failed applying remote move", e);
    }
  });
}

/* push local move to network */
function pushMoveToNetwork(ref, payload){
  if(!ref) return;
  payload.ts = Date.now();
  payload.clientId = clientId;
  ref.push(payload);
}

/* ---------- Buttons ---------- */
document.getElementById("btnNew").addEventListener("click", ()=> newGame());
document.getElementById("btnUndo").addEventListener("click", ()=> undo());
document.getElementById("btnFlip").addEventListener("click", ()=> { orientation = orientation === 'white' ? 'black' : 'white'; renderBoard(); });
document.getElementById("btnTactics").addEventListener("click", ()=> loadTactic(0));
document.getElementById("btnOpenings").addEventListener("click", ()=> loadOpening(0));
document.getElementById("btnEndings").addEventListener("click", ()=> loadEndgame(0));
document.getElementById("btnClearDrill").addEventListener("click", ()=> { drillArea.innerText = "No drill loaded."; });

/* ---------- init ---------- */
newGame();

/* expose debug helpers */
window.__chess = {
  getGame: ()=>game,
  evaluate: ()=>evaluateBoard(game.board),
  setFen: (fen)=>{ game.board = fenToBoard(fen); renderBoard(); updateStatus(); }
};
