import fs from "fs"
import spawn from "cross-spawn"
import { fileURLToPath } from "url"
import path from "path"
import { dirname } from "path"
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); // to use dirname we need fileURLToPath
const SLASH = path.sep;

const programAuthorityKeyFilename = './deploy/programauthority-keypair.json'; // authority keypair: funds the program
const programKeyfileName = 'target/deploy/test_question_pda-keypair.json'; // executable program keypair: on solana explorer for the program

// retrieve file contents for authority keypair
const programAuthorityKeypairFile = path.resolve(
    //   CWD         /          filenamne
    `${__dirname}${SLASH}${programAuthorityKeyFilename}`
);

// retrieve file contents for program keypair
const programKeypairFile = path.resolve(
    `${__dirname}${SLASH}${programKeyfileName}`
)

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// get Keypair object from file
function readKeyfile(keypairFile) {
    let kf = fs.readFileSync(keypairFile);
    let parsed = JSON.parse(kf.toString()); // get the object version of the JSON file
    kf = new Uint8Array(parsed); // get the Uint8Array from the JSON object
    const keypair = Keypair.fromSecretKey(kf)
    return keypair;
}

(async () => {

    let method; // deploy or upgrade
    let programAuthorityKeypair; // keypair that funds program creation
    let programId;      // programId for executable program
    let programKeypair; // keypair for executable program

    programKeypair = readKeyfile(programKeypairFile);
    programId = programKeypair.publicKey.toString();
    console.log({ publicKey: programKeypair.publicKey });

    if (!fs.existsSync(programAuthorityKeypairFile)) { // authority keypair doesn't exist on drive
        // create one here to use for deploy
        // node.js makes calls to the command line with spawn.sync
        spawn.sync("anchor", ["build"], { stdio: "inherit" }); // anchor build

        programAuthorityKeypair = new Keypair();

        // for(let i = 0; i < 5; i++) { // attempt to fund the authority account
        //     setTimeout(async () => {
        //         let signature = await connection.requestAirdrop(programAuthorityKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
        //         await connection.confirmTransaction(signature);
        //     }, 15000);
        // }

        //console.log("\n\n⚙ Created program keypair");
        console.log(`\n\n⚙ Saving keypair: ${programAuthorityKeypair.publicKey} `);

        fs.writeFileSync(
            programAuthorityKeypairFile,
            `[${Buffer.from(programAuthorityKeypair.secretKey.toString())}]`
        );
        console.log("program authority key: " + programAuthorityKeypair.publicKey);
        method = ["deploy"];

    }
    else { // authortity keypair exists on drive
        programAuthorityKeypair = readKeyfile(programAuthorityKeypairFile); // read the keypair from the drive
        method = ["deploy"];
        //     console.log(`\n\n⚙ Upgrading program.\n `);

        //     method = [
        //         "upgrade",
        //         `target/deploy/test_question_pda.so`,
        //         "--program-id",
        //         programId,
        //     ];
    }

    console.log({ method })
    spawn.sync("anchor", // anchor deploy|upgrade --provider.cluster devnet --provider.wallet programAuthorityKeypairFile
        [
            ...method,
            "--provider.cluster",
            "devnet",
            "--provider.wallet",
            `${programAuthorityKeypairFile}`
        ],
        { stdio: "inherit" }
    );

    // fs.copyFile(`./target/idl/${projectName}.json`)

})()