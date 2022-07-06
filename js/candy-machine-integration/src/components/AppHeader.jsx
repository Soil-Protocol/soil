import {
  ConnectType,
  useConnectedWallet,
  useWallet,
  WalletStatus,
} from "@terra-money/wallet-provider";

import React, { useMemo, useEffect } from "react";
import { Extension } from "@terra-money/terra.js";
import { Link, NavLink } from "react-router-dom";

export const AppHeader = () => {
  const isAddress = (address) => {
    return address.startsWith("terra") && address.length === 44;
  };
  const maskAddress = (address) => {
    if (!isAddress) {
      return address;
    }
    return address.substr(0, 5) + "..." + address.substr(-5, 5);
  };
  const { status, network, availableConnectTypes, connect, disconnect } =
  useWallet();

  const connectedWallet = useConnectedWallet();

  const isReady = useMemo(() => {
    return status !== WalletStatus.INITIALIZING;
  }, [status]);

  const isConnected = useMemo(() => {
    return status === WalletStatus.WALLET_CONNECTED;
  }, [status]);

  const isExtensionInstalled = useMemo(() => {
    return availableConnectTypes.includes(ConnectType.CHROME_EXTENSION);
  }, [availableConnectTypes]);

  useEffect(() => {
    if (isReady && isConnected && isExtensionInstalled) {
      const extension = new Extension();
      const intervalId = setInterval(async () => {
        const info = await extension.request("info");
        if (network.name !== info.payload["name"]) {
          window.location.reload();
        }
      }, 1000);
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [isConnected, isExtensionInstalled, isReady, network]);
  return (
    <div className="px-6 xl:px-12 flex justify-between text-white text-sm h-20">
      
        <button
          onClick={() => {
            console.log('connect ')
            connect(ConnectType.CHROME_EXTENSION);
          }}
          className="app__outline-button--rounded"
        >
          {isConnected
            ? maskAddress(connectedWallet.walletAddress)
            : "Connect Wallet"}
        </button>
        {isConnected ? (
          <button
            onClick={() => {
              disconnect();
            }}
            className="app__outline-button--rounded"
          >
            Disconnect Wallet
          </button>
        ) : null}
      </div>
  );
};
