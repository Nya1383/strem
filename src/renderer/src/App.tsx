import React, { useState, useEffect } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider } from './context/ChatContext';
import { StreamProvider, useStream } from './context/StreamContext';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar, type ActivePage } from './components/layout/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { BroadcasterPage } from './pages/BroadcasterPage';
import { ViewerPage } from './pages/ViewerPage';
import { SettingsPage } from './pages/SettingsPage';

export const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<ActivePage>('broadcaster');
  const { joinStream } = useStream();

  useEffect(() => {
    if (window.electronAPI?.onDeepLinkJoinRoom) {
      const unsub = window.electronAPI.onDeepLinkJoinRoom((targetRoomId) => {
        console.log('[App] Received deep link auto-join for room:', targetRoomId);
        setActivePage('viewer');
        joinStream(targetRoomId);
      });
      return unsub;
    }
    return undefined;
  }, [joinStream]);

  return (
    <div className="app-container">
      <TitleBar />
      <div className="app-body">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <div className="main-content">
          {activePage === 'broadcaster' && <BroadcasterPage />}
          {activePage === 'viewer' && <ViewerPage />}
          {activePage === 'settings' && <SettingsPage />}
          <ChatPanel />
        </div>
      </div>
    </div>
  );
};

export function App(): JSX.Element {
  return (
    <SettingsProvider>
      <ChatProvider>
        <StreamProvider>
          <AppContent />
        </StreamProvider>
      </ChatProvider>
    </SettingsProvider>
  );
}

export default App;
