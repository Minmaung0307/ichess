# iChess Studio — Play & Learn

## Features
- Responsive board, fullscreen button, mobile tap-to-move, desktop drag-and-drop, image chess pieces with Unicode fallback.
- Computer opponent: Easy (random), Medium (1-ply), Difficult (2-ply), Advanced (3-ply). These are a lightweight built-in minimax engine, NOT Stockfish or a rated professional engine.
- Two people on one device, online Firebase Realtime Database rooms, turn-based online updates, promotion, undo in local/AI games, 14 written lessons.

## Deploy
1. Open `ichess` folder in terminal.
2. Check Firebase project in `.firebaserc`; use `firebase use chess-mm` if needed.
3. In Firebase Console enable **Authentication > Sign-in method > Anonymous**.
4. Create **Realtime Database** in Firebase Console (same project) and copy its actual URL to `databaseURL` in `public/app.js`. The supplied URL is a common default and may differ from your database location.
5. Deploy Realtime Database rules: `firebase deploy --only database` (review `database.rules.json` before deploying; these rules REPLACE the existing rules for the selected database).
6. Deploy Hosting: `firebase deploy --only hosting`.
7. Test two different browsers with separate anonymous accounts. A room creator plays White; second participant plays Black; later participants spectate. Share the copied invite URL.

## Important limitations
- Firebase rules restrict authenticated writes and some turn/version conditions but **cannot validate legal chess moves**. A malicious modified client can send an illegal FEN. Production competitive multiplayer requires a trusted backend (Cloud Functions or server) validating moves and implementing clocks, disconnect recovery and matchmaking.
- Computer AI is a lightweight browser search, not Stockfish; Advanced may be slow on low-end devices.
- Piece images and chess.js/Firebase scripts load from external CDNs; an offline build requires vendoring these assets locally.
- Online rooms do not yet implement time controls, ratings, matchmaking, reconnection identity beyond browser auth, anti-cheat, or server-side result adjudication.
- Lessons are explanatory text, not interactive exercises with grading.
