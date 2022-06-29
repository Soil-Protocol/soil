import {MsgStoreCode, LCDClient, MnemonicKey, MsgInstantiateContract, Coins, MsgExecuteContract, Wallet, MsgSend, Coin, MsgMigrateContract} from '@terra-money/terra.js'
import * as fs from 'fs'
import { delay } from './util'

const DELAY_TIME = 2000 // this to prevent unauthorization error

const networks = {
    localterra: {
        URL: 'http://localhost:1317',
        chainID: 'localterra',
        gasAdjustment: 1.5
    },
    testnet: {
        URL: 'https://pisco-lcd.terra.dev',
        chainID: 'pisco-1',
        gasAdjustment: 1.5
    },
    mainnet: {
        URL: 'https://phoenix-lcd.terra.dev',
        chainID: 'phoenix-1',
        gasAdjustment: 1.5
    }
}

export const instantiate = (network) => {
    return new LCDClient(networks[network])
}

export const create_wallet = (terra, mnemonic) => {
    const key = new MnemonicKey({
        mnemonic
    })
    return terra.wallet(key)
}

export const upload = async (
    terra,
    wallet,
    path,
):Promise<Number> => { 
    const tx = await wallet.createAndSignTx({
        msgs: [
            new MsgStoreCode(
                wallet.key.accAddress,
                fs.readFileSync(path, { encoding: 'base64'})
            )
        ]
    })
    try {
        const response = await terra.tx.broadcast(tx);
        const logs = JSON.parse(response.raw_log)
        let code_id = ''
        logs.forEach( (log) => {
            log.events.forEach( (event) => {
                if(event.type == 'store_code') {
                    code_id = event.attributes.find( (attribute) => attribute.key == 'code_id').value
                }
            })
        })
        await delay(DELAY_TIME)
        return Number(code_id)
    } catch (err) {
        console.log('err ', err)
        throw err
    }
}

export const init = async (
    terra,
    wallet,
    code_id,
    init_msg,
    label
) => {
    const msg = new MsgInstantiateContract(wallet.key.accAddress, wallet.key.accAddress, code_id, init_msg, [], label)
    const tx = await wallet.createAndSignTx({
      msgs: [
        msg
      ]
    });
    try {
        const response = await terra.tx.broadcast(tx);
        await delay(DELAY_TIME)
        const logs = JSON.parse(response.raw_log)
        let contract_addr = ''
        logs.forEach( (log) => {
            log.events.forEach( (event) => {
                if(event.type == 'instantiate') {
                    contract_addr = event.attributes.find( (attribute) => attribute.key == '_contract_address').value
                }
            })
        })
        await delay(DELAY_TIME)
        return {
            contract_addr: contract_addr,
            logs
        }
    } catch (err) {
        console.log(err)
        throw err
    }
};

export const execute = async (
    terra,
    wallet:Wallet,
    addr,
    execute_msg,
    coins?,
) => {
    let coin = new Coins()
    if(coins)
        coin = Coins.fromString(coins)
    const msgs = [new MsgExecuteContract(wallet.key.accAddress, addr, execute_msg, coin)]
    const tx = await wallet.createAndSignTx({
      msgs: msgs
    });
    const response = await terra.tx.broadcast(tx);
    await delay(DELAY_TIME)
    return response;
}

export const batchExecuteRaw = async (
    terra,
    wallet:Wallet,
    msgs: MsgExecuteContract[],
) => {
    const tx = await wallet.createAndSignTx({
      msgs
    });
    const response = await terra.tx.broadcast(tx);
    await delay(DELAY_TIME)
    return response;
}

export const batchExecute = async (
    terra,
    wallet:Wallet,
    addr,
    execute_msgs,
    coins?,
) => {
    let coin = new Coins()
    if(coins)
        coin = Coins.fromString(coins)
    const msgs = execute_msgs.map(execute_msg => {
        return new MsgExecuteContract(wallet.key.accAddress, addr, execute_msg, coin)
    })
    const tx = await wallet.createAndSignTx({
      msgs: msgs
    });
    const response = await terra.tx.broadcast(tx);
    await delay(DELAY_TIME)
    return response;
}

export const query = async (terra, addr, msg) => {
    const response = await terra.wasm.contractQuery(addr,msg)
    return response
}

export const queryAtHeight = async (terra, addr, msg, height) => {
    const response = await terra.wasm.contractQuery(addr,msg, { height })
    return response
}