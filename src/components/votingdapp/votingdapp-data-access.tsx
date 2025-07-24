"use client";
import BN from "bn.js"; // Import BN.js
import { getVotingdappProgram, getVotingdappProgramId } from "@project/anchor";
import { Program } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Cluster,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { FeeRateGovernor } from "solana-bankrun";

// =============================
// Hook: useVotingdappProgramCandidateAccount
// Purpose: Fetch and vote for a single candidate
// =============================

export function useVotingdappProgramCandidateAccount({
  account,
}: {
  account: PublicKey;
}) {
  //const { connection } = useConnection();
  const { cluster } = useCluster(); // Get current cluster (e.g., devnet)
  const transactionToast = useTransactionToast(); // Hook to show tx success/failure
  const provider = useAnchorProvider(); // Get Anchor provider
  const program = getVotingdappProgram(provider); // Get the Anchor program interface
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  // Query to fetch a single candidate account
  const candidateQuery = useQuery({
    queryKey: ["candidate", { cluster, account }],
    queryFn: () => program.account.candidate.fetch(account), // Anchor auto-fetches the account
  });

  // Mutation to vote for a candidate
  const vote = useMutation({
    mutationKey: ["voting", "vote", { cluster }],
    mutationFn: async (candidate: string) => {
      if (!publicKey) throw new Error("Wallet not connected");
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 8000,
      });

      // const recentPriorityFees = await (
      //   connection as any
      // ).getRecentPrioritizationFees({
      //   lockedWritableAccounts: [
      //     new PublicKey("HG72uNiFpK6HFusGuJWmTAMyj3VNc5XzZGrtwW1igGxF"),
      //   ],
      // });

      // const response = await (connection as any)._rpcRequest(
      //   "getRecentPrioritizationFees",
      //   [
      //     {
      //       lockedWritableAccounts: [
      //         new PublicKey("HG72uNiFpK6HFusGuJWmTAMyj3VNc5XzZGrtwW1igGxF"),
      //       ],
      //     },
      //   ]
      // );

      // const recentPriorityFees = response.result;

      // const minFee = Math.min(
      //   ...recentPriorityFees.map(
      //     (fee: { prioritizationFee: any }) => fee.prioritizationFee
      //   )
      // );

      // const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      //   microLamports: minFee + 1,
      // });

      let microLamports = 1;

      try {
        const response = await (connection as any)._rpcRequest(
          "getRecentPrioritizationFees",
          [
            {
              lockedWritableAccounts: [
                new PublicKey("HG72uNiFpK6HFusGuJWmTAMyj3VNc5XzZGrtwW1igGxF"),
              ],
            },
          ]
        );

        const recentPriorityFees = response.result;

        if (
          Array.isArray(recentPriorityFees) &&
          recentPriorityFees.length > 0 &&
          recentPriorityFees[0].prioritizationFee !== undefined
        ) {
          const minFee = Math.min(
            ...recentPriorityFees.map((fee: any) => fee.prioritizationFee)
          );

          microLamports = minFee + 1;
        } else {
          console.warn("No usable priority fee data returned. Using fallback.");
        }
      } catch (e) {
        console.warn("Failed to fetch prioritization fees:", e);
      }

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports,
      });

      const vote = await program.methods
        .vote(candidate, new BN(1))
        .instruction();

      const blockhashContext = await connection.getLatestBlockhashAndContext();

      const transaction = new Transaction({
        feePayer: provider.wallet.publicKey,
        blockhash: blockhashContext.value.blockhash,
        lastValidBlockHeight: blockhashContext.value.lastValidBlockHeight,
      })
        .add(modifyComputeUnits)
        .add(addPriorityFee)
        .add(vote);

      return await sendTransaction(transaction, connection);
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      return candidateQuery.refetch();
    },
    onError: () => toast.error("Failed to vote for candidate"),
  });

  return {
    candidateQuery,
    vote,
  };
}

// =============================
// Hook: useVotingdappProgram
// Purpose: Get global state related to the voting program
// =============================

export function useVotingdappProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const programId = useMemo(
    () => getVotingdappProgramId(cluster.network as Cluster), // Get program ID based on network
    [cluster]
  );
  const program = getVotingdappProgram(provider);

  // Fetch all candidate accounts
  const accounts = useQuery({
    queryKey: ["voting", "all", { cluster }],
    queryFn: () => program.account.candidate.all(),
  });

  // Fetch all polls
  const polls = useQuery({
    queryKey: ["polls", "all", { cluster }],
    queryFn: () => program.account.poll.all(),
  });

  // Fetch all candidates separately (optional if you want a dedicated hook)
  const candidates = useQuery({
    queryKey: ["candidates", "all", { cluster }],
    queryFn: () => program.account.candidate.all(),
  });

  // Fetch parsed account info from Solana (not Anchor)
  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  // Mutation to vote for a candidate
  const vote = useMutation({
    mutationKey: ["voting", "vote", { cluster }],
    mutationFn: (candidate: string) =>
      program.methods.vote(candidate, new BN(1)).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return accounts.refetch();
    },
    onError: () => toast.error("Failed to vote for candidate"),
  });

  return {
    program,
    programId,
    accounts,
    polls,
    getProgramAccount,
    vote,
    candidates,
  };
}
