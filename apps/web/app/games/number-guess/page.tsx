"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────

type GameState = "setup" | "slot" | "playing" | "won" | "gave_up";

interface Player {
  name: string;
  attempts: number;
}

interface GuessEntry {
  playerName: string;
  guess: number;
  roast: string;
  direction: "high" | "low" | "correct" | "out_of_bounds";
  proximity: string;
}

// ── Helpers ────────────────────────────────────────────

function generateSecretNumber(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % max) + 1;
}

function computeDirection(
  guess: number,
  secret: number,
  max: number
): "high" | "low" | "correct" | "out_of_bounds" {
  if (guess < 1 || guess > max) return "out_of_bounds";
  if (guess === secret) return "correct";
  return guess > secret ? "high" : "low";
}

function computeProximity(
  guess: number,
  secret: number,
  max: number
): "freezing" | "cold" | "warm" | "hot" | "correct" | "out_of_bounds" {
  if (guess < 1 || guess > max) return "out_of_bounds";
  if (guess === secret) return "correct";
  const pct = (Math.abs(guess - secret) / max) * 100;
  if (pct > 50) return "freezing";
  if (pct > 25) return "cold";
  if (pct > 10) return "warm";
  return "hot";
}

async function fetchRoast(body: Record<string, unknown>): Promise<string> {
  try {
    const res = await fetch("/api/games/roast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return data.roast || "...";
  } catch {
    return "Even my roast generator gave up on you. That's how bad that guess was.";
  }
}

// ── Slot Machine ───────────────────────────────────────

function SlotMachine({ onComplete }: { onComplete: () => void }) {
  const [reelStates, setReelStates] = useState([false, false, false]);
  const [done, setDone] = useState(false);
  const [digits, setDigits] = useState([0, 0, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDigits([
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
      ]);
    }, 80);
    const t1 = setTimeout(
      () => setReelStates((p) => [true, p[1], p[2]]),
      1000
    );
    const t2 = setTimeout(
      () => setReelStates((p) => [p[0], true, p[2]]),
      1800
    );
    const t3 = setTimeout(() => {
      setReelStates([true, true, true]);
      setDone(true);
      clearInterval(interval);
    }, 2600);
    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (done) {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
  }, [done, onComplete]);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
        Generating your number...
      </p>
      <div className="flex items-center gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-20 h-24 bg-gray-900 dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden border-2 border-yellow-500"
          >
            <span className="text-3xl font-bold text-yellow-400">
              {reelStates[i] ? "?" : digits[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Draggable Lever ────────────────────────────────────

function DraggableLever({ onPull }: { onPull: () => void }) {
  const TRACK_H = 80;
  const HANDLE_H = 40;
  const MAX_DRAG = TRACK_H - HANDLE_H;
  const THRESHOLD = MAX_DRAG * 0.7;

  const [offsetY, setOffsetY] = useState(0);
  const [fired, setFired] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);

  const onStart = (clientY: number) => {
    if (fired) return;
    dragging.current = true;
    startY.current = clientY;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const y = "touches" in e ? e.touches[0].clientY : e.clientY;
      const delta = y - startY.current;
      setOffsetY(Math.max(0, Math.min(MAX_DRAG, delta)));
      if ("touches" in e) e.preventDefault();
    };

    const onEnd = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setOffsetY((cur) => {
        if (cur >= THRESHOLD) {
          setFired(true);
          onPull();
          return MAX_DRAG;
        }
        return 0;
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [MAX_DRAG, THRESHOLD, onPull]);

  return (
    <div className="flex items-center gap-4 select-none">
      {/* Machine body */}
      <div className="bg-gray-900 dark:bg-gray-700 rounded-xl px-5 py-4 flex items-center gap-2 border-2 border-yellow-500 shadow-lg">
        <div className="w-10 h-12 bg-black rounded-lg flex items-center justify-center">
          <span className="text-yellow-400 text-xl">🎰</span>
        </div>
        <div className="w-10 h-12 bg-black rounded-lg flex items-center justify-center">
          <span className="text-yellow-400 text-xl font-bold">?</span>
        </div>
        <div className="w-10 h-12 bg-black rounded-lg flex items-center justify-center">
          <span className="text-yellow-400 text-xl">🎰</span>
        </div>
      </div>

      {/* Lever */}
      <div className="relative" style={{ width: 32, height: TRACK_H }}>
        <div
          className="absolute bg-gray-400 dark:bg-gray-600 rounded-full"
          style={{ left: 13, width: 6, top: 0, bottom: 0 }}
        />
        <div
          className="absolute bg-red-500 rounded-full border-4 border-red-700 shadow-lg flex items-center justify-center"
          style={{
            width: HANDLE_H,
            height: HANDLE_H,
            left: (32 - HANDLE_H) / 2,
            top: fired ? MAX_DRAG : offsetY,
            cursor: fired ? "default" : "grab",
            transition:
              !dragging.current && !fired ? "top 0.3s ease-out" : "none",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onStart(e.clientY);
          }}
          onTouchStart={(e) => onStart(e.touches[0].clientY)}
        >
          {!fired && (
            <span className="text-white font-extrabold text-[10px] pointer-events-none select-none">
              PULL
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────

export default function NumberGuessPage() {
  const [names, setNames] = useState(["", ""]);
  const [maxNumber, setMaxNumber] = useState(100);
  const [gameState, setGameState] = useState<GameState>("setup");
  const [secretNumber, setSecretNumber] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [guessHistory, setGuessHistory] = useState<GuessEntry[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [loading, setLoading] = useState(false);
  const [latestRoast, setLatestRoast] = useState<GuessEntry | null>(null);
  const [giveUpRoast, setGiveUpRoast] = useState("");
  const [winnerName, setWinnerName] = useState("");
  const [winRoast, setWinRoast] = useState("");
  const [totalRounds, setTotalRounds] = useState(0);

  const roastRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (latestRoast && roastRef.current) {
      roastRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [latestRoast]);

  useEffect(() => {
    if (!loading && gameState === "playing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, currentPlayerIndex, gameState]);

  const validNames = names.filter((n) => n.trim().length > 0);
  const canStart = validNames.length >= 2 && maxNumber >= 2;

  const startGame = useCallback(() => {
    const filtered = names.filter((n) => n.trim().length > 0);
    if (filtered.length < 2) return;
    const secret = generateSecretNumber(maxNumber);
    setSecretNumber(secret);
    setPlayers(filtered.map((n) => ({ name: n.trim(), attempts: 0 })));
    setGameState("slot");
  }, [names, maxNumber]);

  const onSlotComplete = useCallback(() => {
    setGameState("playing");
  }, []);

  const submitGuess = async () => {
    const guess = parseInt(currentGuess, 10);
    if (isNaN(guess) || loading) return;

    setLoading(true);
    setCurrentGuess("");

    const direction = computeDirection(guess, secretNumber, maxNumber);
    const proximity = computeProximity(guess, secretNumber, maxNumber);
    const player = players[currentPlayerIndex];

    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = {
      ...player,
      attempts: player.attempts + 1,
    };
    setPlayers(updatedPlayers);
    setTotalRounds((r) => r + 1);

    const roast = await fetchRoast({
      playerName: player.name,
      guess,
      direction,
      proximity,
      attempts: player.attempts + 1,
      maxNumber,
      mode: "guess",
    });

    const entry: GuessEntry = {
      playerName: player.name,
      guess,
      roast,
      direction,
      proximity,
    };

    setGuessHistory((prev) => [...prev, entry]);
    setLatestRoast(entry);
    setLoading(false);

    if (direction === "correct") {
      setWinnerName(player.name);
      setWinRoast(roast);
      setGameState("won");
      return;
    }

    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  };

  const handleGiveUp = async () => {
    setLoading(true);
    const roast = await fetchRoast({
      playerName: "",
      guess: 0,
      direction: "low",
      proximity: "freezing",
      attempts: 0,
      maxNumber,
      mode: "give_up",
      secretNumber,
      totalRounds,
      playerNames: players.map((p) => p.name),
    });
    setGiveUpRoast(roast);
    setLoading(false);
    setGameState("gave_up");
  };

  const resetGame = () => {
    setGameState("setup");
    setSecretNumber(0);
    setPlayers([]);
    setCurrentPlayerIndex(0);
    setGuessHistory([]);
    setCurrentGuess("");
    setLatestRoast(null);
    setGiveUpRoast("");
    setWinnerName("");
    setWinRoast("");
    setTotalRounds(0);
    setNames(["", ""]);
  };

  // ── SETUP ────────────────────────────────────────────

  if (gameState === "setup") {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link
          href="/games"
          className="text-sm text-gray-500 hover:text-primary-600 mb-6 inline-block"
        >
          &larr; Back to Games
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Guess the Number
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          The app picks a secret number. Take turns guessing while Roman Roy
          roasts you.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max number
            </label>
            <input
              type="number"
              min={2}
              max={10000}
              value={maxNumber}
              onChange={(e) =>
                setMaxNumber(Math.max(2, parseInt(e.target.value) || 100))
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Secret number will be between 1 and {maxNumber}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Players
            </label>
            <div className="space-y-3">
              {names.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const next = [...names];
                      next[i] = e.target.value;
                      setNames(next);
                    }}
                    placeholder={`Player ${i + 1}`}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {names.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setNames(names.filter((_, j) => j !== i))}
                      className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setNames([...names, ""])}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add player
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {canStart
                  ? "Drag the lever down to start!"
                  : `Enter at least 2 player names (${validNames.length}/2)`}
              </p>
              <div
                className={
                  canStart ? "" : "opacity-30 pointer-events-none"
                }
              >
                <DraggableLever onPull={startGame} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SLOT ─────────────────────────────────────────────

  if (gameState === "slot") {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <SlotMachine onComplete={onSlotComplete} />
        </div>
      </div>
    );
  }

  // ── WON ──────────────────────────────────────────────

  if (gameState === "won") {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {winnerName} got it!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            The number was{" "}
            <span className="font-bold text-primary-600">{secretNumber}</span>
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 text-left">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Roman says:
            </p>
            <p className="text-gray-800 dark:text-gray-200 italic">
              &ldquo;{winRoast}&rdquo;
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Scoreboard
            </h3>
            <div className="space-y-2">
              {players
                .slice()
                .sort((a, b) => a.attempts - b.attempts)
                .map((p, i) => (
                  <div
                    key={i}
                    className={`flex justify-between px-4 py-2 rounded-lg ${
                      p.name === winnerName
                        ? "bg-primary-50 dark:bg-primary-900/20"
                        : "bg-gray-50 dark:bg-gray-700/50"
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {p.name === winnerName ? "👑 " : ""}
                      {p.name}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {p.attempts} guess{p.attempts !== 1 ? "es" : ""}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <button
            type="button"
            onClick={resetGame}
            className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // ── GAVE UP ──────────────────────────────────────────

  if (gameState === "gave_up") {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center space-y-6">
          <div className="text-6xl">💀</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quitters.
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            The number was{" "}
            <span className="font-bold text-primary-600">{secretNumber}</span>
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 text-left">
            <p className="text-sm font-medium text-red-500 dark:text-red-400 mb-2">
              Roman says:
            </p>
            <p className="text-gray-800 dark:text-gray-200 italic">
              &ldquo;{giveUpRoast}&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={resetGame}
            className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all"
          >
            Try Again (If You Dare)
          </button>
        </div>
      </div>
    );
  }

  // ── PLAYING ──────────────────────────────────────────

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/games"
          className="text-sm text-gray-500 hover:text-primary-600"
        >
          &larr; Games
        </Link>
        <button
          type="button"
          onClick={handleGiveUp}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          We Give Up
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Guess a number between 1 and {maxNumber}
        </p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {currentPlayer.name}&apos;s Turn
        </h2>
        <p className="text-xs text-gray-400">
          Round {totalRounds + 1} &middot; Attempt #
          {currentPlayer.attempts + 1}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {players.map((p, i) => (
          <div
            key={i}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              i === currentPlayerIndex
                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}
          >
            {p.name}
            <span className="ml-1 text-xs opacity-60">({p.attempts})</span>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={currentGuess}
            onChange={(e) => setCurrentGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitGuess();
            }}
            placeholder="Your guess"
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-xl font-bold focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={submitGuess}
            disabled={loading || !currentGuess}
            className={`px-6 py-3 rounded-xl font-semibold text-white transition-all ${
              loading || !currentGuess
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-primary-600 hover:bg-primary-700 active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Guess"
            )}
          </button>
        </div>
      </div>

      {latestRoast && (
        <div
          ref={roastRef}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">
              {latestRoast.direction === "out_of_bounds" ? "😤" : "😏"}
            </span>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {latestRoast.direction === "out_of_bounds"
                  ? "Logan Roy says:"
                  : "Roman Roy says:"}
              </p>
              <p className="text-gray-800 dark:text-gray-200 italic">
                &ldquo;{latestRoast.roast}&rdquo;
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {latestRoast.playerName} guessed {latestRoast.guess}
                {latestRoast.direction === "out_of_bounds"
                  ? " (out of bounds! Turn lost.)"
                  : latestRoast.direction === "high"
                  ? " — too high"
                  : " — too low"}
              </p>
            </div>
          </div>
        </div>
      )}

      {guessHistory.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            Previous guesses
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {guessHistory
              .slice(0, -1)
              .reverse()
              .map((entry, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    {entry.playerName}
                  </span>
                  <span
                    className={`font-mono font-medium ${
                      entry.direction === "high"
                        ? "text-red-500"
                        : entry.direction === "low"
                        ? "text-blue-500"
                        : "text-gray-400"
                    }`}
                  >
                    {entry.guess}{" "}
                    {entry.direction === "high"
                      ? "↑"
                      : entry.direction === "low"
                      ? "↓"
                      : entry.direction === "out_of_bounds"
                      ? "✗"
                      : ""}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
