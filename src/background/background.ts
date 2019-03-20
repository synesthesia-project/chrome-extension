import { ControllerEndpoint } from '@synesthesia-project/core/protocols/control';
import { DEFAULT_SYNESTHESIA_PORT, CONTROLLER_WEBSOCKET_PATH, DEFAULT_COMPOSER_URL } from '@synesthesia-project/core/constants';
import { File, LayerState } from '@synesthesia-project/core/protocols/control/messages';

import { PlayState, TabMessage } from '../proto';

chrome.browserAction.onClicked.addListener(() => {
    chrome.tabs.create({'url': DEFAULT_COMPOSER_URL, 'selected': true});
});

function sendState(endpoint: ControllerEndpoint, state: PlayState | null) {
  if (!state) {
    endpoint.sendState({
      layers: []
    });
  } else {
    const file: File = {
      type: 'meta',
      title: state.title,
      artist: state.artist,
      album: state.album,
      lengthMillis: state.length
    };
    const layerState: LayerState = state.state.state === 'playing' ?
      {
        type: 'playing',
        effectiveStartTimeMillis: state.state.effectiveStartTimeMillis,
        playSpeed: 1
      } :
      {
        type: 'paused',
        positionMillis: state.state.positionMillis
      };
    endpoint.sendState({
      layers: [{ file, state: layerState }]
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
      endpoint.setRequestHandler(req => {
        // TODO: connect this up properly, and return correct success
        port.postMessage(req);
        return Promise.resolve({success: true});
      });
  });
  ws.addEventListener('message', msg => {
    if (!endpoint) return;
    endpoint.recvMessage(JSON.parse(msg.data));
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
  port.onMessage.addListener(handleTabMessage as (msg: any) => void);
  port.onDisconnect.addListener(handleTabClosed);
}

// chrome.runtime.onConnectExternal.addListener(connectionListener);
chrome.runtime.onConnect.addListener(connectionListener);
