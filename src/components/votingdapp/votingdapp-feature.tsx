'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { AppHero, ellipsify } from '../ui/ui-layout'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useVotingdappProgram } from './votingdapp-data-access'
import { CandidateList } from './votingdapp-ui'

export default function VotingdappFeature() {
  const { publicKey } = useWallet();
  const { programId } = useVotingdappProgram();

  return publicKey ? (
    <div>
      <AppHero
        title="Voting Application"
        subtitle={
          'A simple voting application on Solana'
        }
      >
      
      </AppHero>
      <CandidateList />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  );
}
