// Allows large error types in Result, avoiding Clippy warnings.
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

// Declare the program ID (Replace with actual program ID)
declare_id!("AaM3YBsGJJUxUM77GVrwmf7YrAqcVpRpSEMcr7BBFb8g");

#[program]
pub mod votingdapp {
    use super::*;

    // Function to initialize a new poll
    pub fn initialize_poll(
        ctx: Context<InitializePoll>, // Context containing the poll account
        poll_id: u64,                 // Unique identifier for the poll
        description: String,          // Poll description
        poll_start: u64,              // Start time of the poll
        poll_end: u64,                // End time of the poll
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll; // Get reference to the poll account
        poll.poll_id = poll_id;
        poll.description = description;
        poll.poll_start = poll_start;
        poll.poll_end = poll_end;
        poll.candidate_amount = 0; // Initially, no candidates are added

        Ok(())
    }

    // Function to initialize a new candidate within a poll
    pub fn initialize_candidate(
        ctx: Context<InitializeCandidate>, // Context containing poll & candidate accounts
        candidate_name: String,            // Candidate's name
        _poll_id: u64,                     // Poll ID (used for generating PDA)
    ) -> Result<()> {
        let candidate = &mut ctx.accounts.candidate; // Reference to candidate account
        let poll = &mut ctx.accounts.poll; // Reference to poll account

        poll.candidate_amount += 1; // Increment the number of candidates
        candidate.candidate_name = candidate_name;
        candidate.candidate_votes = 0; // Initially, candidate has zero votes

        Ok(())
    }

    // Function to cast a vote for a candidate in a poll
    pub fn vote(
        ctx: Context<Vote>,      // Context containing voter, poll & candidate accounts
        _candidate_name: String, // Candidate's name (used for PDA derivation)
        _poll_id: u64,           // Poll ID (used for PDA derivation)
    ) -> Result<()> {
        let candidate = &mut ctx.accounts.candidate; // Reference to candidate account
        candidate.candidate_votes += 1; // Increment candidate's vote count

        // Logging messages for debugging
        msg!("Voted for candidate: {}", candidate.candidate_name);
        msg!("Votes: {}", candidate.candidate_votes);

        Ok(())
    }
}

// ************************************************************************************************************
// Struct defining the Poll account data
#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub poll_id: u64, // Unique poll ID
    #[max_len(280)]
    pub description: String, // Poll description
    pub poll_start: u64, // Start timestamp
    pub poll_end: u64, // End timestamp
    pub candidate_amount: u64, // Number of candidates
}

// Struct defining the accounts required for initializing a poll
#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>, // Poll creator

    // Poll account, initialized using poll_id as seed for PDA
    #[account(
        init,  // Creates a new account
        payer = signer,  // The signer pays for account creation
        space = 8 + Poll::INIT_SPACE,  // Space required for storing poll data
        seeds = [poll_id.to_le_bytes().as_ref()], // PDA derivation
        bump
    )]
    pub poll: Account<'info, Poll>,

    pub system_program: Program<'info, System>, // Required for account initialization
}
// *****************************************************************************************************************************

// *****************************************************************************************************************************

// Struct defining the Candidate account data
#[account]
#[derive(InitSpace)]
pub struct Candidate {
    #[max_len(32)]
    pub candidate_name: String, // Candidate's name
    pub candidate_votes: u64, // Vote count for candidate
}

// Struct defining the accounts required for initializing a candidate
#[derive(Accounts)]
#[instruction(candidate_name: String, poll_id: u64)]
pub struct InitializeCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>, // Candidate creator

    // Poll account, must already exist
    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref()], // PDA derivation
        bump
    )]
    pub poll: Account<'info, Poll>,

    // Candidate account, initialized using poll_id and candidate_name as seed for PDA
    #[account(
        init,  // Creates a new account
        payer = signer,  // The signer pays for account creation
        space = 8 + Candidate::INIT_SPACE,  // Space required for storing candidate data
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_bytes()], // PDA derivation
        bump
    )]
    pub candidate: Account<'info, Candidate>,

    pub system_program: Program<'info, System>, // Required for account initialization
}

// Struct defining the accounts required for the `vote` function
#[derive(Accounts)]
#[instruction(candidate_name: String, poll_id: u64)]
pub struct Vote<'info> {
    // Signer account, representing the voter
    pub signer: Signer<'info>,

    // Poll account, derived from poll_id using a PDA
    #[account(
        seeds = [poll_id.to_le_bytes().as_ref()], // PDA derivation
        bump
    )]
    pub poll: Account<'info, Poll>,

    // Candidate account, derived from poll_id and candidate_name
    #[account(
        mut, // Allows modification (incrementing vote count)
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_bytes()], // PDA derivation
        bump
    )]
    pub candidate: Account<'info, Candidate>,
}
// *****************************************************************************************************************************
