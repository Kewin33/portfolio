export type ProjectSection = "main" | "other";

export type Project = {
  id: string;
  title: string;
  description?: string;
  image?: string;
  github?: string;
  demo?: string;
  skills?: string[];
  index?: number;
  section?: ProjectSection;
  [key: string]: any;
};