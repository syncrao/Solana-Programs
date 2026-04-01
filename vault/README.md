# 🏦 Solana Vault Program (Anchor)

A simple and secure **Vault program on Solana** built using the Anchor framework.
This project demonstrates **PDA-based account management**, **SOL deposits**, and **secure withdrawals using CPI (`invoke_signed`)**.

---

## 🚀 Features

* ✅ Create vaults using **Program Derived Addresses (PDA)**
* ✅ Deposit SOL into vault
* ✅ Secure withdrawal using **PDA signing**
* ✅ Ownership validation
* ✅ Balance safety checks
* ✅ Event emission for deposit & withdraw
* ✅ Comprehensive test coverage

---

## 🧠 Concepts Covered

* Anchor framework basics
* PDA (Program Derived Address)
* CPI (Cross Program Invocation)
* `invoke` vs `invoke_signed`
* Lamports handling
* Account constraints & validation
* Writing secure Solana programs

---

## 📦 Program Instructions

### 1️⃣ Initialize

Creates a vault account using PDA.

* Stores:

  * `owner`
  * `vault_id`

```rust
initialize(vault_id: u64)
```

---

### 2️⃣ Deposit

Transfers SOL from user → vault using **System Program CPI**

```rust
deposit(vault_id: u64, amount: u64)
```

✔ Requires:

* user signer
* system program

---

### 3️⃣ Withdraw

Transfers SOL from vault → user using **PDA signing (`invoke_signed`)**

```rust
withdraw(vault_id: u64, amount: u64)
```

✔ Validations:

* Only owner can withdraw
* Amount must be > 0
* Vault must have sufficient balance

---

## 🏗️ Account Structure

```rust
pub struct Vault {
    pub owner: Pubkey,
    pub vault_id: u64,
}
```

---

## 🔐 Security Features

* Ownership check (`require!`)
* PDA seed validation
* Safe SOL transfers via CPI
* No direct unsafe lamport manipulation
* Prevents:

  * Unauthorized withdrawals ❌
  * Invalid amounts ❌
  * Insufficient balance ❌

---

## 🧪 Test Suite

The project includes **extensive tests using Anchor + Mocha**.

### ✅ Successful Tests

* Initialize vault
* Deposit SOL
* Multiple deposits accumulate
* Withdraw SOL
* Balance updates correctly

---

### ❌ Failure / Edge Case Tests

* Withdraw more than balance
* Unauthorized withdraw attempt
* Invalid vault_id (PDA mismatch)
* Deposit without required accounts
* Deposit zero amount
* Withdraw zero amount

---

## 🔍 Debugging & Logs

Tests include detailed logs:

* Wallet & Vault addresses
* Before/After balances
* SOL (lamports → SOL conversion)
* Attack simulation logs

Example:

```
🔍 Before Deposit
User => 2 SOL
Vault => 0 SOL

🔍 After Deposit
User => 1.999 SOL
Vault => 0.001 SOL
```

---

## 🛠️ Tech Stack

* 🦀 Rust (Solana program)
* ⚓ Anchor Framework
* 🟦 TypeScript (tests)
* 🧪 Mocha + Chai

---

## ▶️ Running the Project

### 1. Build

```bash
anchor build
```

### 2. Test

```bash
anchor test
```

---

## 📚 Learning Outcome

By completing this project, you understand:

* How Solana handles native SOL transfers
* Why CPI requires explicit accounts
* How PDAs sign transactions securely
* How to write production-safe smart contracts

---

## 🚀 Future Improvements

* SPL Token (USDC) vault support
* Multi-user vault system
* Interest / staking logic
* Frontend (React + wallet adapter)

---

## 👨‍💻 Author

**Shah Rukh Rao** 
