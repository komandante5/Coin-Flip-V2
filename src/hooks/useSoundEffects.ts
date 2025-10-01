import { useCallback, useRef } from 'react';

/**
 * Sound effects hook for Web3 Coin Flip game
 * Provides play functions for all game sounds and UI interactions
 */
export function useSoundEffects() {
  // Create audio refs to avoid recreating Audio objects on each render
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);
  const buttonClickSoundRef = useRef<HTMLAudioElement | null>(null);
  const walletConnectSoundRef = useRef<HTMLAudioElement | null>(null);
  const walletDisconnectSoundRef = useRef<HTMLAudioElement | null>(null);
  const tabSwitchSoundRef = useRef<HTMLAudioElement | null>(null);
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);
  const flipStartSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio objects only once
  if (typeof window !== 'undefined') {
    if (!winSoundRef.current) {
      winSoundRef.current = new Audio('/sounds/win.mp3');
      winSoundRef.current.volume = 0.5; // 50% volume
    }
    if (!loseSoundRef.current) {
      loseSoundRef.current = new Audio('/sounds/lose.mp3');
      loseSoundRef.current.volume = 0.5;
    }
    if (!selectSoundRef.current) {
      selectSoundRef.current = new Audio('/sounds/select.mp3');
      selectSoundRef.current.volume = 0.3; // Quieter for UI feedback
    }
    if (!buttonClickSoundRef.current) {
      buttonClickSoundRef.current = new Audio('/sounds/button-click.mp3');
      buttonClickSoundRef.current.volume = 0.4;
    }
    if (!walletConnectSoundRef.current) {
      walletConnectSoundRef.current = new Audio('/sounds/wallet-connect.mp3');
      walletConnectSoundRef.current.volume = 0.5;
    }
    if (!walletDisconnectSoundRef.current) {
      walletDisconnectSoundRef.current = new Audio('/sounds/wallet-disconnect.mp3');
      walletDisconnectSoundRef.current.volume = 0.5;
    }
    if (!tabSwitchSoundRef.current) {
      tabSwitchSoundRef.current = new Audio('/sounds/tab-switch.mp3');
      tabSwitchSoundRef.current.volume = 0.3;
    }
    if (!hoverSoundRef.current) {
      hoverSoundRef.current = new Audio('/sounds/hover.mp3');
      hoverSoundRef.current.volume = 0.15; // Very quiet for hover
    }
    if (!errorSoundRef.current) {
      errorSoundRef.current = new Audio('/sounds/error.mp3');
      errorSoundRef.current.volume = 0.5;
    }
    if (!flipStartSoundRef.current) {
      flipStartSoundRef.current = new Audio('/sounds/flip-start.mp3');
      flipStartSoundRef.current.volume = 0.6;
    }
  }

  const playWin = useCallback(() => {
    if (winSoundRef.current) {
      winSoundRef.current.currentTime = 0;
      winSoundRef.current.play().catch(err => {
        console.warn('Failed to play win sound:', err);
      });
    }
  }, []);

  const playLose = useCallback(() => {
    if (loseSoundRef.current) {
      loseSoundRef.current.currentTime = 0;
      loseSoundRef.current.play().catch(err => {
        console.warn('Failed to play lose sound:', err);
      });
    }
  }, []);

  const playSelect = useCallback(() => {
    if (selectSoundRef.current) {
      selectSoundRef.current.currentTime = 0;
      selectSoundRef.current.play().catch(err => {
        console.warn('Failed to play select sound:', err);
      });
    }
  }, []);

  const playButtonClick = useCallback(() => {
    if (buttonClickSoundRef.current) {
      buttonClickSoundRef.current.currentTime = 0;
      buttonClickSoundRef.current.play().catch(err => {
        console.warn('Failed to play button click sound:', err);
      });
    }
  }, []);

  const playWalletConnect = useCallback(() => {
    if (walletConnectSoundRef.current) {
      walletConnectSoundRef.current.currentTime = 0;
      walletConnectSoundRef.current.play().catch(err => {
        console.warn('Failed to play wallet connect sound:', err);
      });
    }
  }, []);

  const playWalletDisconnect = useCallback(() => {
    if (walletDisconnectSoundRef.current) {
      walletDisconnectSoundRef.current.currentTime = 0;
      walletDisconnectSoundRef.current.play().catch(err => {
        console.warn('Failed to play wallet disconnect sound:', err);
      });
    }
  }, []);

  const playTabSwitch = useCallback(() => {
    if (tabSwitchSoundRef.current) {
      tabSwitchSoundRef.current.currentTime = 0;
      tabSwitchSoundRef.current.play().catch(err => {
        console.warn('Failed to play tab switch sound:', err);
      });
    }
  }, []);

  const playHover = useCallback(() => {
    if (hoverSoundRef.current) {
      hoverSoundRef.current.currentTime = 0;
      hoverSoundRef.current.play().catch(err => {
        console.warn('Failed to play hover sound:', err);
      });
    }
  }, []);

  const playError = useCallback(() => {
    if (errorSoundRef.current) {
      errorSoundRef.current.currentTime = 0;
      errorSoundRef.current.play().catch(err => {
        console.warn('Failed to play error sound:', err);
      });
    }
  }, []);

  const playFlipStart = useCallback(() => {
    if (flipStartSoundRef.current) {
      flipStartSoundRef.current.currentTime = 0;
      flipStartSoundRef.current.play().catch(err => {
        console.warn('Failed to play flip start sound:', err);
      });
    }
  }, []);

  return {
    playWin,
    playLose,
    playSelect,
    playButtonClick,
    playWalletConnect,
    playWalletDisconnect,
    playTabSwitch,
    playHover,
    playError,
    playFlipStart,
  };
}

