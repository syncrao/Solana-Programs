# 🏦 User Vault Program (Solana + Anchor)

## 📌 Overview

This project implements a **multi-vault, multi-user deposit and withdrawal system** on Solana using the Anchor framework.

It demonstrates a **production-grade DeFi architecture** where:

* Multiple vaults can exist
* Multiple users can interact with any vault
* Each user maintains a separate balance per vault

---

## 🚀 Features

* ✅ Create multiple vaults (`vault_id`)
* ✅ Separate treasury PDA for secure SOL storage
* ✅ Multiple users can deposit into any vault
* ✅ Independent balances per `(user + vault)`
* ✅ Secure withdrawals using PDA signing
* ✅ Protection against over-withdraw
* ✅ Event emission for deposits & withdrawals

---

## 🧠 Architecture

### 📦 Accounts

#### 1. Vault (State Account)

Stores vault configuration.

```
seeds = ["vault", vault_id]
```

```rust
pub struct Vault {
    pub vault_id: u64,
}
```

---

#### 2. Vault Treasury (SOL Storage)

* PDA that holds SOL
* No data stored
* Created manually using `invoke_signed`

```
seeds = ["vault_treasury", vault_id]
```

---

#### 3. UserVault (Per User Balance)

Stores user balance for a specific vault.

```
seeds = ["user_vault", user, vault]
```

```rust
pub struct UserVault {
    pub user: Pubkey,
    pub vault: Pubkey,
    pub balance: u64,
}
```

---

## 🔁 Flow

### 🟢 Deposit

1. User sends SOL → Vault Treasury
2. UserVault account is created (if not exists)
3. Balance is updated

---

### 🔴 Withdraw

1. Validate:

   * User ownership
   * Vault match
   * Sufficient balance
2. Transfer SOL from treasury → user
3. Update balance

---

## 🔐 Security

### ✔️ PDA Validation

All critical accounts are validated using seeds:

* Vault
* Treasury
* UserVault

---

### ✔️ Signer Checks

Only the user can withdraw their funds.

---

### ✔️ Balance Checks

Prevents over-withdraw attacks.

---

### ✔️ Manual Treasury Control

Treasury uses:

```rust
UncheckedAccount<'info>
```

Reason:

* Stores only SOL (no data)
* Anchor cannot deserialize it
* Fully controlled via PDA + seeds

---

### ⚠️ Important Rule

> Never trust accounts passed by users — always validate with seeds.

---

## 🧪 Tests

The test suite includes:

* ✅ Multi-user deposits
* ✅ Multi-vault deposits
* ✅ Withdrawals across vaults
* ✅ Over-withdraw failure case

Run tests:

```bash
anchor test
```

---

## ⚙️ Build & Run

```bash
anchor clean
anchor build
anchor test
```

---

## 📁 Project Structure

```
programs/
  user_vault/
    src/lib.rs

tests/
  user_vault.ts
```

---

## 💡 Key Concepts Learned

* PDA (Program Derived Address)
* Account validation in Anchor
* SOL transfers using system program
* `invoke` vs `invoke_signed`
* Secure handling of `UncheckedAccount`
* Multi-tenant smart contract design

---



## 🧠 Summary

This project demonstrates how to build a **secure, scalable vault system** on Solana using:

* PDA-based architecture
* Separation of state and funds
* Strong validation patterns

It follows the same design principles used in real DeFi protocols.

---

## 👨‍💻 Author

**Shah Rukh Rao**.
