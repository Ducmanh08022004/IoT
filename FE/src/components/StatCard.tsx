import { LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string;
  accent: 'temperature' | 'humidity' | 'light';
  icon: LucideIcon;
};

export function StatCard({ title, value, accent, icon: Icon }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${accent}`}>
      <div>
        <p className="stat-card__title">{title}</p>
        <strong className="stat-card__value">{value}</strong>
      </div>
      <div className="stat-card__icon">
        <Icon size={70} strokeWidth={2.1} />
      </div>
    </article>
  );
}