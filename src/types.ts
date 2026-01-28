/**
 * Shared types for skill-memory
 */

/**
 * GitHub repository reference
 */
export interface GithubRepoReference {
  host: "github.com";
  owner: string;
  repo: string;
}

/**
 * Local filesystem repository reference
 */
export interface LocalRepoReference {
  host: "localhost";
  path: string; // resolved absolute path to local directory
}

/**
 * Discriminated union for repository references
 */
export type RepoReference = GithubRepoReference | LocalRepoReference;

/**
 * GitHub skill reference
 */
export interface GithubSkillReference extends GithubRepoReference {
  skillName: string;
}

/**
 * Local filesystem skill reference
 */
export interface LocalSkillReference extends LocalRepoReference {
  skillName: string;
}

/**
 * Discriminated union for skill references
 */
export type SkillReference = GithubSkillReference | LocalSkillReference;

export interface SkillInfo {
  name: string;
  description: string;
  path: string; // relative path in repo
  fullRef: string; // github.com@owner/repo@skill_name or localhost@/path@skill_name
}
