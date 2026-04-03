import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { UserVault } from "../target/types/user_vault";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { assert } from "chai";

describe("user_vault - multi vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.UserVault as Program<UserVault>;

  const vaultIds = [
    new anchor.BN(1),
    new anchor.BN(2),
  ];

  const users = [
    Keypair.generate(),
    Keypair.generate(),
    Keypair.generate(),
  ];

  const getVaultPda = (vaultId: anchor.BN) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
  };

  const getTreasuryPda = (vaultId: anchor.BN) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault_treasury"), vaultId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
  };

  const getUserVaultPda = (user: PublicKey, vault: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), user.toBuffer(), vault.toBuffer()],
      program.programId
    );
  };

  before(async () => {
    for (let user of users) {
      const sig = await provider.connection.requestAirdrop(
        user.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    console.log("\n--- Users Funded ---");
    users.forEach((u, i) =>
      console.log(`User${i + 1}: ${u.publicKey.toBase58()}`)
    );

    for (let v = 0; v < vaultIds.length; v++) {
      const vaultId = vaultIds[v];

      const [vaultPda] = getVaultPda(vaultId);
      const [treasuryPda] = getTreasuryPda(vaultId);

      await program.methods
        .initialize(vaultId)
        .accounts({
          vault: vaultPda,
          vaultTreasury: treasuryPda,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`\n--- Vault ${v + 1} Initialized ---`);
      console.log("Vault:", vaultPda.toBase58());
      console.log("Treasury:", treasuryPda.toBase58());
    }
  });

  it("Multi-user, multi-vault deposits", async () => {
    for (let v = 0; v < vaultIds.length; v++) {
      const vaultId = vaultIds[v];
      const [vaultPda] = getVaultPda(vaultId);
      const [treasuryPda] = getTreasuryPda(vaultId);

      console.log(`\n=== Deposits into Vault ${v + 1} ===`);

      for (let i = 0; i < users.length; i++) {
        const user = users[i];

        const amount = (i + 1) * 0.5 * LAMPORTS_PER_SOL;

        const [userVaultPda] = getUserVaultPda(
          user.publicKey,
          vaultPda
        );

        await program.methods
          .deposit(vaultId, new anchor.BN(amount))
          .accounts({
            vault: vaultPda,
            vaultTreasury: treasuryPda,
            userVault: userVaultPda,
            user: user.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        const account = await program.account.userVault.fetch(userVaultPda);

        console.log(
          `User${i + 1} deposited ${(amount / LAMPORTS_PER_SOL)} SOL | Balance: ${account.balance.toNumber() / LAMPORTS_PER_SOL}`
        );
      }
    }
  });

  it("Withdraw from different vaults", async () => {
    for (let v = 0; v < vaultIds.length; v++) {
      const vaultId = vaultIds[v];
      const [vaultPda] = getVaultPda(vaultId);
      const [treasuryPda] = getTreasuryPda(vaultId);

      console.log(`\n=== Withdraw from Vault ${v + 1} ===`);

      for (let i = 0; i < users.length; i++) {
        const user = users[i];

        const withdrawAmount = 0.3 * LAMPORTS_PER_SOL;

        const [userVaultPda] = getUserVaultPda(
          user.publicKey,
          vaultPda
        );

        await program.methods
          .withdraw(vaultId, new anchor.BN(withdrawAmount))
          .accounts({
            vault: vaultPda,
            vaultTreasury: treasuryPda,
            userVault: userVaultPda,
            user: user.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        const account = await program.account.userVault.fetch(userVaultPda);

        console.log(
          `User${i + 1} withdrew ${(withdrawAmount / LAMPORTS_PER_SOL)} SOL | Remaining: ${account.balance.toNumber() / LAMPORTS_PER_SOL}`
        );
      }
    }
  });

  it("Over-withdraw should fail per vault", async () => {
    const vaultId = vaultIds[0];
    const [vaultPda] = getVaultPda(vaultId);
    const [treasuryPda] = getTreasuryPda(vaultId);

    const user = users[0];
    const [userVaultPda] = getUserVaultPda(user.publicKey, vaultPda);

    try {
      await program.methods
        .withdraw(vaultId, new anchor.BN(100 * LAMPORTS_PER_SOL))
        .accounts({
          vault: vaultPda,
          vaultTreasury: treasuryPda,
          userVault: userVaultPda,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      assert.fail("Should fail");
    } catch (err: any) {
      console.log("\nExpected failure:", err.error?.errorMessage);
    }
  });
});
