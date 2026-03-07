export interface HomeProject {
  id: string;
  title?: string;
  titleKey?: string;
  description?: string;
  descriptionKey?: string;
  image?: string;
  github?: string;
  demo?: string;
  skills?: string[];
  index?: number;
  section?: "main" | "other";
}
