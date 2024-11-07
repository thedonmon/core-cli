import { Transaction, VersionedTransaction } from "@solana/web3.js";

export const isVersionedTransaction = (
    tx: Transaction | VersionedTransaction
  ): tx is VersionedTransaction => {
    return "version" in tx;
  };