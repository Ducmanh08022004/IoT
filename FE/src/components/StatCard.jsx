export function StatCard({ title, value, accent, icon: Icon, isLive, iconColor }) {
  return (
    <article className={`stat-card stat-card--${accent} ${isLive ? 'stat-card--live' : ''}`}>
      <div>
        <p className="stat-card__title">{title}</p>
        <strong className="stat-card__value">{value}</strong>
      </div>
      <div className={`stat-card__icon ${isLive ? 'stat-card__icon--live' : ''}`} style={{ color: iconColor }}>
        <Icon size={70} strokeWidth={2.1} />
      </div>
    </article>
  );
}