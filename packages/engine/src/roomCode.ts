// Excludes O/0 and I/1 so a spoken or handwritten code isn't ambiguous.
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 4;

export interface GenerateRoomCodeOptions {
  maxAttempts?: number;
}

export function generateRoomCode(
  existingCodes: ReadonlySet<string>,
  options: GenerateRoomCodeOptions = {},
): string {
  const maxAttempts = options.maxAttempts ?? 10_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      const index = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
      code += ROOM_CODE_ALPHABET[index];
    }
    if (!existingCodes.has(code)) {
      return code;
    }
  }

  throw new Error("Could not generate a unique Room Code");
}
