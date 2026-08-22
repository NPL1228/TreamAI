import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';

export default function MeetingRoom({ user }) {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `Meeting: ${meetingId} | TreamAI`;
  }, [meetingId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>
      
      <header style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--bg-card)', zIndex: 10 }}>
        <button onClick={() => navigate('/meeting-left')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Meeting: {meetingId}</h2>
        </div>
      </header>

      <div style={{ flex: 1 }}>
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={`TreamAI_${meetingId}`}
          configOverwrite={{
            startWithAudioMuted: true,
            disableModeratorIndicator: true,
            startScreenSharing: true,
            enableEmailInStats: false
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
          }}
          userInfo={{
            displayName: user
          }}
          onApiReady={(externalApi) => {
            externalApi.addListener('videoConferenceLeft', () => {
              navigate('/meeting-left');
            });
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
          }}
        />
      </div>

    </div>
  );
}
