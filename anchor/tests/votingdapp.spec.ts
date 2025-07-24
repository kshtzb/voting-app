import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Votingdapp } from "../target/types/votingdapp";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { getVotingdappProgramId } from "@project/anchor";

const IDL = require("../target/idl/votingdapp.json");

const votingAddress = new PublicKey(
  "AaM3YBsGJJUxUM77GVrwmf7YrAqcVpRpSEMcr7BBFb8g"
);

describe("votingdapp", () => {
  let context;
  let provider;
  //let votingProgram: Program<Votingdapp>;
  anchor.setProvider(anchor.AnchorProvider.env());
  let votingProgram = anchor.workspace.Votingdapp as Program<Votingdapp>;

  // beforeAll(async () => {
  //   context = await startAnchor(
  //     "",
  //     [{ name: "votingdapp", programId: votingAddress }],
  //     []
  //   );

  //   provider = new BankrunProvider(context);

  //   votingProgram = new Program<Votingdapp>(IDL, provider);
  // });

  it("Initialize Poll", async () => {
    await votingProgram.methods
      .initializePoll(
        new anchor.BN(1),
        "What is fav type of peanut butter?",
        new anchor.BN(0),
        new anchor.BN(1742585447)
      )
      .rpc();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      votingAddress
    );

    const poll = await votingProgram.account.poll.fetch(pollAddress);

    console.log(poll);

    expect(poll.pollId.toNumber()).toEqual(1);
    expect(poll.description).toEqual(
      "What is fav type of peanut butter?"
    );
    expect(poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber());
  });

  it("initialize candidate", async () => {
    await votingProgram.methods
      .initializeCandidate("Crunchy", new anchor.BN(1))
      .rpc();

    await votingProgram.methods
      .initializeCandidate("Smooth", new anchor.BN(1))
      .rpc();

    const [crunchyAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("Crunchy")],
      votingAddress
    );

    const crunchyCandidate = await votingProgram.account.candidate.fetch(
      crunchyAddress
    );
    console.log(crunchyCandidate);

    expect(crunchyCandidate.candidateVotes.toNumber()).toEqual(0);

    const [smoothAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("Smooth")],
      votingAddress
    );

    const smoothCandidate = await votingProgram.account.candidate.fetch(
      smoothAddress
    );
    console.log(smoothCandidate);

    expect(smoothCandidate.candidateVotes.toNumber()).toEqual(0);
  });

  it.only("vote", async () => {
    await votingProgram.methods.vote("Smooth", new anchor.BN(1)).rpc();

    const [smoothAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("Smooth")],
      votingAddress
    );

    const smoothCandidate = await votingProgram.account.candidate.fetch(
      smoothAddress
    );
    console.log(smoothCandidate);

    //expect(smoothCandidate.candidateVotes.toNumber()).toEqual(5);
  });
});
