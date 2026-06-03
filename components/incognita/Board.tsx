"use client";
import { evaluate } from "@/lib/incognita/evaluate";
import { Tile, type TileVisual } from "./Tile";

export const MAX_ATTEMPTS = 6;

export function Board({
  answer,
  guesses,
  current,
}: {
  answer: string;
  guesses: string[];
  current: string;
}) {
  const length = answer.length;
  const currentRow = guesses.length; // fila donde se escribe ahora

  return (
    <div
      className="mx-auto grid w-full max-w-[22rem] gap-1.5"
      style={{ gridTemplateRows: `repeat(${MAX_ATTEMPTS}, 1fr)` }}
    >
      {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
        const guess = guesses[row];
        const states = guess ? evaluate(guess, answer) : null;
        const isCurrent = row === currentRow;

        return (
          <div
            key={row}
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }}
          >
            {Array.from({ length }).map((_, col) => {
              let letter = "";
              let state: TileVisual = "empty";
              if (guess) {
                letter = guess[col] ?? "";
                state = (states![col] ?? "absent") as TileVisual;
              } else if (isCurrent) {
                letter = current[col] ?? "";
                state = letter ? "filled" : "empty";
              }
              return (
                // Keyear por (col, revelada, letra) hace que cada animación corra
                // una sola vez al cambiar el contenido y nunca quede un flip a medias.
                <Tile
                  key={`${col}-${guess ? "r" : "e"}-${letter || "_"}`}
                  letter={letter}
                  state={state}
                  revealed={Boolean(guess)}
                  index={col}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
