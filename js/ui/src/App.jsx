import { WalletProvider } from "@terra-money/wallet-provider";
import Modal from "react-modal";
import { Route } from "react-router";
import { BrowserRouter as Router } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { Networks, walletConnectChainIds } from "./hooks/constants/network";
import { Main } from './page/Main'
import "./App.css";

Modal.setAppElement("#root");

export const App = () => {
  return (
    <WalletProvider
      defaultNetwork={Networks.mainnet}
      walletConnectChainIds={walletConnectChainIds}
    >
      <Router>
        <AppHeader />
        <Main/>
      </Router>
    </WalletProvider>
  );
};
