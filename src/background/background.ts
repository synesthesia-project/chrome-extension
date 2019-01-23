import { ControllerEndpoint } from '@synesthesia-project/core/protocols/control';
import { DEFAULT_SYNESTHESIA_PORT, CONTROLLER_WEBSOCKET_PATH, DEFAULT_COMPOSER_URL } from '@synesthesia-project/core/constants';

import { PlayState, TabMessage } from '../proto';

chrome.browserAction.onClicked.addListener(tab => {
    chrome.tabs.create({'url': DEFAULT_COMPOSER_URL, 'selected': true});
});

interface Tab {
  playState: PlayState | null;
}

function sendState(endpoint: ControllerEndpoint, state: PlayState | null) {
  if (state && state.state.state === 'playing') {
    // TODO: handle sending "paused" state to server
    endpoint.sendState({
      layers: [{
        file: {
          type: 'meta',
          title: state.title,
          artist: state.artist,
          album: state.album,
          lengthMillis: state.length
        },
        effectiveStartTimeMillis: state.state.effectiveStartTimeMillis,
        playSpeed: 1
      }]
    });
  } else {
    endpoint.sendState({
        layers: []
    });
  }
}

function connectionListener(port: chrome.runtime.Port) {

  let endpoint: ControllerEndpoint | null = null;
  let state: PlayState | null = null;

  const ws = new WebSocket(`ws://localhost:${DEFAULT_SYNESTHESIA_PORT}${CONTROLLER_WEBSOCKET_PATH}`);

  ws.addEventListener('open', () => {
      // Start controller
      endpoint = new ControllerEndpoint(msg => ws.send(JSON.stringify(msg)));
      sendState(endpoint, state);
  });

  function handleTabMessage(msg: TabMessage) {
    console.log(msg);
    if (msg.msg === 'update_state') {
      state = msg.state;
      if (endpoint) sendState(endpoint, state);
    }
  }

  function handleTabClosed() {
    ws.close();
  }

  // Setup Port Listeners
  port.onMessage.addListener(handleTabMessage);
  port.onDisconnect.addListener(handleTabClosed);
}

// chrome.runtime.onConnectExternal.addListener(connectionListener);
chrome.runtime.onConnect.addListener(connectionListener);
