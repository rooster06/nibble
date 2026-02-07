"use client";

import Link from "next/link";

const games = [
  {
    name: "Guess the Number",
    description:
      "The app picks a secret number. Take turns guessing while Roman Roy roasts you.",
    href: "/games/number-guess",
    emoji: "🎰",
    available: true,
  },
  {
    name: "Bad Choices",
    description:
      "Ask yes/no questions to discard your cards. First to empty their hand wins.",
    href: "/games/bad-choices",
    emoji: "🃏",
    available: false,
  },
  {
    name: "Stir The Pot",
    description:
      '"Who is most likely to..." — point at someone and flip the token. TELL or DON\'T TELL?',
    href: "/games/stir-the-pot",
    emoji: "🍲",
    available: false,
  },
];

export default function GamesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Games
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Kill time while waiting for your food
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => (
          <div key={game.name} className="relative">
            {game.available ? (
              <Link
                href={game.href}
                className="block bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="block text-4xl mb-4">{game.emoji}</span>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {game.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {game.description}
                </p>
              </Link>
            ) : (
              <div className="block bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm opacity-50">
                <span className="block text-4xl mb-4">{game.emoji}</span>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {game.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {game.description}
                </p>
                <span className="absolute top-3 right-3 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full">
                  Coming Soon
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
