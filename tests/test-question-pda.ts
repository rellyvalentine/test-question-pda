const assert = require("assert");
import * as anchor from '@project-serum/anchor';
import { ParsedInstruction } from '@solana/web3.js'
import { Program } from '@project-serum/anchor';
import { publicKey } from '@project-serum/anchor/dist/cjs/utils';

describe('test-question-pda', () => {

  // Configure the client to use the local cluster.

  // const program = anchor.workspace.TestPda as Program<TestPda>;
  // Configure the client to use the current cluster.
  const provider = anchor.Provider.local(); // The network and wallet context used to send transactions paid for and signed by the provider.
  anchor.setProvider(provider);

  let connection = new anchor.web3.Connection("http://localhost:8899", 'confirmed');

  const program = anchor.workspace.TestQuestionPda;
  const programId = new anchor.web3.PublicKey("6uWRze9WV6LHM4jQUGCxxb2jjmrUcYqq6wWPWVdEaogg");

  const asker = anchor.web3.Keypair.generate(); // question owner
  const solver = anchor.web3.Keypair.generate();

  let questionAccount;
  let solverAccount;
  let questionCounter;

  before(async () => {
    //console.log(provider.connection);
    let questionCountBump;
    [questionCounter, questionCountBump] = await anchor.web3.PublicKey.findProgramAddress(
      [anchor.utils.bytes.utf8.encode("question-count")], programId
    );
  });

  it('Initialize Question Counter', async () => {
    console.log("\n\n⚙⚙ Initializing Question Counter");
    const tx = await program.methods.initializeCounter()
      .accounts({
        counter: questionCounter,
        payer: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      }).rpc();

    console.log(tx);
    console.log(await program.account.questionCounter.fetch(questionCounter));
    assert.equal(0, (await program.account.questionCounter.fetch(questionCounter)).count);
  });

  it('Initialize Question', async () => {
    console.log("\n\n⚙⚙ Initializing Question");

    // get parameters
    const questionContent = "What is 2 + 2?"; // question content

    const answerA = new Answer('7', false);
    const answerB = new Answer('8', false);
    const answerC = new Answer('4', true);
    const answerD = new Answer('3', false);
    const answers = [answerA, answerB, answerC, answerD]; // answers array - these don't need to be serialized, anchor does it for us :)

    // get current question count
    let questionCount = (await program.account.questionCounter.fetch(questionCounter)).count;
    let questionAccountBump;

    console.log(questionCount);

    [questionAccount, questionAccountBump] = await anchor.web3.PublicKey.findProgramAddress(
      [new anchor.BN(questionCount).toBuffer(), asker.publicKey.toBuffer()],
      programId
    );

    // init question account
    console.log(questionAccount.toBase58());
    // const tx = await program.rpc.initializeQuestion(questionContent, answers, {
    //   accounts: {
    //     question: questionAccount,
    //     questionCounter: questionCounter,
    //     authority: asker.publicKey,
    //     payer: program.provider.wallet.publicKey,
    //     systemProgram: anchor.web3.SystemProgram.programId
    //   },
    //   signers: [asker]
    // })
    const tx = await program.methods.initializeQuestion(questionContent, answers)
      .accounts({
        question: questionAccount,
        questionCounter: questionCounter,
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

    console.log("\n⚙⚙ Incrementing Question Count");
    const incTx = await program.methods.incrementCounter()
      .accounts({
        counter: questionCounter,
        authority: questionAccount
      }).rpc();

      console.log(incTx);
      console.log(await program.account.questionCounter.fetch(questionCounter));
      assert.equal(1, (await program.account.questionCounter.fetch(questionCounter)).count);

  });
  it('Get Questions', async() => {

    // 1) Find all Tx for this PublicKey
		// 2) Filter to Tx that have programId == our ProgramId
		// 3) Get addresses (pubkeys) for that Tx, separate them into A) Payer, Program, and BlogAccount
		// 4) List the different accounts

    // 1 Find all Tx for PublicKey
    let getTransactionForAddress = async(publicKey, limit = 1000) => {
      // get confirmed signature info for transactions involving this address
      const confirmedSignatureInfo = await connection.getSignaturesForAddress(
        new anchor.web3.PublicKey(publicKey), {limit}
      );

      // extract the transaction signatures from the confirmed signature info
      const transactionSignatures = confirmedSignatureInfo.map((signInfo) => signInfo.signature);

      // get the parsed transactions from the signatures
      const parsedConfirmedTransactions = await connection.getParsedTransactions(transactionSignatures);

      return parsedConfirmedTransactions;
    }
    const parsedConfirmedTransactions = await getTransactionForAddress(programId);

    // 2. filter the tx
    let questionAccounts = [];
    parsedConfirmedTransactions.forEach((tx) => {
      let instr = tx?.meta?.innerInstructions[0]?.instructions[0]?.parsed;
      if(!instr || !(instr.type === 'createAccount' && instr.info.owner === programId.toString())) {
        return;
      }
      questionAccounts.push(tx.meta.innerInstructions[0].instructions[0].parsed.info.newAccount);
      return;
    });
  
    console.log(questionAccounts);

  })
});


class Answer {
  content: string;
  correct: boolean;

  constructor(content: string, correct: boolean) {
    this.content = content;
    this.correct = correct;
  }
}