import { Download, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { profileData } from '../data/mockData';

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LinkField({ label, value }: { label: string; value: string }) {
  return (
    <div className="link-field">
      <span>{label}</span>
      <a href={value} target="_blank" rel="noreferrer">
        {value}
        <ExternalLink size={15} />
      </a>
    </div>
  );
}

export function ProfilePage() {
  return (
    <section className="page">
      <PageHeader title="Profile" subtitle="Thông tin cá nhân và các đường dẫn tài liệu." />

      <section className="profile-hero panel">
        <div className="avatar-frame">
          <div className="avatar-core">
            <span>TDM</span>
          </div>
        </div>
      </section>

      <section className="profile-grid">
        <article className="panel info-card">
          <h2>Information</h2>
          <div className="info-grid">
            <InfoField label="Name" value={profileData.name} />
            <InfoField label="Birthday" value={profileData.birthday} />
            <InfoField label="Gmail" value={profileData.gmail} />
            <InfoField label="Phone number" value={profileData.phone} />
          </div>
        </article>

        <article className="panel info-card">
          <h2>Link Project</h2>
          <div className="links-grid">
            <LinkField label="Github" value={profileData.github} />
            <LinkField label="Figma" value={profileData.figma} />
            <div className="link-field">
              <span>PDF</span>
              <button type="button" className="download-button">
                <Download size={16} />
                {profileData.pdfLabel}
              </button>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}