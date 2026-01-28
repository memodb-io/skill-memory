/**
 * Local skill reference parsing and validation
 */

/**
 * Parse a local skill name from @name or name format
 * @param input - The skill name with optional @ prefix
 * @returns The parsed skill name without @
 * @throws Error if the name is invalid
 */
export function parseLocalSkillName(input: string): string {
  // Trim whitespace first
  let name = input.trim();

  // Remove @ prefix if present
  name = name.startsWith("@") ? name.slice(1) : name;

  // Trim again in case there was space after @
  name = name.trim();

  // Check for empty name
  if (!name) {
    throw new Error("Invalid skill name: name cannot be empty");
  }

  // Validate the name
  validateSkillName(name);

  return name;
}

/**
 * Validate a skill name
 * @param name - The skill name to validate (without @)
 * @throws Error if the name is invalid
 */
export function validateSkillName(name: string): void {
  // Check for empty name
  if (!name || name.trim() === "") {
    throw new Error("Invalid skill name: name cannot be empty");
  }

  // Check for reserved names
  if (name === "." || name === "..") {
    throw new Error("Invalid skill name: reserved name");
  }

  // Check for path traversal attempts
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error("Invalid skill name: path traversal not allowed");
  }

  // Check for null bytes
  if (name.includes("\0")) {
    throw new Error("Invalid skill name: null bytes not allowed");
  }

  // Only allow alphanumeric, dashes, and underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(name)) {
    throw new Error(
      "Invalid skill name: only alphanumeric characters, dashes, and underscores are allowed"
    );
  }
}
