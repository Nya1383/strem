import React from 'react';
import { useStream } from '../context/StreamContext';
import { JoinRoomForm } from '../components/viewer/JoinRoomForm';
import { VideoPlayer } from '../components/viewer/VideoPlayer';

export const ViewerPage: React.FC = () => {
  const { role, remoteStream } = useStream();

  const isWatching = role === 'viewer' && remoteStream;

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {isWatching ? <VideoPlayer /> : <JoinRoomForm />}
    </div>
  );
};
