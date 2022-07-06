import Countdown from "react-countdown";
import classes from "../App.module.css";
// import { Modal } from "../components/Modal/Modal";
import { useQueryService } from "../hooks/useQuery";
import { useExecuteService } from "../hooks/useExecute";
import React, { useState, useEffect, useRef } from "react";

export const Main = () => {
  const [candyRemaining, setCandyRemaining] = useState(null);
  const [totalSupply, setTotalSupply] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [txHash, setTxHash] = useState("");
  const { queryCandyRemaining } = useQueryService();
  const intervalRef = useRef(null);
  const executeService = useExecuteService();

  const handleMint = async () => {
    try {
      const result = await executeService.mint();
      const txHash = result?.result?.txhash;
      setVisible(true);
      setTxHash(txHash);
    } catch (err) {
      setTxHash(err);
      console.log(err);
    }
  };

  useEffect(() => {
    console.log('effect ')
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    const intervalFn = async () => {
      try {
        const candy = await queryCandyRemaining();
        setTotalSupply(candy?.total_supply)
        setCandyRemaining(candy?.total_token_count);
        setIsOpen(candy?.is_open);
      } catch {}
    };

    intervalRef.current = setInterval(intervalFn, 3000);
    return cleanup;
  }, [queryCandyRemaining]);


  return (
    <div className="App">
      {/* <Modal open={visible} hash={txHash} onClose={() => setVisible(false)} /> */}
      <div className="mt-4">
        <div>
          Candy Left : {candyRemaining} / {totalSupply}
        </div>
        <button
          onClick={handleMint}
          className="app__button app__button--primary-gradient"
        >
          Mint
        </button>
        
      </div>
    </div>
  );
};
