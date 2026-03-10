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
  return (
    <article className="device-card" style={{ borderColor: accent }}>
      <div className="device-card__media">
        <Icon size={60} strokeWidth={1.8} />
        <div>
          <p>{name}</p>
          <span>{pending ? 'Pending...' : active ? 'Online' : 'Offline'}</span>
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