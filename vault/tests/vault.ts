import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { expect } from "chai";

describe("vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Vault as Program<Vault>;
  const user = provider.wallet;

  let vaultPda: anchor.web3.PublicKey;
  let vaultPda2: anchor.web3.PublicKey;

  // ---------------- HELPERS ----------------

  const toSOL = (lamports: number) =>
    lamports / anchor.web3.LAMPORTS_PER_SOL;

  const logBalances = async (
    label: string,
    pubkeys: anchor.web3.PublicKey[]
  ) => {
    console.log(`\n🔍 ${label}`);
    for (const key of pubkeys) {
      const bal = await provider.connection.getBalance(key);
      console.log(
        `   ${key.toBase58()} => ${bal} lamports (${toSOL(bal)} SOL)`
      );
    }
  };

  // ---------------- SETUP ----------------

  before(async () => {
    [vaultPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("vault"),
        user.publicKey.toBuffer(),
        new anchor.BN(1).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [vaultPda2] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("vault"),
        user.publicKey.toBuffer(),
        new anchor.BN(2).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    console.log("\n📌 USER:", user.publicKey.toBase58());
    console.log("📌 VAULT1:", vaultPda.toBase58());
    console.log("📌 VAULT2:", vaultPda2.toBase58());
  });

  // ---------------- INITIALIZE ----------------

  it("Initialize vault1", async () => {
    await program.methods
      .initialize(new anchor.BN(1))
      .accounts({
        vault: vaultPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const acc = await program.account.vault.fetch(vaultPda);

    console.log("Vault1 owner:", acc.owner.toBase58());
    console.log("Vault1 id:", acc.vaultId.toString());

    expect(acc.owner.toString()).to.equal(user.publicKey.toString());
    expect(acc.vaultId.toNumber()).to.equal(1);
  });

  it("Initialize vault2", async () => {
    await program.methods
      .initialize(new anchor.BN(2))
      .accounts({
        vault: vaultPda2,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const acc = await program.account.vault.fetch(vaultPda2);

    expect(acc.vaultId.toNumber()).to.equal(2);
  });

  // ---------------- DEPOSIT ----------------

  it("Deposit into vault1", async () => {
    const amount = new anchor.BN(1_000_000);

    await logBalances("Before Deposit", [user.publicKey, vaultPda]);

    await program.methods
      .deposit(new anchor.BN(1), amount)
      .accounts({
        vault: vaultPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await logBalances("After Deposit", [user.publicKey, vaultPda]);
  });

  it("Fail: Deposit zero amount", async () => {
    try {
      await program.methods
        .deposit(new anchor.BN(1), new anchor.BN(0))
        .accounts({
          vault: vaultPda,
          user: user.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should fail");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("InvalidAmount");
    }
  });

  it("Multiple deposits accumulate", async () => {
    const amount = new anchor.BN(500_000);

    const before = await provider.connection.getBalance(vaultPda);

    await program.methods
      .deposit(new anchor.BN(1), amount)
      .accounts({
        vault: vaultPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .deposit(new anchor.BN(1), amount)
      .accounts({
        vault: vaultPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const after = await provider.connection.getBalance(vaultPda);

    expect(after - before).to.equal(amount.toNumber() * 2);
  });

  // ---------------- WITHDRAW ----------------

  it("Withdraw from vault1", async () => {
    const amount = new anchor.BN(500_000);

    const beforeUser = await provider.connection.getBalance(user.publicKey);

    await logBalances("Before Withdraw", [user.publicKey, vaultPda]);

    await program.methods
      .withdraw(new anchor.BN(1), amount)
      .accounts({
        vault: vaultPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await logBalances("After Withdraw", [user.publicKey, vaultPda]);

    const afterUser = await provider.connection.getBalance(user.publicKey);

    expect(afterUser).to.be.greaterThan(beforeUser);
  });

  it("Fail: Withdraw zero amount", async () => {
    try {
      await program.methods
        .withdraw(new anchor.BN(1), new anchor.BN(0))
        .accounts({
          vault: vaultPda,
          user: user.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should fail");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("InvalidAmount");
    }
  });

  it("Fail: Withdraw more than balance", async () => {
    try {
      await program.methods
        .withdraw(new anchor.BN(1), new anchor.BN(9999999999))
        .accounts({
          vault: vaultPda,
          user: user.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should fail");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("InsufficientFunds");
    }
  });

  it("Fail: Unauthorized withdraw", async () => {
    const attacker = anchor.web3.Keypair.generate();

    const sig = await provider.connection.requestAirdrop(
      attacker.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .withdraw(new anchor.BN(1), new anchor.BN(1000))
        .accounts({
          vault: vaultPda,
          user: attacker.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();

      expect.fail("Should fail");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("Unauthorized");
    }
  });

  it("Fail: Wrong vault_id", async () => {
    try {
      await program.methods
        .withdraw(new anchor.BN(999), new anchor.BN(1000))
        .accounts({
          vault: vaultPda,
          user: user.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should fail");
    } catch (err) {
      expect(err).to.exist;
    }
  });

  it("Fail: Deposit without system program", async () => {
    try {
      await program.methods
        .deposit(new anchor.BN(1), new anchor.BN(1000))
        .accounts({
          vault: vaultPda,
          user: user.publicKey,
        })
        .rpc();

      expect.fail("Should fail");
    } catch (err) {
      expect(err).to.exist;
    }
  });
});