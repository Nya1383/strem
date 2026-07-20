import type { DiscordNotificationPayload } from '../../shared/ipc';
import { getLocalIpAddress } from './network';

function buildDiscordMessageBody(payload: DiscordNotificationPayload) {
  const isPasswordProtected = Boolean(payload.password);
  const qualityStr = `${payload.resolution || '1080p'} @ ${payload.frameRate || 60} FPS`;
  const lanIp = getLocalIpAddress();
  const serverUrl = `ws://${lanIp}:8080`;
  const joinProtocolUrl = `strem://join/${payload.roomId}?server=${encodeURIComponent(serverUrl)}`;

  const embed = {
    title: '🔴 STREM Live Broadcast Started!',
    description: `Click the watch link below to join stream \`${payload.roomId}\` directly in STREM!`,
    color: 0x6366f1,
    fields: [
      {
        name: '📺 Clickable Watch Link',
        value: `👉 **[Launch & Watch Stream in STREM](${joinProtocolUrl})**\n\`${joinProtocolUrl}\``,
        inline: false
      },
      {
        name: '🔑 Room ID',
        value: `\`${payload.roomId}\``,
        inline: true
      },
      {
        name: '🌐 Signaling Server IP',
        value: `\`${serverUrl}\``,
        inline: true
      },
      {
        name: '🛡️ Access',
        value: isPasswordProtected ? '🔒 Password Protected' : '🌐 Public Room',
        inline: true
      },
      {
        name: '🎥 Quality Preset',
        value: qualityStr,
        inline: true
      },
      {
        name: '💻 Source',
        value: payload.sourceName || 'Desktop Display',
        inline: true
      }
    ],
    footer: {
      text: 'STREM Desktop Streamer • Ultra-Low Latency WebRTC'
    },
    timestamp: new Date().toISOString()
  };

  return {
    content: `📢 **Stream Alert!** Room \`${payload.roomId}\` is now live!\n👉 **Watch Link:** \`${joinProtocolUrl}\``,
    embeds: [embed]
  };
}

export async function sendDiscordStreamNotification(
  payload: DiscordNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (payload.integrationType === 'bot') {
    if (!payload.botToken || !payload.channelId) {
      return { success: false, error: 'Bot Token and Channel ID are required' };
    }
    return sendViaBotApi(payload.botToken.trim(), payload.channelId.trim(), buildDiscordMessageBody(payload));
  } else {
    if (!payload.webhookUrl || !payload.webhookUrl.startsWith('http')) {
      return { success: false, error: 'Invalid Webhook URL' };
    }
    return sendViaWebhook(payload.webhookUrl.trim(), buildDiscordMessageBody(payload));
  }
}

async function sendViaBotApi(
  botToken: string,
  channelId: string,
  bodyObj: any
): Promise<{ success: boolean; error?: string }> {
  const token = botToken.startsWith('Bot ') ? botToken.substring(4).trim() : botToken.trim();
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyObj)
    });

    if (response.ok) {
      console.log(`[DiscordBot] Successfully posted alert to channel ${channelId}`);
      return { success: true };
    } else {
      const errText = await response.text();
      console.warn('[DiscordBot] Discord API error response:', response.status, errText);
      return { success: false, error: `Discord HTTP ${response.status}: ${errText}` };
    }
  } catch (err) {
    console.error('[DiscordBot] Request exception:', err);
    return { success: false, error: String(err) };
  }
}

async function sendViaWebhook(
  webhookUrl: string,
  bodyObj: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj)
    });

    if (response.ok || response.status === 204) {
      return { success: true };
    } else {
      const errText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function testDiscordBotCredentials(
  botToken: string,
  channelId: string
): Promise<{ success: boolean; error?: string }> {
  const token = botToken.startsWith('Bot ') ? botToken.substring(4).trim() : botToken.trim();
  const testPayload = {
    content: '✅ **STREM Discord Bot Connection Success!** The bot is verified and ready to auto-post live stream links to this channel.'
  };

  return sendViaBotApi(token, channelId.trim(), testPayload);
}

export async function testDiscordWebhookUrl(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  const testPayload = {
    content: '✅ **Discord Integration Test Success!** STREM is ready to post live stream links to this channel.'
  };
  return sendViaWebhook(webhookUrl.trim(), testPayload);
}
