"use client";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  compact?: boolean;
};

export default function SectionHeader({
  title,
  subtitle,
  align = 'center',
  compact = false,
}: SectionHeaderProps) {
  const alignClass = align === 'left' ? 'text-left mx-0' : 'text-center mx-auto';
  const marginClass = compact ? 'mb-6' : 'mb-10';

  return (
    <header className={`page-section-head ${alignClass} ${marginClass}`}>
      <h1 className="page-section-title">{title}</h1>
      {subtitle ? <p className="page-section-subtitle">{subtitle}</p> : null}
    </header>
  );
}
