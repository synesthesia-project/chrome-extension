import { ServerRequest } from '@synesthesia-project/core/protocols/control/messages';
import {PlayState, PlayStateTiming, TabMessage} from '../proto';

($ => {

  console.log('Inserted contentscript');

  let $player = $('#player'),
  lastState: PlayState | null = null,
  album_art_url: string | undefined = undefined,
  paperSliderObserverSet = false,
  paperSliderValues = {
    value: 0,
    effectiveStartTime: 0,
    max: 0
  };

  // Connect to background script
  const port = chrome.runtime.connect();
  port.onMessage.addListener(msg => {
    const request: ServerRequest = msg as any;
    switch (request.request) {
      case 'toggle':
        control().toggle();
        return;
      case 'pause':
        control().toggle();
        return;
      case 'go-to-time':
        control().goTo(request.positionMillis);
        return;
    }
  });

  function sendMessage(msg: TabMessage) {
    port.postMessage(msg);
  }

  // Listen for changes in subtree of player
  $player.bind('DOMSubtreeModified', update_state);

  // Listen to mutations of paper-slider for accurate timing
  const paperSliderObserver = new MutationObserver((mutations) => {
    const now = new Date().getTime(); // get current timestamp ASAP
    let slider: Element | null = null;
    for (const m of mutations) {
      if (m.attributeName === 'value' && m.target instanceof Element) {
        slider = m.target;
        break;
      }
    }
    if (slider) {
      // Record timestamps
      const attrValue = slider.attributes.getNamedItem('value');
      const attrValueMax = slider.attributes.getNamedItem('aria-valuemax');
      if (!attrValue || !attrValueMax) return;
      const value = Number(attrValue.value);
      paperSliderValues = {
        value,
        effectiveStartTime: now - value,
        max: Number(attrValueMax.value)
      };
    }
    update_state();
  });

  function control() {
    // Create closure (on demand) for functions requiring control access
    // (created on demand and disposed of as elems change over the lifetime
    // of page)
    const $buttons = $('.material-player-middle:first'),
          $play_pause = $buttons.children('[data-id=play-pause]:first'),
          $next = $buttons.children('[data-id=forward]:first'),
          $prev = $buttons.children('[data-id=rewind]:first'),
          $player_song_info = $('#playerSongInfo'),
          $title = $player_song_info.find('#currently-playing-title'),
          $artist = $player_song_info.find('#player-artist'),
          $album = $player_song_info.find('.player-album:first');

    return {
      update_state: () => {
        // Don't do anything if DOM is in bad state
        if ($player_song_info.children().length === 0)
          return;
        // Setup the paper observer if it is not already
        if (!paperSliderObserverSet) {
          // start the observer
          const target = $('paper-slider').get(0);
          if (target) {
            paperSliderObserver.observe(target, {attributes: true});
            paperSliderObserverSet = true;
          }
        }
        let newState: PlayState | null = null;
        if ($player_song_info.is(':visible') && $title) {

          // Meta Info
          const title = $title.text();
          const artist = $artist ? $artist.text() : undefined;
          const album = $album ? $album.text() : undefined;

          // Album Art
          const new_album_art_url = $('#playerBarArt').attr('src');

          if (new_album_art_url && album_art_url !== new_album_art_url) {
            convertImgToBase64(
              new_album_art_url,
              base64 => {
                console.log('New Album Art:', base64);
                // TODO: send album art upstream
              },
              'image/png');
          }

          album_art_url = new_album_art_url;

          // Play state
          const state: PlayStateTiming = $play_pause.hasClass('playing') ?
            { state: 'playing', effectiveStartTimeMillis: paperSliderValues.effectiveStartTime } :
            { state: 'paused', positionMillis: paperSliderValues.value };

          newState = {
            length: paperSliderValues.max,
            title,
            artist,
            album,
            state
          };
        }

        if (stateChanged(lastState, newState)) {
          lastState = newState;
          send_state();
        }
      },
      toggle: () => $play_pause.click(),
      next: () => $next.click(),
      prev: () => $prev.click(),
      goTo: (millis: number) => console.log(millis)
    };
  }

  function stateChanged(oldState: PlayState | null, newState: PlayState | null) {
    // Only one is null -> changed
    if ((oldState === null || newState === null) && oldState !== newState)
      return true;
    // Both non-null -> check properties
    if (oldState !== null && newState !== null) {
      // Check properties changes
      return (
        oldState.length !== newState.length ||
        oldState.state.state !== newState.state.state ||
        (
          // If playing, state is different by more than 10 (milliseconds)
          oldState.state.state === 'playing' && newState.state.state === 'playing' && (
            oldState.state.effectiveStartTimeMillis < newState.state.effectiveStartTimeMillis - 10 ||
            oldState.state.effectiveStartTimeMillis > newState.state.effectiveStartTimeMillis + 10
          )
        ) ||
        (
          // If paused, state is different at all
          oldState.state.state === 'paused' && newState.state.state === 'paused' &&
          oldState.state.positionMillis !== newState.state.positionMillis
        ) ||
        oldState.title !== newState.title ||
        oldState.artist !== newState.artist ||
        oldState.album !== newState.album
      );
    }
    // Both null -> unchanged
    return false;
  }

  function update_state() {
    control().update_state();
  }

  function send_state() {
    sendMessage({msg: 'update_state', state: lastState});
  }

  function convertImgToBase64(
    url: string,
    callback: (dataUrl: string) => void,
    outputFormat: 'image/png') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx === null)
        throw new Error('null context');
      const img = new Image;
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        canvas.height = Math.min(img.height, 62);
        canvas.width = Math.min(img.width, 62);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL(outputFormat);
        callback.call(this, dataURL);
      };
      img.src = url;
    }

  })(jQuery);
