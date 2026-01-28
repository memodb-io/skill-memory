/**
 * Shared types for skill-memory
 */

export interface RepoReference {
  host: "github.com";
  owner: string;
  repo: string;
}

export interface SkillReference extends RepoReference {
  skillName: string;
}

export interface SkillInfo {
  name: string;
  description: string;
  path: string; // relative path in repo
  fullRef: string; // github.com@owner/repo@skill_name
}
