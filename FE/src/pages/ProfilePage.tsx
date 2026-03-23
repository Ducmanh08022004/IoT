import { Download, ExternalLink } from 'lucide-react';
import { useState } from 'react';
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

function LinkField({
  label,
  value,
  displayText,
}: {
  label: string;
  value: string;
  displayText?: string;
}) {
  return (
    <div className="link-field">
      <span>{label}</span>
      <a href={value} target="_blank" rel="noreferrer">
        {displayText ?? value}
        <ExternalLink size={15} />
      </a>
    </div>
  );
}

export function ProfilePage() {
  const [isAvatarError, setIsAvatarError] = useState(false);

  return (
    <section className="page page--profile">
      <PageHeader title="Profile" subtitle="Thông tin cá nhân và các đường dẫn tài liệu." />

      <section className="profile-hero panel">
        <div className="avatar-frame">
          <div className="avatar-core">
            {isAvatarError ? (
              <span>TDM</span>
            ) : (
              <img
                src="/avatar.jpg"
                alt="Profile avatar"
                className="avatar-image"
                onError={() => setIsAvatarError(true)}
              />
            )}
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
            <LinkField
              label="API Docs"
              value="https://documenter.getpostman.com/view/44055904/2sBXigMtdv"
              displayText="Postman Documentation"
            />
            <div className="link-field">
              <span>PDF</span>
              <a href={profileData.pdfUrl} download="profile.pdf" className="download-button">
                <Download size={16} />
                {profileData.pdfLabel}
              </a>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}