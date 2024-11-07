import { Buffer } from "buffer";
import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { isVersionedTransaction } from "./utils";
import { Wallet } from "./type";

/**
 * Node only wallet.
 */
export default class NodeWallet implements Wallet {
  constructor(readonly payer: Keypair) {}

  static local(secret: Uint8Array): NodeWallet | never {
    const payer = Keypair.fromSecretKey(secret);
    return new NodeWallet(payer);
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    if (isVersionedTransaction(tx)) {
      tx.sign([this.payer]);
    } else {
      tx.partialSign(this.payer);
    }

    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return txs.map((t) => {
      if (isVersionedTransaction(t)) {
        t.sign([this.payer]);
      } else {
        t.partialSign(this.payer);
      }
      return t;
    });
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}