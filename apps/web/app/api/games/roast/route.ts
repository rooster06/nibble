import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type Direction = "high" | "low" | "correct" | "out_of_bounds";
type Proximity = "freezing" | "cold" | "warm" | "hot" | "correct" | "out_of_bounds";

interface RoastRequest {
  playerName: string;
  guess: number;
  direction: Direction;
  proximity: Proximity;
  attempts: number;
  maxNumber: number;
  mode: "guess" | "give_up";
  // give_up mode fields
  secretNumber?: number;
  totalRounds?: number;
  playerNames?: string[];
}

function buildSystemPrompt(req: RoastRequest): string {
  if (req.mode === "give_up") {
    return `You are Roman Roy from the TV show Succession at your absolute most savage. An entire group of people just gave up trying to guess a number between 1 and ${req.maxNumber}. The answer was ${req.secretNumber} and they failed after ${req.totalRounds} rounds. The quitters are: ${req.playerNames?.join(", ")}. Roast the entire group in 2-3 sentences. Maximum snark. Scorched earth. Do not hold back.`;
  }

  if (req.direction === "out_of_bounds") {
    return `You are Logan Roy from the TV show Succession. You are cold, disappointed, and brutally direct. Someone named ${req.playerName} just guessed ${req.guess} in a game where the range is 1 to ${req.maxNumber}. They couldn't even stay within the bounds of the game. This was their attempt #${req.attempts}. Give a short (1-2 sentence) devastatingly disappointed response. They just lost their turn for this stupidity. Channel Logan's "you're not serious people" energy.`;
  }

  if (req.direction === "correct") {
    return `You are Roman Roy from the TV show Succession. Someone named ${req.playerName} just correctly guessed the number on attempt #${req.attempts}. Give a short (1-2 sentence) backhanded compliment. Acknowledge they got it right but make it clear you're not impressed. Classic Roman - witty and a little cruel.`;
  }

  const directionHint = req.direction === "high" ? "too high" : "too low";
  const proximityDesc: Record<string, string> = {
    freezing: "extremely far from the answer",
    cold: "pretty far from the answer",
    warm: "getting closer but still off",
    hot: "very close to the answer",
  };

  return `You are Roman Roy from the TV show Succession. You're watching a guessing game and finding it painfully amusing. Someone named ${req.playerName} just guessed ${req.guess} (range is 1 to ${req.maxNumber}), which is ${directionHint} and ${proximityDesc[req.proximity] || "off"}. This was their attempt #${req.attempts}. Give a short (1-2 sentence) witty, sarcastic roast that clearly hints they need to go ${req.direction === "high" ? "lower" : "higher"} and reflects how close or far they are. Be cutting but funny. Keep it PG-13.`;
}

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body: RoastRequest = await request.json();

    const systemPrompt = buildSystemPrompt(body);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Roast them." },
        ],
        max_tokens: 150,
        temperature: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      return NextResponse.json(
        { error: "Failed to generate roast" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const roast = data.choices?.[0]?.message?.content?.trim() || "...";

    return NextResponse.json({ roast });
  } catch (err) {
    console.error("Roast API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
