import { LucideIcon } from 'lucide-react';
import { DeviceKey } from '../types/iot';

type DeviceControlCardProps = {
  deviceKey: DeviceKey;
  name: string;
  icon: LucideIcon;
  active: boolean;
  accent: string;
  disabled?: boolean;
  pending?: boolean;
  onToggle?: () => void;
};

export function DeviceControlCard({
  deviceKey,
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
  const iconClassName = pending
    ? `device-card__icon device-card__icon--${deviceKey} device-card__icon--pending`
    : active
      ? `device-card__icon device-card__icon--${deviceKey} device-card__icon--on`
      : `device-card__icon device-card__icon--${deviceKey} device-card__icon--off`;
  const cardClassName = active
    ? `device-card device-card--active device-card--${deviceKey}`
    : `device-card device-card--${deviceKey}`;

  return (
    <article className={cardClassName} style={{ borderColor: accent }}>
      <div className="device-card__media">
        <span className={iconClassName} style={{ color: accent }} aria-hidden="true">
          <Icon size={60} strokeWidth={1.8} />
        </span>
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