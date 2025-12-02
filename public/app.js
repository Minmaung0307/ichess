const firebaseConfig = {
  apiKey: "AIzaSyA3Qv64SXZMejW9IX5ayzUFXuTlmZlFM8A",
  authDomain: "chess-mm.firebaseapp.com",
  projectId: "chess-mm",
  storageBucket: "chess-mm.firebasestorage.app",
  messagingSenderId: "875549272410",
  appId: "1:875549272410:web:d7bb303a2f17cfa0a5eb63",
  measurementId: "G-FDH4HE6L9T",
};

document.addEventListener('DOMContentLoaded', () => { initApp(); });

function initApp() {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.database();

    let chess;
    if (typeof window.Chess === 'function') chess = new window.Chess();
    else if (typeof Chess === 'function') chess = new Chess();
    else return alert("Chess Library Missing!");
    chess.clear();

    // --- HTML Structure ---
    document.body.innerHTML = `
        <div class="game-container">
            <!-- Game Over Modal -->
            <div id="game-over-modal" class="modal-overlay">
                <div class="modal-content">
                    <h2 id="modal-title">GAME OVER</h2>
                    <p id="modal-msg"></p>
                    <button class="icon-btn close-btn" onclick="document.getElementById('game-over-modal').style.display='none'">Close</button>
                </div>
            </div>

            <!-- Promotion Modal -->
            <div id="promotion-modal" class="modal-overlay">
                <div class="modal-content">
                    <h3 style="color:#fff; margin-bottom:15px;">Promote to:</h3>
                    <div class="promo-options" id="promo-options"></div>
                </div>
            </div>

            <!-- Controls (Added Blind Button) -->
            <div class="controls-bar">
                <button id="btn-blind" class="icon-btn" style="background:#6c5ce7;">🙈 Blind</button>
                <button id="btn-flip" class="icon-btn">🔄 Flip</button>
                <button id="btn-undo" class="icon-btn">↩️ Undo</button>
                <button id="btn-reset" class="icon-btn" style="background:#d63031;">⚠️ Reset</button>
                <button id="btn-clear" class="icon-btn">🗑️ Clear</button>
            </div>
            
            <div class="status-bar">
                <span id="game-status" class="status-text">Setup Mode</span>
                <span id="ai-advice" class="ai-text">AI: Loading...</span>
            </div>

            <div id="board" class="board"></div>
            <div id="spares-area" class="spares-area"></div>

            <div style="margin-top:10px; font-size:12px; color:#666; width:100%; text-align:center;">
                <button id="btn-create" style="width:auto; padding:5px 10px;">Create Room</button>
                <input id="input-room" placeholder="ID" style="width:80px; padding:5px; background:#222; border:1px solid #444; color:#fff;">
                <button id="btn-join" style="width:auto; padding:5px 10px;">Join</button>
                <br>Room: <span id="room-id" style="color:#aaa;">—</span>
            </div>
        </div>
    `;

    const boardEl = document.getElementById('board');
    const sparesEl = document.getElementById('spares-area');
    const statusEl = document.getElementById('game-status');
    const aiEl = document.getElementById('ai-advice');
    
    // Modals
    const gameOverModal = document.getElementById('game-over-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-msg');
    
    const promoModal = document.getElementById('promotion-modal');
    const promoOptions = document.getElementById('promo-options');

    let selectedSquare = null;
    let possibleMoves = [];
    let isFlipped = false;
    let isBlind = false; // New State
    let bestMove = null;
    let stockfish = null;
    let dragGhost = null; 
    let activeDragData = null;
    let pendingMove = null; 

    const PIECE_SYMBOLS = { 
        w: { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚' },
        b: { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚' }
    };

    auth.signInAnonymously();

    async function initStockfish() {
        try {
            const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js');
            const blob = await res.blob();
            stockfish = new Worker(URL.createObjectURL(blob));
            stockfish.onmessage = (e) => {
                if (e.data.startsWith('bestmove')) {
                    const m = e.data.split(' ')[1];
                    if (m && m !== '(none)') {
                        bestMove = { from: m.substring(0,2), to: m.substring(2,4) };
                        aiEl.textContent = `Hint: ${m}`;
                        renderPieces(); 
                    }
                }
            };
            stockfish.postMessage('uci');
            aiEl.textContent = "AI: Ready";
        } catch(e) { aiEl.textContent = "AI: Offline"; }
    }
    function askAI() {
        if(!stockfish) return;
        bestMove = null;
        if (chess.game_over()) { aiEl.textContent = "AI: Stopped"; return; }
        stockfish.postMessage(`position fen ${chess.fen()}`);
        stockfish.postMessage('go depth 15 movetime 3000');
    }

    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = [8,7,6,5,4,3,2,1];

    function makeBoard() {
        boardEl.innerHTML = '';
        for (let r of ranks) {
            for (let f of files) {
                const sq = `${f}${r}`;
                const div = document.createElement('div');
                div.className = `square ${(f.charCodeAt(0)-97+r-1)%2===1 ? 'dark' : 'light'}`;
                div.dataset.square = sq;
                
                div.addEventListener('click', onSquareClick);
                div.addEventListener('contextmenu', (e) => { e.preventDefault(); chess.remove(sq); afterAction(); });
                div.addEventListener('dragover', e => e.preventDefault());
                div.addEventListener('drop', onDrop);

                if (f === 'a') addCoord(div, r, 'coord-tl');
                if (f === 'h') addCoord(div, r, 'coord-tr');
                if (r === 8) addCoord(div, f, 'coord-tl');
                if (r === 1) addCoord(div, f, 'coord-br');

                boardEl.appendChild(div);
            }
        }
    }
    function addCoord(parent, text, cls) {
        const c = document.createElement('div');
        c.className = `coord-num ${cls}`; c.textContent = text;
        parent.appendChild(c);
    }

    function renderPieces() {
        updateStatus(); 
        document.querySelectorAll('.square').forEach(div => {
            const sq = div.dataset.square;
            
            Array.from(div.children).forEach(child => {
                if (child.classList.contains('piece') || child.classList.contains('hint-dot') || child.classList.contains('capture-ring')) child.remove();
            });
            
            div.classList.remove('selected', 'check', 'best-move'); 
            if(selectedSquare === sq) div.classList.add('selected');
            if(bestMove && (sq === bestMove.from || sq === bestMove.to)) div.classList.add('best-move');

            const piece = chess.get(sq);
            if(piece) {
                const p = document.createElement('div');
                p.className = `piece ${piece.color}`;
                p.textContent = PIECE_SYMBOLS[piece.color][piece.type];
                p.draggable = true;
                p.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('json', JSON.stringify({source:'board', from:sq}));
                    showHints(sq);
                });
                attachTouch(p, {source:'board', from:sq, type:piece.type, color:piece.color});
                div.appendChild(p);
                
                if(piece.type === 'k' && piece.color === chess.turn() && chess.in_check()) {
                    div.classList.add('check');
                }
            }

            if(possibleMoves.includes(sq)) {
                const h = document.createElement('div');
                h.className = piece ? 'capture-ring' : 'hint-dot';
                div.appendChild(h);
            }
        });
    }

    function renderSpares() {
        sparesEl.innerHTML = '';
        ['w', 'b'].forEach(c => {
            const row = document.createElement('div');
            row.className = 'spare-row';
            ['p','n','b','r','q','k'].forEach(t => {
                const p = document.createElement('div');
                p.className = `piece ${c} spare-piece`;
                p.textContent = PIECE_SYMBOLS[c][t];
                p.draggable = true;
                p.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('json', JSON.stringify({source:'spare', type:t, color:c}));
                });
                attachTouch(p, {source:'spare', type:t, color:c});
                row.appendChild(p);
            });
            sparesEl.appendChild(row);
        });
    }

    function attachTouch(el, data) {
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            activeDragData = data;
            dragGhost = document.createElement('div');
            dragGhost.className = `piece ${data.color} dragging-ghost`;
            dragGhost.textContent = PIECE_SYMBOLS[data.color][data.type];
            dragGhost.style.left = t.clientX + 'px'; dragGhost.style.top = t.clientY + 'px';
            document.body.appendChild(dragGhost);
            if(data.source === 'board') showHints(data.from);
        }, {passive: false});

        el.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if(dragGhost) {
                const t = e.touches[0];
                dragGhost.style.left = t.clientX + 'px'; dragGhost.style.top = t.clientY + 'px';
            }
        }, {passive: false});

        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            if(dragGhost) {
                const t = e.changedTouches[0];
                dragGhost.style.display = 'none';
                const target = document.elementFromPoint(t.clientX, t.clientY);
                dragGhost.remove(); dragGhost = null;
                const sqDiv = target ? target.closest('.square') : null;
                if(sqDiv && activeDragData) handleMove(activeDragData, sqDiv.dataset.square, true);
                clearHints();
                activeDragData = null;
            }
        });
    }

    function handleMove(data, to) {
        if (data.source === 'spare') {
            const targetPiece = chess.get(to);
            if (targetPiece && !confirm("Replace piece?")) return;
            chess.put({ type: data.type, color: data.color }, to);
            afterAction();
        } 
        else if (data.source === 'board') {
            const piece = chess.get(data.from);
            if (piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1')) {
                const tempMove = chess.move({ from: data.from, to: to, promotion: 'q' });
                if (tempMove) {
                    chess.undo();
                    pendingMove = { from: data.from, to: to, color: piece.color };
                    showPromotionModal(piece.color);
                    return;
                }
            }

            const move = chess.move({ from: data.from, to: to, promotion: 'q' });
            if (move) afterAction();
            else renderPieces(); 
        }
    }

    function showPromotionModal(color) {
        promoOptions.innerHTML = '';
        ['q', 'r', 'b', 'n'].forEach(type => {
            const btn = document.createElement('div');
            btn.className = `promo-btn piece ${color}`;
            btn.style.position = 'static';
            btn.textContent = PIECE_SYMBOLS[color][type];
            btn.onclick = () => confirmPromotion(type);
            promoOptions.appendChild(btn);
        });
        promoModal.style.display = 'flex';
    }

    function confirmPromotion(type) {
        if (pendingMove) {
            chess.move({ from: pendingMove.from, to: pendingMove.to, promotion: type });
            afterAction();
        }
        promoModal.style.display = 'none';
        pendingMove = null;
    }

    function onSquareClick(e) {
        const sq = e.currentTarget.dataset.square;
        const piece = chess.get(sq);
        const isTurn = piece && piece.color === chess.turn();

        if (selectedSquare === sq) { clearHints(); return; }

        if (selectedSquare) {
            const sourcePiece = chess.get(selectedSquare);
            if (sourcePiece && sourcePiece.type === 'p' && (sq[1] === '8' || sq[1] === '1')) {
                const tempMove = chess.move({ from: selectedSquare, to: sq, promotion: 'q' });
                if(tempMove) {
                    chess.undo();
                    pendingMove = { from: selectedSquare, to: sq, color: sourcePiece.color };
                    showPromotionModal(sourcePiece.color);
                    clearHints();
                    return;
                }
            }

            const move = chess.move({ from: selectedSquare, to: sq, promotion: 'q' });
            if (move) { afterAction(); clearHints(); return; }
            if (isTurn) { showHints(sq); return; }
            clearHints();
        } else if (isTurn) {
            showHints(sq);
        }
    }

    function onDrop(e) {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('json'));
        const sq = e.currentTarget.dataset.square;
        handleMove(data, sq);
    }

    function afterAction() {
        renderPieces();
        askAI();
        const rid = document.getElementById('room-id').textContent;
        if(rid !== '—') db.ref(`rooms/${rid}`).update({fen: chess.fen()});
    }

    function showHints(sq) {
        possibleMoves = chess.moves({square:sq, verbose:true}).map(m=>m.to);
        selectedSquare = sq;
        renderPieces();
    }
    function clearHints() { selectedSquare=null; possibleMoves=[]; renderPieces(); }

    function updateStatus() {
        const boardArr = chess.board();
        let wK = false, bK = false;
        boardArr.forEach(row => row.forEach(p => {
            if(p && p.type === 'k') {
                if(p.color === 'w') wK = true;
                if(p.color === 'b') bK = true;
            }
        }));

        if (!wK || !bK) {
            statusEl.textContent = "Setup Mode (Place Kings)";
            statusEl.classList.remove('alert');
            return;
        }

        let t = chess.turn()==='w' ? "White" : "Black";
        let status = `${t}'s Turn`;
        statusEl.className = "status-text"; 

        if (chess.in_checkmate()) {
            status = `CHECKMATE! ${t === "White" ? "Black" : "White"} Wins!`;
            showGameOver(status);
            statusEl.classList.add('alert');
        } 
        else if (chess.in_stalemate()) {
            status = "Stalemate (Draw)!";
            showGameOver(status);
        }
        else if (chess.in_draw()) {
            status = "Draw / Insufficient Material";
        } 
        else if (chess.in_check()) {
            status = `${t} is in CHECK!`;
            statusEl.classList.add('alert');
        }

        statusEl.textContent = status;
    }

    function showGameOver(msg) {
        modalTitle.textContent = "GAME OVER";
        modalMsg.textContent = msg;
        gameOverModal.style.display = 'flex';
    }

    // Buttons
    document.getElementById('btn-flip').onclick = () => { isFlipped=!isFlipped; boardEl.className=isFlipped?'board flipped':'board'; };
    document.getElementById('btn-undo').onclick = () => { chess.undo(); afterAction(); gameOverModal.style.display='none'; };
    document.getElementById('btn-reset').onclick = () => { chess.reset(); afterAction(); gameOverModal.style.display='none'; };
    document.getElementById('btn-clear').onclick = () => { chess.clear(); afterAction(); gameOverModal.style.display='none'; };
    
    // BLIND BUTTON LOGIC
    const blindBtn = document.getElementById('btn-blind');
    blindBtn.onclick = () => {
        isBlind = !isBlind;
        if(isBlind) {
            boardEl.classList.add('blindfold');
            blindBtn.textContent = '👁️ Show';
            blindBtn.style.background = '#444';
        } else {
            boardEl.classList.remove('blindfold');
            blindBtn.textContent = '🙈 Blind';
            blindBtn.style.background = '#6c5ce7';
        }
    };

    document.getElementById('btn-create').onclick = async () => {
        const ref = db.ref('rooms').push();
        chess.reset(); await ref.set({fen:chess.fen()});
        document.getElementById('input-room').value = ref.key;
        joinRoom(ref.key);
    };
    document.getElementById('btn-join').onclick = () => joinRoom(document.getElementById('input-room').value);

    function joinRoom(id) {
        if(!id) return;
        document.getElementById('room-id').textContent = id;
        db.ref(`rooms/${id}`).on('value', s => {
            if(s.val() && s.val().fen !== chess.fen()) {
                chess.load(s.val().fen); renderPieces(); askAI();
            }
        });
    }

    makeBoard(); renderSpares(); renderPieces(); initStockfish();
}