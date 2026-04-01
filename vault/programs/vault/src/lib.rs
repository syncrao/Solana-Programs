use anchor_lang::prelude::*;
use anchor_lang::solana_program::{self, system_instruction};

declare_id!("8YWfPSVaPUMoRwxaX3zJR4VrDjyX4Y8u3ReyKDCDpSDd");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, vault_id: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.user.key();
        vault.vault_id = vault_id;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, _vault_id: u64, amount: u64) -> Result<()> {
        require!(amount > 0, CustomError::InvalidAmount);

        let ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.vault.key(),
            amount,
        );

        solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            amount,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, vault_id: u64, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;

        require!(
            vault.owner == ctx.accounts.user.key(),
            CustomError::Unauthorized
        );

        require!(amount > 0, CustomError::InvalidAmount);

        require!(
            **ctx.accounts.vault.to_account_info().lamports.borrow() >= amount,
            CustomError::InsufficientFunds
        );

        let seeds = &[
            b"vault",
            ctx.accounts.user.key.as_ref(),
            &vault_id.to_le_bytes(),
            &[ctx.bumps.vault],
        ];

        let signer = &[&seeds[..]];

        let ix = system_instruction::transfer(
            &ctx.accounts.vault.key(),
            &ctx.accounts.user.key(),
            amount,
        );

        solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer,
        )?;

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
        seeds = [b"vault", user.key().as_ref(), &vault_id.to_le_bytes()],
        bump,
        space = 8 + 32 + 8 
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(vault_id: u64)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref(), &vault_id.to_le_bytes()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>, 
}

#[derive(Accounts)]
#[instruction(vault_id: u64)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref(), &vault_id.to_le_bytes()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>, 
}



#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub vault_id: u64,
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