/**
 * Tests for templates.ts
 */

import { describe, it, expect } from "vitest";
import { generateSkillTemplate } from "../templates.js";

describe("generateSkillTemplate", () => {
  it("should generate valid SKILL.md template", () => {
    const template = generateSkillTemplate("my-skill");

    expect(template).toContain("---");
    expect(template).toContain("name: my-skill");
    expect(template).toContain("description:");
    expect(template).toContain("# My Skill");
  });

  it("should convert kebab-case to Title Case", () => {
    const template = generateSkillTemplate("my-cool-skill");

    expect(template).toContain("# My Cool Skill");
  });

  it("should handle single word names", () => {
    const template = generateSkillTemplate("xlsx");

    expect(template).toContain("name: xlsx");
    expect(template).toContain("# Xlsx");
  });

  it("should include all expected sections", () => {
    const template = generateSkillTemplate("test-skill");

    expect(template).toContain("## When to Use");
    expect(template).toContain("## How to Use");
    expect(template).toContain("Instructions for the AI assistant");
  });
});
