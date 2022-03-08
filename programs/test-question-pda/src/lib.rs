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
#[instruction(question_content: String)] // https://docs.rs/anchor-lang/latest/anchor_lang/derive.Accounts.html
pub struct InitializeQuestion<'info> {
    #[account(
        init,          // hey anchor, initialize an account w/ these details (rent exempted)
        seeds = [&question_content.as_ref(), authority.key().as_ref()],
        bump,          // hey anchor find the canonical bump for me
        payer = payer, // the authority variable will hold the payer for this account creation
        space = 8      // all accounts require minimum 8 bytes
                + 32   // public key space
                + 560  // 560 bytes: 140 character count for content
                + 320  // 320 bytes: max 4 answer choices: max 20 character count for each
    )]
    pub question: Account<'info, Question>,
    #[account(mut)]
    pub authority: Signer<'info>, // this signer
    pub payer: AccountInfo<'info>, // this account will pay for the transaction
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct AnswerQuestion<'info> {
    #[account(mut)]
    pub solver: Account<'info, Solver>,
    pub payer: AccountInfo<'info>
}


#[derive(Accounts)]
pub struct InitializeSolver<'info> {
    #[account(
        init,
        payer = payer,
        space = 8
                + 1600 // 32 bytes per public key : 50 questions max answered
    )]
    pub solver: Account<'info, Solver>,
    #[account(mut)]
    pub authority: Signer<'info>,
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

#[account]
#[derive(Default)]
pub struct Solver {
    user: Pubkey,
    answered: Vec<Pubkey> // a set of the public keys of Questions
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Answer {
    content: String,
    correct: bool
}
