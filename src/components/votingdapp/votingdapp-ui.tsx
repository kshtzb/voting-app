"use client";

import { Keypair, PublicKey } from "@solana/web3.js";
import { useMemo, useState, useEffect } from "react";
import { ellipsify } from "../ui/ui-layout";
import { ExplorerLink } from "../cluster/cluster-ui";
import {
  useVotingdappProgram,
  useVotingdappProgramCandidateAccount,
} from "./votingdapp-data-access";
import BN from "bn.js";

export function CandidateList() {
  const { candidates, getProgramAccount } = useVotingdappProgram();

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>;
  }

  return (
    <div>
      {candidates.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : candidates.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {candidates.data?.map((account) => (
            <div key={account.publicKey.toString()}>
              <CandidateCard
                key={account.publicKey.toString()}
                votes={account.account.candidateVotes.toNumber()}
                name={account.account.candidateName}
                account={account.publicKey}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={"text-2xl"}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  account,
}: {
  votes: number;
  name: string;
  account: PublicKey;
}) {
  const { candidateQuery, vote } = useVotingdappProgramCandidateAccount({
    account,
  });

  const [name, setName] = useState("");
  const [votes, setVotes] = useState(0);

  useEffect(() => {
    if (candidateQuery.data) {
      setName(candidateQuery.data.candidateName ?? "");
      setVotes(candidateQuery.data.candidateVotes.toNumber() ?? 0);
    }
  }, [candidateQuery.data]);

  return (
    <div className="card card-bordered border-base-300 border-4 text-neutral-content">
      <div className="card-body items-center text-center">
        <div className="space-y-6">
          <h2
            className="card-title justify-center text-3xl cursor-pointer"
            onClick={() => candidateQuery.refetch()}
          >
            {name}
          </h2>
          <p>{votes.toString()} votes</p>
          <button
            className="btn btn-xs lg:btn-md btn-outline"
            onClick={() => vote.mutateAsync(name)}
            disabled={vote.isPending}
          >
            Vote
          </button>
        </div>
      </div>
    </div>
  );
}

