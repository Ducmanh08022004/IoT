import { LucideIcon } from 'lucide-react';

type DeviceControlCardProps = {
  name: string;
  icon: LucideIcon;
  active: boolean;
  accent: string;
  disabled?: boolean;
  pending?: boolean;
  onToggle?: () => void;
};

export function DeviceControlCard({
  name,
  icon: Icon,
  active,
  accent,
  disabled = false,
  pending = false,
  onToggle,
}: DeviceControlCardProps) {
  const statusLabel = pending ? 'Pending...' : active ? 'Online' : 'Offline';
  const statusClassName = pending
    ? 'device-card__status device-card__status--pending'
    : active
      ? 'device-card__status device-card__status--online'
      : 'device-card__status device-card__status--offline';

  return (
    <article className={active ? 'device-card device-card--active' : 'device-card'} style={{ borderColor: accent }}>
      <div className="device-card__media">
        <Icon size={60} strokeWidth={1.8} />
        <div>
          <p>{name}</p>
          <span className={statusClassName}>{statusLabel}</span>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={onToggle}
        className={active ? 'toggle toggle--on' : 'toggle'}
        aria-label={`Toggle ${name}`}
      >
        <span />
      </button>
    </article>
  );
}