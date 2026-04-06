import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { UsdcVault } from "../target/types/usdc_vault";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("usdc_vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.UsdcVault as Program<UsdcVault>;
  const connection = provider.connection;

  const user = provider.wallet;

  let usdcMint: anchor.web3.PublicKey;
  let userToken: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;
  let vaultBump: number;
  let vaultToken: anchor.web3.PublicKey;

  const DECIMALS = 6;
  const depositAmount = 1_000_000; // 1 USDC

  before(async () => {
    // 1. Create USDC mint
    usdcMint = await createMint(
      connection,
      user.payer,
      user.publicKey,
      null,
      DECIMALS
    );

    // 2. Create user ATA
    const userAta = await getOrCreateAssociatedTokenAccount(
      connection,
      user.payer,
      usdcMint,
      user.publicKey
    );
    userToken = userAta.address;

    // 3. Mint tokens to user
    await mintTo(
      connection,
      user.payer,
      usdcMint,
      userToken,
      user.publicKey,
      2_000_000 // 2 USDC
    );

    // 4. Derive vault PDA
    [vaultPda, vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.publicKey.toBuffer()],
      program.programId
    );

    // 5. Create vault token ATA (owned by PDA)
    const vaultAta = await getOrCreateAssociatedTokenAccount(
      connection,
      user.payer,
      usdcMint,
      vaultPda,
      true // allow PDA owner
    );

    vaultToken = vaultAta.address;
  });

  it("Deposit USDC", async () => {
    await program.methods
      .deposit(new anchor.BN(depositAmount))
      .accounts({
        user: user.publicKey,
        userToken,
        vault: vaultPda,
        vaultToken,
        usdcMint,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const userAcc = await getAccount(connection, userToken);
    const vaultAcc = await getAccount(connection, vaultToken);

    assert.equal(Number(userAcc.amount), 1_000_000); // 2 - 1
    assert.equal(Number(vaultAcc.amount), 1_000_000);
  });

  it("Withdraw USDC", async () => {
    await program.methods
      .withdraw(new anchor.BN(depositAmount))
      .accounts({
        user: user.publicKey,
        userToken,
        vault: vaultPda,
        vaultToken,
        usdcMint,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const userAcc = await getAccount(connection, userToken);
    console.log(userAcc.amount)
    const vaultAcc = await getAccount(connection, vaultToken);

    assert.equal(Number(userAcc.amount), 2_000_000); // back to original
    assert.equal(Number(vaultAcc.amount), 0);
  });
});