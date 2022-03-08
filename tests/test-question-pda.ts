import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';

describe('test-question-pda', () => {

  // Configure the client to use the local cluster.

  // const program = anchor.workspace.TestPda as Program<TestPda>;
  // Configure the client to use the current cluster.
  const provider = anchor.Provider.local(); // The network and wallet context used to send transactions paid for and signed by the provider.
  anchor.setProvider(provider);
  
  const program = anchor.workspace.TestQuestionPda;
 const programId = new anchor.web3.PublicKey("6uWRze9WV6LHM4jQUGCxxb2jjmrUcYqq6wWPWVdEaogg");

 const asker = anchor.web3.Keypair.generate(); // question owner
 const solver = anchor.web3.Keypair.generate();

 let questionAccount;
 let solverAccount;

 it('Initialize Question', async () => {
   console.log("\n\n⚙⚙ Initializing Question");

   // get parameters
   const questionContent = "What is 2 + 2?"; // question content

   const answerA = new Answer('7', false);
   const answerB = new Answer('8', false);
   const answerC = new Answer('4', true);
   const answerD = new Answer('3', false);
   const answers = [answerA, answerB, answerC, answerD]; // answers array - these don't need to be serialized, anchor does it for us :)
   let questionAccountBump;
 
   [questionAccount, questionAccountBump] = await anchor.web3.PublicKey.findProgramAddress(
     [Buffer.from(questionContent), asker.publicKey.toBuffer()],
     programId
   );

   // init question account
   console.log(questionAccount.toBase58());
   const tx = await program.methods.initializeQuestion(questionContent, answers)
     .accounts({
       question: questionAccount.toBase58(),
       authority: asker.publicKey,
       payer: program.provider.wallet.publicKey,
       systemProgram: anchor.web3.SystemProgram.programId
     }).signers(asker).rpc();

     console.log(tx);

   // fetch question account
   let testQuestionAccount = await program.account.question.fetch(
     questionAccount
   );
   console.log("question account content: " + testQuestionAccount.content);
 });
});


class Answer {
  content: string;
  correct: boolean;

  constructor(content: string, correct: boolean) {
    this.content = content;
    this.correct = correct;
  }
}