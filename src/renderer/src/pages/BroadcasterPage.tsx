import React, { useState } from 'react';
import { SourceSelector } from '../components/broadcaster/SourceSelector';
import { StreamPreview } from '../components/broadcaster/StreamPreview';
import { ShareModal } from '../components/broadcaster/ShareModal';

export const BroadcasterPage: React.FC = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <StreamPreview onOpenShareModal={() => setIsShareModalOpen(true)} />
      <SourceSelector />
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </div>
  );
};
