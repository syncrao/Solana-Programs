use anchor_lang::prelude::*;
use anchor_lang::solana_program::{self, system_instruction};

declare_id!("HGCRHxhRgiBF6ye81wqrzogafdjf82BnEU8nYqSqhQYR");

#[program]
pub mod user_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, vault_id: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.vault_id = vault_id;

        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(0);

        let vault_id_bytes = vault_id.to_le_bytes();

        let seeds: &[&[u8]] = &[
            b"vault_treasury",
            vault_id_bytes.as_ref(),
            &[ctx.bumps.vault_treasury],
        ];
        let signer = &[seeds];

        let ix = system_instruction::create_account(
            &ctx.accounts.user.key(),
            &ctx.accounts.vault_treasury.key(),
            lamports,
            0,
            &ctx.accounts.system_program.key(),
        );

        solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.vault_treasury.to_account_info(),
            ],
            signer,
        )?;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, _vault_id: u64, amount: u64) -> Result<()> {
        require!(amount > 0, CustomError::InvalidAmount);

        let ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.vault_treasury.key(),
            amount,
        );

        solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.vault_treasury.to_account_info(),
            ],
        )?;

        let user_vault = &mut ctx.accounts.user_vault;

        if user_vault.user == Pubkey::default() {
            user_vault.user = ctx.accounts.user.key();
            user_vault.vault = ctx.accounts.vault.key();
        }

        require!(
            user_vault.vault == ctx.accounts.vault.key(),
            CustomError::Unauthorized
        );

        user_vault.balance += amount;

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            amount,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, vault_id: u64, amount: u64) -> Result<()> {
        let user_vault = &mut ctx.accounts.user_vault;

        require!(amount > 0, CustomError::InvalidAmount);

        require!(
            user_vault.user == ctx.accounts.user.key(),
            CustomError::Unauthorized
        );

        require!(
            user_vault.vault == ctx.accounts.vault.key(),
            CustomError::Unauthorized
        );

        require!(user_vault.balance >= amount, CustomError::InsufficientFunds);

        let vault_id_bytes = vault_id.to_le_bytes();

        let seeds: &[&[u8]] = &[
            b"vault_treasury",
            vault_id_bytes.as_ref(),
            &[ctx.bumps.vault_treasury],
        ];
        let signer = &[seeds];

        let ix = system_instruction::transfer(
            &ctx.accounts.vault_treasury.key(),
            &ctx.accounts.user.key(),
            amount,
        );

        solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.vault_treasury.to_account_info(),
                ctx.accounts.user.to_account_info(),
            ],
            signer,
        )?;

        user_vault.balance -= amount;

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            amount,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(vault_id: u64)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        seeds = [b"vault", vault_id.to_le_bytes().as_ref()],
        bump,
        space = 8 + 8
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: Treasury PDA (stores SOL only)
    #[account(
        mut,
        seeds = [b"vault_treasury", vault_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault_treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(vault_id: u64)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK
    #[account(
        mut,
        seeds = [b"vault_treasury", vault_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault_treasury: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"user_vault", user.key().as_ref(), vault.key().as_ref()],
        bump,
        space = 8 + 32 + 32 + 8
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(vault_id: u64)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK
    #[account(
        mut,
        seeds = [b"vault_treasury", vault_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"user_vault", user.key().as_ref(), vault.key().as_ref()],
        bump
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub vault_id: u64,
}

#[account]
pub struct UserVault {
    pub user: Pubkey,
    pub vault: Pubkey,
    pub balance: u64,
}

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum CustomError {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Insufficient funds")]
    InsufficientFunds,

    #[msg("Invalid amount")]
    InvalidAmount,
}