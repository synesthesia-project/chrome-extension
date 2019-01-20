import {PlayState, PlayStateTiming, TabMessage} from './proto';

// TODO: Open composer when button is clicked
// (need to get the URL from the server)
// chrome.browserAction.onClicked.addListener(tab => {
//     chrome.tabs.create({'url': chrome.extension.getURL('index.html'), 'selected': true});
// });

interface Tab {
  playState: PlayState | null;
}

function connectionListener(port: chrome.runtime.Port) {
  // TODO: open new websocket

  function handleTabMessage(msg: TabMessage) {
    // TODO: send data to server
    console.log(msg);
  }

  function handleTabClosed() {
    // TODO close websocket
  }

  // Setup Port Listeners
  port.onMessage.addListener(handleTabMessage);
  port.onDisconnect.addListener(handleTabClosed);
}

// chrome.runtime.onConnectExternal.addListener(connectionListener);
chrome.runtime.onConnect.addListener(connectionListener);
