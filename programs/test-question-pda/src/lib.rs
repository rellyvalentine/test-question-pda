use anchor_lang::prelude::*;

declare_id!("6uWRze9WV6LHM4jQUGCxxb2jjmrUcYqq6wWPWVdEaogg");

#[program]
pub mod test_question_pda {
    use super::*;
    pub fn initialize_question(ctx: Context<InitializeQuestion>, question_content: String, answers: Vec<Answer>) -> ProgramResult {

        let question = &mut ctx.accounts.question;
            question.asker = ctx.accounts.authority.key(); // set the asker to the authority's public key
            question.content = question_content; 
            question.answers = answers;
            // question.bump = question_account_bump; After 0.21.0 : bump is within the context
            question.bump = *ctx.bumps.get("question").unwrap(); // After 0.21.0 this is how we get bumps
        
        Ok(())
    }

    pub fn initialize_counter(ctx: Context<InitializeCounter>) -> ProgramResult {
        let counter = &mut ctx.accounts.counter;
        
        counter.bump = *ctx.bumps.get("counter").unwrap();
        Ok(())
    }

    pub fn increment_counter(ctx: Context<IncrementCounter>) -> ProgramResult {
        ctx.accounts.counter.count += 1;
        Ok(())
    }

    pub fn initialize_solver(ctx: Context<InitializeSolver>) -> ProgramResult {

        let solver = &mut ctx.accounts.solver;
        solver.user = ctx.accounts.authority.key(); // set the user to the authority's public key
        Ok(())
    }

    pub fn answer_question(ctx: Context<AnswerQuestion>, question: Pubkey) -> ProgramResult {
        let solver = &mut ctx.accounts.solver;
        solver.answered.push(question);
        Ok(())
    }
}

#[derive(Accounts)]
// #[instruction(...)]: allows access to the instruction's arguments : must be in the same order as listed but remaining can be omitted after the last one you need
pub struct InitializeQuestion<'info> {
    #[account(
        init,          // hey anchor, initialize an account w/ these details (rent exempted)
        seeds = [&question_counter.count.to_le_bytes(), authority.key().as_ref()],
        bump,          // hey anchor find the canonical bump for me
        payer = payer, // the authority variable will hold the payer for this account creation
        space = 8      // all accounts require minimum 8 bytes
                + 32   // public key space
                + Question::MAX_SIZE       // Question size
                + (4 + 4*Answer::MAX_SIZE) // Vector of 4 Answers
    )]
    pub question: Account<'info, Question>,

    #[account(mut, seeds = [b"question-count"], bump = question_counter.bump)]
    pub question_counter: Account<'info, QuestionCounter>,

    #[account(mut)]
    pub authority: Signer<'info>, // this signer

    /// CHECK: this account is not written to or read from so it's safe
    #[account(mut)]
    pub payer: AccountInfo<'info>, // this account will pay for the transaction
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct AnswerQuestion<'info> {
    #[account(mut)]
    pub solver: Account<'info, Solver>,
    /// CHECK: this account is not written to or read from so it's safe
    #[account(mut)]
    pub payer: AccountInfo<'info>
}

#[derive(Accounts)]
pub struct InitializeCounter<'info> {
    #[account(
        init, 
        seeds = [b"question-count"],
        bump,
        payer = payer,
        space = 8 + 1 + 1
    )]
    pub counter: Account<'info, QuestionCounter>,
    /// CHECK: this is not dangerous because we do not read or write to this account
    #[account(mut)]
    pub payer: AccountInfo<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct IncrementCounter<'info> {
    #[account(mut, seeds = [b"question-count"], bump)]
    pub counter: Account<'info, QuestionCounter>,

    #[account(seeds = [&counter.count.to_le_bytes(), authority.key().as_ref()], bump)]
    pub authority: Account<'info, Question>
}


#[derive(Accounts)]
pub struct InitializeSolver<'info> {
    #[account(
        init,
        payer = payer,
        space = 8
                + Solver::MAX_SIZE // 32 bytes per public key : 50 questions max answered
    )]
    pub solver: Account<'info, Solver>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: this account is not written to or read from so it's safe
    #[account(mut)]
    pub payer: AccountInfo<'info>,
    pub system_program: Program<'info, System>

}

#[account]
#[derive(Default)]
pub struct Question {
    asker: Pubkey,
    content: String, // solana's memo program handles string validation using an array of u8's (we will copy them)
    answers: Vec<Answer>, // vector of available answer choices
    bump: u8,
}

impl Question {
    // 32 bytes for Pubkey
    // 4 + 70 bytes for content string
    const MAX_SIZE: usize = 32 + (4 + 70);
}

#[account]
#[derive(Default)]
pub struct Solver {
    user: Pubkey,
    answered: Vec<Pubkey> // a set of the public keys of Questions
}

impl Solver {
    // 32 bytes for Pubkey
    // 4 + (32 * 10) for 10 questions
    const MAX_SIZE: usize = 32 + (4 + 10*32);
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Answer {
    content: String,
    correct: bool
}

impl Answer {
    pub const MAX_SIZE: usize = 4 + 20 + 1;
}


#[account]
#[derive(Default)]
pub struct QuestionCounter {
    count: u8,
    bump: u8
}
