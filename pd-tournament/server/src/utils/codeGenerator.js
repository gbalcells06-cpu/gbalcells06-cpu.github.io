import { customAlphabet } from "nanoid";

// Sin caracteres ambiguos (0/O, 1/I/L) para que el código sea fácil de leer y compartir por WhatsApp.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(ALPHABET, 5);

export function generateRoomCode() {
  return generate();
}

export function generateId(prefix = "") {
  const raw = customAlphabet(ALPHABET + "abcdefghjkmnpqrstuvwxyz", 12)();
  return prefix ? `${prefix}_${raw}` : raw;
}
