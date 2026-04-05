use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    hash::hashv,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    system_program,
    sysvar::Sysvar,
};

const ROOM_SEED_PREFIX: &[u8] = b"room";
const VAULT_SEED_PREFIX: &[u8] = b"vault";
const RESERVE_SEED_PREFIX: &[u8] = b"reserve";
const COMMIT_DOMAIN_V1: &[u8] = b"FAULTLINE_COMMIT_V1";
const COMMIT_DOMAIN_V2: &[u8] = b"FAULTLINE_COMMIT_V2";
const EVENT_SCHEMA_VERSION: u8 = 1;
const MAX_PLAYERS: usize = 12;
const ZONE_COUNT: usize = 5;
const MAX_WINNERS: usize = 4;
const RESERVE_FEE_BPS: u64 = 200;
const TREASURY_PUBKEY: Pubkey = pubkey!("12dZBGCWRKtLnZVSc1Nxa2uUnvrbjCwpkkbbwHiybHoQ");
const EMPTY_KEY: [u8; 32] = [0u8; 32];

const ROOM_STATE_SIZE: usize = 1339;
const RESERVE_STATE_SIZE: usize = 76;

const ROOM_OPEN: u8 = 0;
const ROOM_COMMIT: u8 = 1;
const ROOM_REVEAL: u8 = 2;
const ROOM_RESOLVED: u8 = 3;
const ROOM_CANCELLED: u8 = 4;
const ROOM_EMERGENCY: u8 = 5;

const PLAYER_JOINED: u8 = 1;
const PLAYER_COMMITTED: u8 = 2;
const PLAYER_REVEALED: u8 = 3;
const PLAYER_COMMIT_TIMED_OUT: u8 = 4;
const PLAYER_REVEAL_TIMED_OUT: u8 = 5;

const RISK_CALM: u8 = 0;
const RISK_EDGE: u8 = 1;
const RISK_KNIFE: u8 = 2;

#[derive(Clone, Copy, Debug)]
enum FaultlineError {
    InvalidInstruction = 6000,
    MissingSignature = 6001,
    InvalidPda = 6002,
    InvalidRoomState = 6004,
    RoomAlreadyInitialized = 6005,
    InvalidRoomStatus = 6006,
    JoinClosed = 6007,
    DuplicateJoin = 6008,
    PlayerNotFound = 6009,
    InvalidPlayerState = 6010,
    ForecastInvalid = 6011,
    InvalidZone = 6012,
    InvalidRiskBand = 6013,
    CommitHashMismatch = 6014,
    CommitPhaseNotReady = 6015,
    RevealPhaseNotReady = 6016,
    ResolveNotReady = 6017,
    NothingToClaim = 6018,
    AlreadyClaimed = 6019,
    InsufficientPlayers = 6020,
    ArithmeticOverflow = 6021,
    EmergencyDisabled = 6022,
    InvalidSystemProgram = 6023,
}

impl From<FaultlineError> for ProgramError {
    fn from(value: FaultlineError) -> Self {
        ProgramError::Custom(value as u32)
    }
}

trait FaultlineCodec: Sized {
    fn decode(input: &[u8]) -> Result<Self, ProgramError>;
    fn encode(&self, output: &mut [u8]) -> ProgramResult;
}

#[derive(Clone)]
pub struct RoomState {
    pub version: u8,
    pub room_bump: u8,
    pub vault_bump: u8,
    pub status: u8,
    pub zone_count: u8,
    pub min_players: u8,
    pub max_players: u8,
    pub player_count: u8,
    pub committed_count: u8,
    pub revealed_count: u8,
    pub active_count: u8,
    pub winner_count: u8,
    pub preset_id: u8,
    pub flags: u8,
    pub stake_lamports: u64,
    pub total_staked_lamports: u64,
    pub distributable_lamports: u64,
    pub reserve_fee_lamports: u64,
    pub slashed_to_reserve_lamports: u64,
    pub created_slot: u64,
    pub join_deadline_slot: u64,
    pub join_duration_slots: u64,
    pub commit_duration_slots: u64,
    pub commit_deadline_slot: u64,
    pub reveal_duration_slots: u64,
    pub reveal_deadline_slot: u64,
    pub resolve_slot: u64,
    pub creator: [u8; 32],
    pub vault: [u8; 32],
    pub reserve: [u8; 32],
    pub treasury: [u8; 32],
    pub room_seed: [u8; 32],
    pub final_histogram: [u8; 5],
    pub winner_indices: [u8; 4],
    pub payout_bps: [u16; 4],
    pub player_keys: [[u8; 32]; MAX_PLAYERS],
    pub player_status: [u8; MAX_PLAYERS],
    pub player_claimed: [u8; MAX_PLAYERS],
    pub player_zone: [u8; MAX_PLAYERS],
    pub player_risk: [u8; MAX_PLAYERS],
    pub player_commit_hashes: [[u8; 32]; MAX_PLAYERS],
    pub player_forecasts: [[u8; 5]; MAX_PLAYERS],
    pub player_errors: [u16; MAX_PLAYERS],
    pub player_scores_bps: [u32; MAX_PLAYERS],
    pub player_rewards_lamports: [u64; MAX_PLAYERS],
}

impl RoomState {
    pub fn new(
        room_bump: u8,
        vault_bump: u8,
        creator: &Pubkey,
        vault: &Pubkey,
        reserve: &Pubkey,
        room_seed: [u8; 32],
        stake_lamports: u64,
        min_players: u8,
        max_players: u8,
        preset_id: u8,
        created_slot: u64,
        join_deadline_slot: u64,
        join_duration_slots: u64,
        commit_duration_slots: u64,
        reveal_duration_slots: u64,
    ) -> Self {
        let (winner_count, payout_bps) = get_payout_ladder(max_players as usize);
        Self {
            version: 1,
            room_bump,
            vault_bump,
            status: ROOM_OPEN,
            zone_count: ZONE_COUNT as u8,
            min_players,
            max_players,
            player_count: 0,
            committed_count: 0,
            revealed_count: 0,
            active_count: 0,
            winner_count,
            preset_id,
            flags: 0,
            stake_lamports,
            total_staked_lamports: 0,
            distributable_lamports: 0,
            reserve_fee_lamports: 0,
            slashed_to_reserve_lamports: 0,
            created_slot,
            join_deadline_slot,
            join_duration_slots,
            commit_duration_slots,
            commit_deadline_slot: 0,
            reveal_duration_slots,
            reveal_deadline_slot: 0,
            resolve_slot: 0,
            creator: creator.to_bytes(),
            vault: vault.to_bytes(),
            reserve: reserve.to_bytes(),
            treasury: TREASURY_PUBKEY.to_bytes(),
            room_seed,
            final_histogram: [0; 5],
            winner_indices: [u8::MAX; 4],
            payout_bps,
            player_keys: [EMPTY_KEY; MAX_PLAYERS],
            player_status: [0; MAX_PLAYERS],
            player_claimed: [0; MAX_PLAYERS],
            player_zone: [0; MAX_PLAYERS],
            player_risk: [0; MAX_PLAYERS],
            player_commit_hashes: [[0u8; 32]; MAX_PLAYERS],
            player_forecasts: [[0u8; 5]; MAX_PLAYERS],
            player_errors: [0; MAX_PLAYERS],
            player_scores_bps: [0; MAX_PLAYERS],
            player_rewards_lamports: [0; MAX_PLAYERS],
        }
    }
}

#[derive(Clone)]
pub struct ReserveState {
    pub version: u8,
    pub bump: u8,
    pub paused: bool,
    pub free_access_enabled: bool,
    pub total_collected_lamports: u64,
    pub total_distributed_lamports: u64,
    pub anti_grief_collected_lamports: u64,
    pub reveal_timeout_collected_lamports: u64,
    pub free_access_distributed_lamports: u64,
    pub authority: [u8; 32],
}

impl FaultlineCodec for RoomState {
    fn decode(input: &[u8]) -> Result<Self, ProgramError> {
        if input.len() < ROOM_STATE_SIZE {
            return Err(FaultlineError::InvalidRoomState.into());
        }

        let mut offset = 0usize;
        let version = read_u8(input, &mut offset)?;
        let room_bump = read_u8(input, &mut offset)?;
        let vault_bump = read_u8(input, &mut offset)?;
        let status = read_u8(input, &mut offset)?;
        let zone_count = read_u8(input, &mut offset)?;
        let min_players = read_u8(input, &mut offset)?;
        let max_players = read_u8(input, &mut offset)?;
        let player_count = read_u8(input, &mut offset)?;
        let committed_count = read_u8(input, &mut offset)?;
        let revealed_count = read_u8(input, &mut offset)?;
        let active_count = read_u8(input, &mut offset)?;
        let winner_count = read_u8(input, &mut offset)?;
        let preset_id = read_u8(input, &mut offset)?;
        let flags = read_u8(input, &mut offset)?;
        let stake_lamports = read_u64(input, &mut offset)?;
        let total_staked_lamports = read_u64(input, &mut offset)?;
        let distributable_lamports = read_u64(input, &mut offset)?;
        let reserve_fee_lamports = read_u64(input, &mut offset)?;
        let slashed_to_reserve_lamports = read_u64(input, &mut offset)?;
        let created_slot = read_u64(input, &mut offset)?;
        let join_deadline_slot = read_u64(input, &mut offset)?;
        let join_duration_slots = read_u64(input, &mut offset)?;
        let commit_duration_slots = read_u64(input, &mut offset)?;
        let commit_deadline_slot = read_u64(input, &mut offset)?;
        let reveal_duration_slots = read_u64(input, &mut offset)?;
        let reveal_deadline_slot = read_u64(input, &mut offset)?;
        let resolve_slot = read_u64(input, &mut offset)?;
        let creator = read_array::<32>(input, &mut offset)?;
        let vault = read_array::<32>(input, &mut offset)?;
        let reserve = read_array::<32>(input, &mut offset)?;
        let treasury = read_array::<32>(input, &mut offset)?;
        let room_seed = read_array::<32>(input, &mut offset)?;
        let final_histogram = read_array::<5>(input, &mut offset)?;
        let winner_indices = read_array::<4>(input, &mut offset)?;

        let mut payout_bps = [0u16; 4];
        for item in payout_bps.iter_mut() {
            *item = read_u16(input, &mut offset)?;
        }

        let mut player_keys = [[0u8; 32]; MAX_PLAYERS];
        for item in player_keys.iter_mut() {
            *item = read_array::<32>(input, &mut offset)?;
        }

        let mut player_status = [0u8; MAX_PLAYERS];
        for item in player_status.iter_mut() {
            *item = read_u8(input, &mut offset)?;
        }

        let mut player_claimed = [0u8; MAX_PLAYERS];
        for item in player_claimed.iter_mut() {
            *item = read_u8(input, &mut offset)?;
        }

        let mut player_zone = [0u8; MAX_PLAYERS];
        for item in player_zone.iter_mut() {
            *item = read_u8(input, &mut offset)?;
        }

        let mut player_risk = [0u8; MAX_PLAYERS];
        for item in player_risk.iter_mut() {
            *item = read_u8(input, &mut offset)?;
        }

        let mut player_commit_hashes = [[0u8; 32]; MAX_PLAYERS];
        for item in player_commit_hashes.iter_mut() {
            *item = read_array::<32>(input, &mut offset)?;
        }

        let mut player_forecasts = [[0u8; 5]; MAX_PLAYERS];
        for item in player_forecasts.iter_mut() {
            *item = read_array::<5>(input, &mut offset)?;
        }

        let mut player_errors = [0u16; MAX_PLAYERS];
        for item in player_errors.iter_mut() {
            *item = read_u16(input, &mut offset)?;
        }

        let mut player_scores_bps = [0u32; MAX_PLAYERS];
        for item in player_scores_bps.iter_mut() {
            *item = read_u32(input, &mut offset)?;
        }

        let mut player_rewards_lamports = [0u64; MAX_PLAYERS];
        for item in player_rewards_lamports.iter_mut() {
            *item = read_u64(input, &mut offset)?;
        }

        Ok(Self {
            version,
            room_bump,
            vault_bump,
            status,
            zone_count,
            min_players,
            max_players,
            player_count,
            committed_count,
            revealed_count,
            active_count,
            winner_count,
            preset_id,
            flags,
            stake_lamports,
            total_staked_lamports,
            distributable_lamports,
            reserve_fee_lamports,
            slashed_to_reserve_lamports,
            created_slot,
            join_deadline_slot,
            join_duration_slots,
            commit_duration_slots,
            commit_deadline_slot,
            reveal_duration_slots,
            reveal_deadline_slot,
            resolve_slot,
            creator,
            vault,
            reserve,
            treasury,
            room_seed,
            final_histogram,
            winner_indices,
            payout_bps,
            player_keys,
            player_status,
            player_claimed,
            player_zone,
            player_risk,
            player_commit_hashes,
            player_forecasts,
            player_errors,
            player_scores_bps,
            player_rewards_lamports,
        })
    }

    fn encode(&self, output: &mut [u8]) -> ProgramResult {
        if output.len() < ROOM_STATE_SIZE {
            return Err(FaultlineError::InvalidRoomState.into());
        }
        output.fill(0);

        let mut offset = 0usize;
        write_u8(output, &mut offset, self.version)?;
        write_u8(output, &mut offset, self.room_bump)?;
        write_u8(output, &mut offset, self.vault_bump)?;
        write_u8(output, &mut offset, self.status)?;
        write_u8(output, &mut offset, self.zone_count)?;
        write_u8(output, &mut offset, self.min_players)?;
        write_u8(output, &mut offset, self.max_players)?;
        write_u8(output, &mut offset, self.player_count)?;
        write_u8(output, &mut offset, self.committed_count)?;
        write_u8(output, &mut offset, self.revealed_count)?;
        write_u8(output, &mut offset, self.active_count)?;
        write_u8(output, &mut offset, self.winner_count)?;
        write_u8(output, &mut offset, self.preset_id)?;
        write_u8(output, &mut offset, self.flags)?;
        write_u64(output, &mut offset, self.stake_lamports)?;
        write_u64(output, &mut offset, self.total_staked_lamports)?;
        write_u64(output, &mut offset, self.distributable_lamports)?;
        write_u64(output, &mut offset, self.reserve_fee_lamports)?;
        write_u64(output, &mut offset, self.slashed_to_reserve_lamports)?;
        write_u64(output, &mut offset, self.created_slot)?;
        write_u64(output, &mut offset, self.join_deadline_slot)?;
        write_u64(output, &mut offset, self.join_duration_slots)?;
        write_u64(output, &mut offset, self.commit_duration_slots)?;
        write_u64(output, &mut offset, self.commit_deadline_slot)?;
        write_u64(output, &mut offset, self.reveal_duration_slots)?;
        write_u64(output, &mut offset, self.reveal_deadline_slot)?;
        write_u64(output, &mut offset, self.resolve_slot)?;
        write_bytes(output, &mut offset, &self.creator)?;
        write_bytes(output, &mut offset, &self.vault)?;
        write_bytes(output, &mut offset, &self.reserve)?;
        write_bytes(output, &mut offset, &self.treasury)?;
        write_bytes(output, &mut offset, &self.room_seed)?;
        write_bytes(output, &mut offset, &self.final_histogram)?;
        write_bytes(output, &mut offset, &self.winner_indices)?;
        for item in self.payout_bps.iter() {
            write_u16(output, &mut offset, *item)?;
        }
        for item in self.player_keys.iter() {
            write_bytes(output, &mut offset, item)?;
        }
        for item in self.player_status.iter() {
            write_u8(output, &mut offset, *item)?;
        }
        for item in self.player_claimed.iter() {
            write_u8(output, &mut offset, *item)?;
        }
        for item in self.player_zone.iter() {
            write_u8(output, &mut offset, *item)?;
        }
        for item in self.player_risk.iter() {
            write_u8(output, &mut offset, *item)?;
        }
        for item in self.player_commit_hashes.iter() {
            write_bytes(output, &mut offset, item)?;
        }
        for item in self.player_forecasts.iter() {
            write_bytes(output, &mut offset, item)?;
        }
        for item in self.player_errors.iter() {
            write_u16(output, &mut offset, *item)?;
        }
        for item in self.player_scores_bps.iter() {
            write_u32(output, &mut offset, *item)?;
        }
        for item in self.player_rewards_lamports.iter() {
            write_u64(output, &mut offset, *item)?;
        }
        Ok(())
    }
}

impl FaultlineCodec for ReserveState {
    fn decode(input: &[u8]) -> Result<Self, ProgramError> {
        if input.len() < RESERVE_STATE_SIZE {
            return Err(FaultlineError::InvalidRoomState.into());
        }

        let mut offset = 0usize;
        Ok(Self {
            version: read_u8(input, &mut offset)?,
            bump: read_u8(input, &mut offset)?,
            paused: read_bool(input, &mut offset)?,
            free_access_enabled: read_bool(input, &mut offset)?,
            total_collected_lamports: read_u64(input, &mut offset)?,
            total_distributed_lamports: read_u64(input, &mut offset)?,
            anti_grief_collected_lamports: read_u64(input, &mut offset)?,
            reveal_timeout_collected_lamports: read_u64(input, &mut offset)?,
            free_access_distributed_lamports: read_u64(input, &mut offset)?,
            authority: read_array::<32>(input, &mut offset)?,
        })
    }

    fn encode(&self, output: &mut [u8]) -> ProgramResult {
        if output.len() < RESERVE_STATE_SIZE {
            return Err(FaultlineError::InvalidRoomState.into());
        }
        output.fill(0);

        let mut offset = 0usize;
        write_u8(output, &mut offset, self.version)?;
        write_u8(output, &mut offset, self.bump)?;
        write_bool(output, &mut offset, self.paused)?;
        write_bool(output, &mut offset, self.free_access_enabled)?;
        write_u64(output, &mut offset, self.total_collected_lamports)?;
        write_u64(output, &mut offset, self.total_distributed_lamports)?;
        write_u64(output, &mut offset, self.anti_grief_collected_lamports)?;
        write_u64(output, &mut offset, self.reveal_timeout_collected_lamports)?;
        write_u64(output, &mut offset, self.free_access_distributed_lamports)?;
        write_bytes(output, &mut offset, &self.authority)?;
        Ok(())
    }
}

impl ReserveState {
    pub fn new(authority: &Pubkey, bump: u8) -> Self {
        Self {
            version: 1,
            bump,
            paused: false,
            free_access_enabled: false,
            total_collected_lamports: 0,
            total_distributed_lamports: 0,
            anti_grief_collected_lamports: 0,
            reveal_timeout_collected_lamports: 0,
            free_access_distributed_lamports: 0,
            authority: authority.to_bytes(),
        }
    }
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let (&tag, rest) = instruction_data
        .split_first()
        .ok_or(FaultlineError::InvalidInstruction)?;

    match tag {
        0 => process_init_room(program_id, accounts, rest),
        1 => process_join_room(program_id, accounts),
        2 => process_submit_commit(program_id, accounts, rest),
        3 => process_reveal_decision(program_id, accounts, rest),
        4 => process_resolve_game(program_id, accounts),
        5 => process_claim_reward(program_id, accounts),
        6 => process_force_timeout(program_id, accounts),
        7 => process_cancel_expired_room(program_id, accounts),
        8 => Err(FaultlineError::EmergencyDisabled.into()),
        9 => process_close_room(program_id, accounts),
        10 => process_join_and_commit(program_id, accounts, rest),
        _ => Err(FaultlineError::InvalidInstruction.into()),
    }
}

#[inline(never)]
fn process_init_room(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
    let mut input = input;
    let mut iter = accounts.iter();
    let creator = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let reserve_ai = next_account_info(&mut iter)?;
    let system_program_ai = next_account_info(&mut iter)?;

    require_signer(creator)?;
    require_system_program(system_program_ai)?;

    let preset_id = take_u8(&mut input)?;
    let round_id = take_u64(&mut input)?;
    let (stake_lamports, min_players, max_players, join_window_slots, commit_window_slots, reveal_window_slots) =
        get_system_preset(preset_id).ok_or(FaultlineError::InvalidRoomState)?;
    let room_seed = room_seed_from_preset(preset_id);

    if stake_lamports == 0 || min_players < 2 || min_players > max_players || max_players as usize > MAX_PLAYERS {
        return Err(FaultlineError::InvalidRoomState.into());
    }

    let (expected_room, room_bump) = Pubkey::find_program_address(&[ROOM_SEED_PREFIX, &[preset_id]], program_id);
    if expected_room != *room_state_ai.key {
        return Err(FaultlineError::InvalidPda.into());
    }

    let (expected_vault, vault_bump) = Pubkey::find_program_address(&[VAULT_SEED_PREFIX, room_state_ai.key.as_ref()], program_id);
    if expected_vault != *vault_ai.key {
        return Err(FaultlineError::InvalidPda.into());
    }

    let (expected_reserve, reserve_bump) = Pubkey::find_program_address(&[RESERVE_SEED_PREFIX], program_id);
    if expected_reserve != *reserve_ai.key {
        return Err(FaultlineError::InvalidPda.into());
    }

    if room_state_ai.lamports() > 0 {
        return Err(FaultlineError::RoomAlreadyInitialized.into());
    }

    create_pda_account(
        creator,
        room_state_ai,
        system_program_ai,
        program_id,
        ROOM_STATE_SIZE,
        &[ROOM_SEED_PREFIX, &[preset_id], &[room_bump]],
    )?;

    create_pda_account(
        creator,
        vault_ai,
        system_program_ai,
        program_id,
        0,
        &[VAULT_SEED_PREFIX, room_state_ai.key.as_ref(), &[vault_bump]],
    )?;

    if reserve_ai.lamports() == 0 {
        create_pda_account(
            creator,
            reserve_ai,
            system_program_ai,
            program_id,
            RESERVE_STATE_SIZE,
            &[RESERVE_SEED_PREFIX, &[reserve_bump]],
        )?;
        let reserve = ReserveState::new(creator.key, reserve_bump);
        store_state(&reserve, reserve_ai)?;
    } else {
        verify_reserve(program_id, reserve_ai)?;
        let _reserve: ReserveState = load_state(reserve_ai)?;
    }

    write_room_state_init(
        room_state_ai,
        room_bump,
        vault_bump,
        creator.key,
        vault_ai.key,
        reserve_ai.key,
        room_seed,
        stake_lamports,
        min_players,
        max_players,
        preset_id,
        round_id,
        0,
        join_window_slots,
        commit_window_slots,
        reveal_window_slots,
    )?;
    emit_room_initialized(room_state_ai.key, preset_id, round_id, stake_lamports, min_players, max_players);
    msg!("RoomInitialized");
    Ok(())
}

fn process_join_room(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let player = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let system_program_ai = next_account_info(&mut iter)?;

    require_signer(player)?;
    require_system_program(system_program_ai)?;
    let slot = Clock::get()?.slot;
    let mut room = Box::new(load_state::<RoomState>(room_state_ai)?);
    verify_room_ownership(program_id, room_state_ai, room.as_ref())?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;

    join_player(player, vault_ai, system_program_ai, room.as_mut(), slot)?;
    maybe_start_commit_phase(room.as_mut(), slot)?;

    store_state(room.as_ref(), room_state_ai)?;
    emit_player_joined("PlayerJoined", room_state_ai.key, player.key, room.player_count, room.committed_count, room.status, room.join_deadline_slot, room.commit_deadline_slot);
    msg!("PlayerJoined");
    Ok(())
}

fn process_join_and_commit(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
    let mut input = input;
    let mut iter = accounts.iter();
    let player = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let system_program_ai = next_account_info(&mut iter)?;

    require_signer(player)?;
    require_system_program(system_program_ai)?;

    let mut room = Box::new(load_state::<RoomState>(room_state_ai)?);
    verify_room_ownership(program_id, room_state_ai, room.as_ref())?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;

    let slot = Clock::get()?.slot;
    let commit_hash = take_32(&mut input)?;
    let index = join_player(player, vault_ai, system_program_ai, room.as_mut(), slot)?;
    apply_commit(room.as_mut(), index, commit_hash, slot)?;

    store_state(room.as_ref(), room_state_ai)?;
    emit_player_commit("PlayerJoinedAndCommitted", room_state_ai.key, player.key, room.created_slot, room.player_count, room.committed_count, room.commit_deadline_slot);
    msg!("PlayerJoinedAndCommitted");
    Ok(())
}

fn process_submit_commit(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
    let mut input = input;
    let mut iter = accounts.iter();
    let player = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;

    require_signer(player)?;
    let mut room = Box::new(load_state::<RoomState>(room_state_ai)?);
    verify_room_ownership(program_id, room_state_ai, room.as_ref())?;
    let commit_hash = take_32(&mut input)?;
    let index = find_player_index(room.as_ref(), player.key).ok_or(FaultlineError::PlayerNotFound)?;
    let slot = Clock::get()?.slot;

    apply_commit(room.as_mut(), index, commit_hash, slot)?;

    store_state(room.as_ref(), room_state_ai)?;
    emit_player_commit("CommitSubmitted", room_state_ai.key, player.key, room.created_slot, room.player_count, room.committed_count, room.commit_deadline_slot);
    msg!("CommitSubmitted");
    Ok(())
}

fn process_reveal_decision(program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
    let mut input = input;
    let mut iter = accounts.iter();
    let player = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;

    let mut room = Box::new(load_state::<RoomState>(room_state_ai)?);
    verify_room_ownership(program_id, room_state_ai, room.as_ref())?;
    let zone = take_u8(&mut input)?;
    let risk_band = take_u8(&mut input)?;
    let forecast = take_5(&mut input)?;
    let nonce = take_32(&mut input)?;

    if zone as usize >= ZONE_COUNT {
        return Err(FaultlineError::InvalidZone.into());
    }
    if risk_band > RISK_KNIFE {
        return Err(FaultlineError::InvalidRiskBand.into());
    }
    if !forecast_is_valid(&forecast, room.min_players, room.max_players) {
        return Err(FaultlineError::ForecastInvalid.into());
    }
    if nonce == [0u8; 32] {
        return Err(FaultlineError::InvalidInstruction.into());
    }

    if room.status == ROOM_COMMIT {
        if room.committed_count != room.player_count {
            return Err(FaultlineError::RevealPhaseNotReady.into());
        }
        room.status = ROOM_REVEAL;
        if room.reveal_deadline_slot == 0 {
            room.reveal_deadline_slot = Clock::get()?
                .slot
                .checked_add(room.reveal_duration_slots)
                .ok_or(FaultlineError::ArithmeticOverflow)?;
        }
    }

    if room.status != ROOM_REVEAL || Clock::get()?.slot > room.reveal_deadline_slot {
        return Err(FaultlineError::RevealPhaseNotReady.into());
    }

    let index = find_player_index(room.as_ref(), player.key).ok_or(FaultlineError::PlayerNotFound)?;
    if room.player_status[index] != PLAYER_COMMITTED {
        return Err(FaultlineError::InvalidPlayerState.into());
    }

    let expected_commit_v2 = build_commit_hash_v2(room_state_ai.key, player.key, room.created_slot, zone, risk_band, &forecast, &nonce);
    let expected_commit_v1 = build_commit_hash_v1(room_state_ai.key, player.key, zone, risk_band, &forecast, &nonce);
    if room.player_commit_hashes[index] != expected_commit_v2 && room.player_commit_hashes[index] != expected_commit_v1 {
        return Err(FaultlineError::CommitHashMismatch.into());
    }

    room.player_zone[index] = zone;
    room.player_risk[index] = risk_band;
    room.player_forecasts[index] = forecast;
    room.player_status[index] = PLAYER_REVEALED;
    room.revealed_count = room.revealed_count.saturating_add(1);
    room.active_count = room.revealed_count;

    store_state(room.as_ref(), room_state_ai)?;
    emit_decision_revealed(room_state_ai.key, player.key, room.created_slot, zone, risk_band, room.revealed_count, room.reveal_deadline_slot);
    msg!("DecisionRevealed");
    Ok(())
}

fn process_force_timeout(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let _caller = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let reserve_ai = next_account_info(&mut iter)?;
    let refund_accounts = iter.as_slice();

    let mut room = Box::new(load_state::<RoomState>(room_state_ai)?);
    verify_room_ownership(program_id, room_state_ai, room.as_ref())?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;
    verify_reserve(program_id, reserve_ai)?;
    let mut reserve: ReserveState = load_state(reserve_ai)?;
    let slot = Clock::get()?.slot;

    match room.status {
        ROOM_COMMIT => {
            if slot <= room.commit_deadline_slot || room.commit_deadline_slot == 0 {
                return Err(FaultlineError::CommitPhaseNotReady.into());
            }

            let mut slashed: u64 = 0;
            let mut active_after_timeout: u8 = 0;
            for index in 0..room.player_count as usize {
                if room.player_status[index] == PLAYER_JOINED {
                    room.player_status[index] = PLAYER_COMMIT_TIMED_OUT;
                    room.player_rewards_lamports[index] = room.stake_lamports / 2;
                    slashed = slashed
                        .checked_add(room.stake_lamports / 2)
                        .ok_or(FaultlineError::ArithmeticOverflow)?;
                }
                if room.player_status[index] == PLAYER_COMMITTED {
                    active_after_timeout = active_after_timeout.saturating_add(1);
                }
            }

            if slashed > 0 {
                move_lamports(vault_ai, reserve_ai, slashed)?;
                reserve.total_collected_lamports = reserve.total_collected_lamports.saturating_add(slashed);
                reserve.anti_grief_collected_lamports = reserve.anti_grief_collected_lamports.saturating_add(slashed);
                room.slashed_to_reserve_lamports = room.slashed_to_reserve_lamports.saturating_add(slashed);
            }

            room.active_count = active_after_timeout;
            if active_after_timeout < room.min_players {
                room.status = ROOM_CANCELLED;
                for index in 0..room.player_count as usize {
                    if room.player_status[index] == PLAYER_COMMITTED {
                        room.player_rewards_lamports[index] = room.stake_lamports;
                    }
                }
            } else {
                room.status = ROOM_REVEAL;
                room.reveal_deadline_slot = slot
                    .checked_add(room.reveal_duration_slots)
                    .ok_or(FaultlineError::ArithmeticOverflow)?;
            }
        }
        ROOM_REVEAL => {
            if slot <= room.reveal_deadline_slot || room.reveal_deadline_slot == 0 {
                return Err(FaultlineError::RevealPhaseNotReady.into());
            }

            let mut slashed: u64 = 0;
            let mut active_after_timeout: u8 = 0;
            for index in 0..room.player_count as usize {
                if room.player_status[index] == PLAYER_COMMITTED {
                    room.player_status[index] = PLAYER_REVEAL_TIMED_OUT;
                    let reserve_cut = room.stake_lamports / 4;
                    slashed = slashed.checked_add(reserve_cut).ok_or(FaultlineError::ArithmeticOverflow)?;
                }
                if room.player_status[index] == PLAYER_REVEALED {
                    active_after_timeout = active_after_timeout.saturating_add(1);
                }
            }

            if slashed > 0 {
                move_lamports(vault_ai, reserve_ai, slashed)?;
                reserve.total_collected_lamports = reserve.total_collected_lamports.saturating_add(slashed);
                reserve.reveal_timeout_collected_lamports = reserve.reveal_timeout_collected_lamports.saturating_add(slashed);
                room.slashed_to_reserve_lamports = room.slashed_to_reserve_lamports.saturating_add(slashed);
            }

            room.active_count = active_after_timeout;
            if active_after_timeout == 0 {
                room.status = ROOM_CANCELLED;
            }
        }
        _ => return Err(FaultlineError::InvalidRoomStatus.into()),
    }

    if room.status == ROOM_CANCELLED {
        auto_refund_cancelled_room(vault_ai, room.as_mut(), refund_accounts)?;
    }

    if should_reset_room(room.as_ref()) {
        reset_room_to_lobby(&mut room, slot);
        msg!("RoomReset");
    }

    store_state(&reserve, reserve_ai)?;
    store_state(room.as_ref(), room_state_ai)?;
    emit_timeout_forced(room_state_ai.key, room.created_slot, room.status, room.active_count, room.slashed_to_reserve_lamports, room.reveal_deadline_slot);
    msg!("TimeoutForced");
    Ok(())
}

fn process_resolve_game(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let _caller = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let reserve_ai = next_account_info(&mut iter)?;

    let mut room = Box::new(load_state::<RoomState>(room_state_ai)?);
    verify_room_ownership(program_id, room_state_ai, room.as_ref())?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;
    verify_reserve(program_id, reserve_ai)?;
    let mut reserve: ReserveState = load_state(reserve_ai)?;

    if room.status != ROOM_REVEAL {
        return Err(FaultlineError::ResolveNotReady.into());
    }

    if Clock::get()?.slot > room.reveal_deadline_slot {
        for index in 0..room.player_count as usize {
            if room.player_status[index] == PLAYER_COMMITTED {
                return Err(FaultlineError::ResolveNotReady.into());
            }
        }
    }

    let mut active_indices = [u8::MAX; MAX_PLAYERS];
    let mut active_count = 0usize;
    let mut histogram = [0u8; 5];
    for index in 0..room.player_count as usize {
        if room.player_status[index] == PLAYER_REVEALED {
            active_indices[active_count] = index as u8;
            active_count += 1;
            histogram[room.player_zone[index] as usize] = histogram[room.player_zone[index] as usize].saturating_add(1);
        }
    }

    if active_count == 0 {
        return Err(FaultlineError::InsufficientPlayers.into());
    }

    let locked_refunds = sum_locked_refunds(&room);
    if room.reserve_fee_lamports == 0 {
        let reserve_fee = (room.total_staked_lamports * RESERVE_FEE_BPS) / 10_000;
        if reserve_fee > 0 {
            move_lamports(vault_ai, reserve_ai, reserve_fee)?;
            reserve.total_collected_lamports = reserve.total_collected_lamports.saturating_add(reserve_fee);
        }
        room.reserve_fee_lamports = reserve_fee;
    }

    room.distributable_lamports = room
        .total_staked_lamports
        .checked_sub(room.reserve_fee_lamports)
        .and_then(|value| value.checked_sub(room.slashed_to_reserve_lamports))
        .and_then(|value| value.checked_sub(locked_refunds))
        .ok_or(FaultlineError::ArithmeticOverflow)?;

    for active_slot in 0..active_count {
        let index = active_indices[active_slot] as usize;
        let error = compute_error(room.player_forecasts[index], histogram);
        let base = core::cmp::max(1u32, (5u32 * active_count as u32).saturating_sub(error as u32));
        let multiplier = risk_multiplier(room.player_risk[index], room.player_zone[index], histogram);
        let score = base.saturating_mul(multiplier as u32);
        room.player_errors[index] = error;
        room.player_scores_bps[index] = score;
    }

    sort_active_indices(&room, &mut active_indices, active_count, histogram);
    let reward_count = room.winner_count as usize;
    let rewards = compute_rewards(room.distributable_lamports, room.payout_bps);
    for reward_index in 0..reward_count {
        if reward_index >= active_count {
            break;
        }
        let player_index = active_indices[reward_index] as usize;
        room.winner_indices[reward_index] = player_index as u8;
        room.player_rewards_lamports[player_index] = room.player_rewards_lamports[player_index]
            .checked_add(rewards[reward_index])
            .ok_or(FaultlineError::ArithmeticOverflow)?;
    }

    room.final_histogram = histogram;
    room.active_count = active_count as u8;
    room.resolve_slot = Clock::get()?.slot;
    room.status = ROOM_RESOLVED;

    store_state(&reserve, reserve_ai)?;
    store_state(room.as_ref(), room_state_ai)?;
    emit_game_resolved(room_state_ai.key, room.created_slot, room.resolve_slot, room.active_count, room.distributable_lamports, room.reserve_fee_lamports, histogram);
    msg!("GameResolved");
    Ok(())
}

fn process_claim_reward(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let player = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;
    let _system_program_ai = next_account_info(&mut iter)?;

    let mut room = Box::new(load_state::<RoomState>(room_state_ai)?);
    verify_room_ownership(program_id, room_state_ai, room.as_ref())?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;
    if room.status != ROOM_RESOLVED && room.status != ROOM_CANCELLED && room.status != ROOM_EMERGENCY {
        return Err(FaultlineError::InvalidRoomStatus.into());
    }

    let index = find_player_index(room.as_ref(), player.key).ok_or(FaultlineError::PlayerNotFound)?;
    if room.player_claimed[index] == 1 {
        return Err(FaultlineError::AlreadyClaimed.into());
    }
    let amount = room.player_rewards_lamports[index];
    if amount == 0 {
        return Err(FaultlineError::NothingToClaim.into());
    }

    move_lamports(vault_ai, player, amount)?;
    room.player_rewards_lamports[index] = 0;
    room.player_claimed[index] = 1;

    if should_reset_room(room.as_ref()) {
        reset_room_to_lobby(&mut room, Clock::get()?.slot);
        msg!("RoomReset");
    }

    store_state(room.as_ref(), room_state_ai)?;
    emit_reward_claimed(room_state_ai.key, player.key, room.created_slot, amount, room.status);
    msg!("RewardClaimed");
    Ok(())
}

fn process_cancel_expired_room(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let _caller = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;

    let mut room = Box::new(load_state::<RoomState>(room_state_ai)?);
    verify_room_ownership(program_id, room_state_ai, room.as_ref())?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;
    if room.status != ROOM_OPEN || room.player_count == 0 || room.join_deadline_slot == 0 || Clock::get()?.slot <= room.join_deadline_slot || room.player_count >= room.min_players {
        return Err(FaultlineError::InvalidRoomStatus.into());
    }

    room.status = ROOM_CANCELLED;
    for index in 0..room.player_count as usize {
        if room.player_status[index] == PLAYER_JOINED || room.player_status[index] == PLAYER_COMMITTED {
            if room.player_rewards_lamports[index] == 0 {
                room.player_rewards_lamports[index] = room.stake_lamports;
            }
        }
    }

    auto_refund_cancelled_room(vault_ai, room.as_mut(), iter.as_slice())?;

    if should_reset_room(room.as_ref()) {
        reset_room_to_lobby(&mut room, Clock::get()?.slot);
        msg!("RoomReset");
    }

    store_state(room.as_ref(), room_state_ai)?;
    emit_room_cancelled(room_state_ai.key, room.created_slot, room.player_count, room.status);
    msg!("RoomCancelled");
    Ok(())
}

fn process_close_room(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let recipient = next_account_info(&mut iter)?;
    let room_state_ai = next_account_info(&mut iter)?;
    let vault_ai = next_account_info(&mut iter)?;

    require_signer(recipient)?;
    let mut room = Box::new(load_state::<RoomState>(room_state_ai)?);
    verify_room_ownership(program_id, room_state_ai, room.as_ref())?;
    verify_vault(program_id, room_state_ai.key, vault_ai, room.vault_bump)?;

    if room.status != ROOM_RESOLVED && room.status != ROOM_CANCELLED && room.status != ROOM_EMERGENCY {
        return Err(FaultlineError::InvalidRoomStatus.into());
    }
    if room.player_rewards_lamports.iter().any(|value| *value > 0) {
        return Err(FaultlineError::ResolveNotReady.into());
    }

    reset_room_to_lobby(&mut room, Clock::get()?.slot);
    store_state(room.as_ref(), room_state_ai)?;
    let _ = vault_ai;
    msg!("RoomReset");
    Ok(())
}

fn require_signer(account: &AccountInfo) -> ProgramResult {
    if !account.is_signer {
        return Err(FaultlineError::MissingSignature.into());
    }
    Ok(())
}

fn require_system_program(account: &AccountInfo) -> ProgramResult {
    if *account.key != system_program::ID {
        return Err(FaultlineError::InvalidSystemProgram.into());
    }
    Ok(())
}

fn emit_room_initialized(room: &Pubkey, preset_id: u8, round_id: u64, stake_lamports: u64, min_players: u8, max_players: u8) {
    msg!(
        "faultline:event:v{} type=RoomInitialized room={} preset_id={} round_id={} stake_lamports={} min_players={} max_players={}",
        EVENT_SCHEMA_VERSION,
        room,
        preset_id,
        round_id,
        stake_lamports,
        min_players,
        max_players
    );
}

fn emit_player_joined(event_type: &str, room: &Pubkey, player: &Pubkey, player_count: u8, committed_count: u8, status: u8, join_deadline_slot: u64, commit_deadline_slot: u64) {
    msg!(
        "faultline:event:v{} type={} room={} player={} player_count={} committed_count={} status={} join_deadline_slot={} commit_deadline_slot={}",
        EVENT_SCHEMA_VERSION,
        event_type,
        room,
        player,
        player_count,
        committed_count,
        status,
        join_deadline_slot,
        commit_deadline_slot
    );
}

fn emit_player_commit(event_type: &str, room: &Pubkey, player: &Pubkey, round_id: u64, player_count: u8, committed_count: u8, commit_deadline_slot: u64) {
    msg!(
        "faultline:event:v{} type={} room={} player={} round_id={} player_count={} committed_count={} commit_deadline_slot={}",
        EVENT_SCHEMA_VERSION,
        event_type,
        room,
        player,
        round_id,
        player_count,
        committed_count,
        commit_deadline_slot
    );
}

fn emit_decision_revealed(room: &Pubkey, player: &Pubkey, round_id: u64, zone: u8, risk_band: u8, revealed_count: u8, reveal_deadline_slot: u64) {
    msg!(
        "faultline:event:v{} type=DecisionRevealed room={} player={} round_id={} zone={} risk_band={} revealed_count={} reveal_deadline_slot={}",
        EVENT_SCHEMA_VERSION,
        room,
        player,
        round_id,
        zone,
        risk_band,
        revealed_count,
        reveal_deadline_slot
    );
}

fn emit_timeout_forced(room: &Pubkey, round_id: u64, status: u8, active_count: u8, slashed_to_reserve_lamports: u64, reveal_deadline_slot: u64) {
    msg!(
        "faultline:event:v{} type=TimeoutForced room={} round_id={} status={} active_count={} slashed_to_reserve_lamports={} reveal_deadline_slot={}",
        EVENT_SCHEMA_VERSION,
        room,
        round_id,
        status,
        active_count,
        slashed_to_reserve_lamports,
        reveal_deadline_slot
    );
}

fn emit_game_resolved(room: &Pubkey, round_id: u64, resolve_slot: u64, active_count: u8, distributable_lamports: u64, reserve_fee_lamports: u64, histogram: [u8; 5]) {
    msg!(
        "faultline:event:v{} type=GameResolved room={} round_id={} resolve_slot={} active_count={} distributable_lamports={} reserve_fee_lamports={} histogram={},{},{},{},{}",
        EVENT_SCHEMA_VERSION,
        room,
        round_id,
        resolve_slot,
        active_count,
        distributable_lamports,
        reserve_fee_lamports,
        histogram[0],
        histogram[1],
        histogram[2],
        histogram[3],
        histogram[4]
    );
}

fn emit_reward_claimed(room: &Pubkey, player: &Pubkey, round_id: u64, amount: u64, status: u8) {
    msg!(
        "faultline:event:v{} type=RewardClaimed room={} player={} round_id={} amount={} status={}",
        EVENT_SCHEMA_VERSION,
        room,
        player,
        round_id,
        amount,
        status
    );
}

fn emit_room_cancelled(room: &Pubkey, round_id: u64, player_count: u8, status: u8) {
    msg!(
        "faultline:event:v{} type=RoomCancelled room={} round_id={} player_count={} status={}",
        EVENT_SCHEMA_VERSION,
        room,
        round_id,
        player_count,
        status
    );
}
#[inline(never)]
fn create_pda_account<'a>(
    payer: &AccountInfo<'a>,
    account: &AccountInfo<'a>,
    system_program_ai: &AccountInfo<'a>,
    owner: &Pubkey,
    space: usize,
    seeds: &[&[u8]],
) -> ProgramResult {
    if account.lamports() > 0 {
        return Ok(());
    }

    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);
    solana_program::program::invoke_signed(
        &system_instruction::create_account(payer.key, account.key, lamports, space as u64, owner),
        &[payer.clone(), account.clone(), system_program_ai.clone()],
        &[seeds],
    )?;
    Ok(())
}

fn verify_room_ownership(program_id: &Pubkey, room_ai: &AccountInfo, room: &RoomState) -> ProgramResult {
    if room_ai.owner != program_id || room.version != 1 {
        return Err(FaultlineError::InvalidRoomState.into());
    }
    Ok(())
}

fn verify_vault(program_id: &Pubkey, room_key: &Pubkey, vault_ai: &AccountInfo, vault_bump: u8) -> ProgramResult {
    let expected = Pubkey::create_program_address(&[VAULT_SEED_PREFIX, room_key.as_ref(), &[vault_bump]], program_id)
        .map_err(|_| FaultlineError::InvalidPda)?;
    if expected != *vault_ai.key || vault_ai.owner != program_id {
        return Err(FaultlineError::InvalidPda.into());
    }
    Ok(())
}

fn verify_reserve(program_id: &Pubkey, reserve_ai: &AccountInfo) -> ProgramResult {
    let (expected, _) = Pubkey::find_program_address(&[RESERVE_SEED_PREFIX], program_id);
    if expected != *reserve_ai.key || reserve_ai.owner != program_id {
        return Err(FaultlineError::InvalidPda.into());
    }
    Ok(())
}

#[inline(never)]
fn write_room_state_init(
    account: &AccountInfo,
    room_bump: u8,
    vault_bump: u8,
    creator: &Pubkey,
    vault: &Pubkey,
    reserve: &Pubkey,
    room_seed: [u8; 32],
    stake_lamports: u64,
    min_players: u8,
    max_players: u8,
    preset_id: u8,
    created_slot: u64,
    join_deadline_slot: u64,
    join_duration_slots: u64,
    commit_duration_slots: u64,
    reveal_duration_slots: u64,
) -> ProgramResult {
    let (winner_count, payout_bps) = get_payout_ladder(max_players as usize);
    let mut data = account.try_borrow_mut_data()?;
    data.fill(0);

    let mut offset = 0usize;
    write_u8(&mut data, &mut offset, 1)?;
    write_u8(&mut data, &mut offset, room_bump)?;
    write_u8(&mut data, &mut offset, vault_bump)?;
    write_u8(&mut data, &mut offset, ROOM_OPEN)?;
    write_u8(&mut data, &mut offset, ZONE_COUNT as u8)?;
    write_u8(&mut data, &mut offset, min_players)?;
    write_u8(&mut data, &mut offset, max_players)?;
    write_u8(&mut data, &mut offset, 0)?;
    write_u8(&mut data, &mut offset, 0)?;
    write_u8(&mut data, &mut offset, 0)?;
    write_u8(&mut data, &mut offset, 0)?;
    write_u8(&mut data, &mut offset, winner_count)?;
    write_u8(&mut data, &mut offset, preset_id)?;
    write_u8(&mut data, &mut offset, 0)?;
    write_u64(&mut data, &mut offset, stake_lamports)?;
    write_u64(&mut data, &mut offset, 0)?;
    write_u64(&mut data, &mut offset, 0)?;
    write_u64(&mut data, &mut offset, 0)?;
    write_u64(&mut data, &mut offset, 0)?;
    write_u64(&mut data, &mut offset, created_slot)?;
    write_u64(&mut data, &mut offset, join_deadline_slot)?;
    write_u64(&mut data, &mut offset, join_duration_slots)?;
    write_u64(&mut data, &mut offset, commit_duration_slots)?;
    write_u64(&mut data, &mut offset, 0)?;
    write_u64(&mut data, &mut offset, reveal_duration_slots)?;
    write_u64(&mut data, &mut offset, 0)?;
    write_u64(&mut data, &mut offset, 0)?;
    write_bytes(&mut data, &mut offset, &creator.to_bytes())?;
    write_bytes(&mut data, &mut offset, &vault.to_bytes())?;
    write_bytes(&mut data, &mut offset, &reserve.to_bytes())?;
    write_bytes(&mut data, &mut offset, &TREASURY_PUBKEY.to_bytes())?;
    write_bytes(&mut data, &mut offset, &room_seed)?;
    write_bytes(&mut data, &mut offset, &[0; 5])?;
    write_bytes(&mut data, &mut offset, &[u8::MAX; 4])?;
    for payout in payout_bps {
        write_u16(&mut data, &mut offset, payout)?;
    }

    if offset > ROOM_STATE_SIZE {
        return Err(FaultlineError::InvalidRoomState.into());
    }

    Ok(())
}

fn write_u8(data: &mut [u8], offset: &mut usize, value: u8) -> ProgramResult {
    write_bytes(data, offset, &[value])
}

fn write_u16(data: &mut [u8], offset: &mut usize, value: u16) -> ProgramResult {
    write_bytes(data, offset, &value.to_le_bytes())
}

fn write_u32(data: &mut [u8], offset: &mut usize, value: u32) -> ProgramResult {
    write_bytes(data, offset, &value.to_le_bytes())
}

fn write_u64(data: &mut [u8], offset: &mut usize, value: u64) -> ProgramResult {
    write_bytes(data, offset, &value.to_le_bytes())
}

fn write_bool(data: &mut [u8], offset: &mut usize, value: bool) -> ProgramResult {
    write_u8(data, offset, if value { 1 } else { 0 })
}

fn write_bytes(data: &mut [u8], offset: &mut usize, value: &[u8]) -> ProgramResult {
    let end = offset
        .checked_add(value.len())
        .ok_or(FaultlineError::ArithmeticOverflow)?;
    if end > data.len() {
        return Err(FaultlineError::InvalidRoomState.into());
    }
    data[*offset..end].copy_from_slice(value);
    *offset = end;
    Ok(())
}

fn load_state<T: FaultlineCodec>(account: &AccountInfo) -> Result<T, ProgramError> {
    let data = account.try_borrow_data()?;
    T::decode(&data)
}

fn store_state<T: FaultlineCodec>(value: &T, account: &AccountInfo) -> ProgramResult {
    let mut data = account.try_borrow_mut_data()?;
    value.encode(&mut data)
}

fn move_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> ProgramResult {
    if amount == 0 {
        return Ok(());
    }
    **from.try_borrow_mut_lamports()? = from
        .lamports()
        .checked_sub(amount)
        .ok_or(FaultlineError::ArithmeticOverflow)?;
    **to.try_borrow_mut_lamports()? = to
        .lamports()
        .checked_add(amount)
        .ok_or(FaultlineError::ArithmeticOverflow)?;
    Ok(())
}

fn join_player<'a>(
    player: &AccountInfo<'a>,
    vault_ai: &AccountInfo<'a>,
    system_program_ai: &AccountInfo<'a>,
    room: &mut RoomState,
    slot: u64,
) -> Result<usize, ProgramError> {
    if room.status != ROOM_OPEN {
        return Err(FaultlineError::JoinClosed.into());
    }
    if room.player_count > 0 && room.join_deadline_slot > 0 && slot > room.join_deadline_slot {
        return Err(FaultlineError::JoinClosed.into());
    }
    if room.player_count as usize >= room.max_players as usize {
        return Err(FaultlineError::JoinClosed.into());
    }
    if find_player_index(room, player.key).is_some() {
        return Err(FaultlineError::DuplicateJoin.into());
    }

    invoke(
        &system_instruction::transfer(player.key, vault_ai.key, room.stake_lamports),
        &[player.clone(), vault_ai.clone(), system_program_ai.clone()],
    )?;

    let index = room.player_count as usize;
    room.player_keys[index] = player.key.to_bytes();
    room.player_status[index] = PLAYER_JOINED;
    room.player_claimed[index] = 0;
    room.player_count = room.player_count.saturating_add(1);
    room.total_staked_lamports = room
        .total_staked_lamports
        .checked_add(room.stake_lamports)
        .ok_or(FaultlineError::ArithmeticOverflow)?;

    if room.player_count == 1 {
        if room.created_slot == 0 {
            room.created_slot = slot;
        }
        room.join_deadline_slot = slot
            .checked_add(room.join_duration_slots)
            .ok_or(FaultlineError::ArithmeticOverflow)?;
    }
    Ok(index)
}

fn apply_commit(
    room: &mut RoomState,
    player_index: usize,
    commit_hash: [u8; 32],
    slot: u64,
) -> ProgramResult {
    if room.status == ROOM_OPEN && room.player_count > 0 && room.join_deadline_slot > 0 && slot > room.join_deadline_slot && room.player_count < room.min_players {
        return Err(FaultlineError::JoinClosed.into());
    }
    if room.status != ROOM_OPEN && room.status != ROOM_COMMIT {
        return Err(FaultlineError::InvalidRoomStatus.into());
    }
    if room.status == ROOM_COMMIT && slot > room.commit_deadline_slot {
        return Err(FaultlineError::CommitPhaseNotReady.into());
    }
    if room.player_status[player_index] != PLAYER_JOINED {
        return Err(FaultlineError::InvalidPlayerState.into());
    }

    room.player_commit_hashes[player_index] = commit_hash;
    room.player_status[player_index] = PLAYER_COMMITTED;
    room.committed_count = room.committed_count.saturating_add(1);

    maybe_start_commit_phase(room, slot)?;
    maybe_advance_to_reveal_phase(room, slot)?;
    Ok(())
}

fn auto_refund_cancelled_room(vault_ai: &AccountInfo, room: &mut RoomState, refund_accounts: &[AccountInfo]) -> ProgramResult {
    let mut refund_account_offset = 0usize;

    for index in 0..room.player_count as usize {
        let amount = room.player_rewards_lamports[index];
        if amount == 0 {
            continue;
        }

        if refund_account_offset >= refund_accounts.len() {
            break;
        }

        let refund_ai = &refund_accounts[refund_account_offset];
        let expected_player = Pubkey::new_from_array(room.player_keys[index]);
        if *refund_ai.key != expected_player {
            return Err(FaultlineError::InvalidPda.into());
        }

        move_lamports(vault_ai, refund_ai, amount)?;
        room.player_rewards_lamports[index] = 0;
        room.player_claimed[index] = 1;
        refund_account_offset += 1;
    }

    Ok(())
}

fn maybe_start_commit_phase(room: &mut RoomState, slot: u64) -> ProgramResult {
    if room.status == ROOM_OPEN && room.player_count >= room.min_players && room.committed_count > 0 {
        room.status = ROOM_COMMIT;
        if room.commit_deadline_slot == 0 {
            room.commit_deadline_slot = slot
                .checked_add(room.commit_duration_slots)
                .ok_or(FaultlineError::ArithmeticOverflow)?;
        }
    }

    Ok(())
}

fn maybe_advance_to_reveal_phase(room: &mut RoomState, slot: u64) -> ProgramResult {
    if room.status == ROOM_COMMIT && room.committed_count == room.player_count {
        room.status = ROOM_REVEAL;
        room.reveal_deadline_slot = slot
            .checked_add(room.reveal_duration_slots)
            .ok_or(FaultlineError::ArithmeticOverflow)?;
    }

    Ok(())
}

fn room_seed_from_preset(preset_id: u8) -> [u8; 32] {
    let mut seed = [0u8; 32];
    seed[..11].copy_from_slice(b"preset-room");
    seed[31] = preset_id;
    seed
}

fn get_system_preset(preset_id: u8) -> Option<(u64, u8, u8, u64, u64, u64)> {
    match preset_id {
        0 => Some((10_000_000, 2, 12, 220, 160, 160)),
        1 => Some((20_000_000, 2, 12, 220, 160, 160)),
        2 => Some((40_000_000, 2, 12, 220, 160, 160)),
        3 => Some((80_000_000, 2, 12, 220, 160, 160)),
        4 => Some((160_000_000, 2, 12, 220, 160, 160)),
        5 => Some((320_000_000, 2, 12, 220, 160, 160)),
        6 => Some((640_000_000, 2, 12, 220, 160, 160)),
        7 => Some((1_000_000_000, 2, 12, 260, 180, 180)),
        _ => None,
    }
}

fn should_reset_room(room: &RoomState) -> bool {
    (room.status == ROOM_RESOLVED || room.status == ROOM_CANCELLED || room.status == ROOM_EMERGENCY)
        && !room.player_rewards_lamports[..room.player_count as usize]
            .iter()
            .any(|value| *value > 0)
}

fn reset_room_to_lobby(room: &mut RoomState, slot: u64) {
    room.status = ROOM_OPEN;
    room.player_count = 0;
    room.committed_count = 0;
    room.revealed_count = 0;
    room.active_count = 0;
    room.flags = 0;
    room.total_staked_lamports = 0;
    room.distributable_lamports = 0;
    room.reserve_fee_lamports = 0;
    room.slashed_to_reserve_lamports = 0;
    room.created_slot = slot;
    room.join_deadline_slot = 0;
    room.commit_deadline_slot = 0;
    room.reveal_deadline_slot = 0;
    room.resolve_slot = 0;
    room.final_histogram = [0; 5];
    room.winner_indices = [u8::MAX; 4];

    for index in 0..MAX_PLAYERS {
        room.player_keys[index] = EMPTY_KEY;
        room.player_status[index] = 0;
        room.player_claimed[index] = 0;
        room.player_zone[index] = 0;
        room.player_risk[index] = 0;
        room.player_commit_hashes[index] = [0u8; 32];
        room.player_forecasts[index] = [0u8; 5];
        room.player_errors[index] = 0;
        room.player_scores_bps[index] = 0;
        room.player_rewards_lamports[index] = 0;
    }
}

fn find_player_index(room: &RoomState, player: &Pubkey) -> Option<usize> {
    let key_bytes = player.to_bytes();
    (0..room.player_count as usize).find(|index| room.player_keys[*index] == key_bytes)
}

fn forecast_is_valid(forecast: &[u8; 5], min_players: u8, max_players: u8) -> bool {
    let total: u16 = forecast.iter().map(|value| *value as u16).sum();
    total >= min_players as u16 && total <= max_players as u16
}

fn build_commit_hash_v1(
    room: &Pubkey,
    player: &Pubkey,
    zone: u8,
    risk_band: u8,
    forecast: &[u8; 5],
    nonce: &[u8; 32],
) -> [u8; 32] {
    hashv(&[
        COMMIT_DOMAIN_V1,
        room.as_ref(),
        player.as_ref(),
        &[zone],
        &[risk_band],
        forecast,
        nonce,
    ])
    .to_bytes()
}

fn build_commit_hash_v2(
    room: &Pubkey,
    player: &Pubkey,
    round_id: u64,
    zone: u8,
    risk_band: u8,
    forecast: &[u8; 5],
    nonce: &[u8; 32],
) -> [u8; 32] {
    let round_id_bytes = round_id.to_le_bytes();

    hashv(&[
        COMMIT_DOMAIN_V2,
        room.as_ref(),
        player.as_ref(),
        &round_id_bytes,
        &[zone],
        &[risk_band],
        forecast,
        nonce,
    ])
    .to_bytes()
}

fn compute_error(forecast: [u8; 5], histogram: [u8; 5]) -> u16 {
    let mut total = 0u16;
    for zone in 0..ZONE_COUNT {
        total = total.saturating_add((forecast[zone] as i16 - histogram[zone] as i16).unsigned_abs());
    }
    total
}

fn risk_multiplier(risk_band: u8, zone: u8, histogram: [u8; 5]) -> u16 {
    match risk_band {
        RISK_CALM => 10_000,
        RISK_EDGE => {
            let mut sorted = histogram;
            sorted.sort_unstable();
            if histogram[zone as usize] <= sorted[1] {
                15_500
            } else {
                2_500
            }
        }
        _ => {
            let minimum = *histogram.iter().min().unwrap_or(&0);
            if histogram[zone as usize] == minimum {
                24_000
            } else {
                0
            }
        }
    }
}

fn get_payout_ladder(max_players: usize) -> (u8, [u16; 4]) {
    if max_players <= 4 {
        (2, [9000, 800, 0, 0])
    } else if max_players <= 24 {
        (3, [7200, 1800, 800, 0])
    } else {
        (4, [6400, 2000, 1000, 400])
    }
}

fn sum_locked_refunds(room: &RoomState) -> u64 {
    let mut total = 0u64;
    for index in 0..room.player_count as usize {
        if room.player_status[index] != PLAYER_REVEALED {
            total = total.saturating_add(room.player_rewards_lamports[index]);
        }
    }
    total
}

fn compute_rewards(distributable_lamports: u64, payout_bps: [u16; 4]) -> [u64; 4] {
    let mut rewards = [0u64; 4];
    let mut remainder = distributable_lamports;
    for index in 0..MAX_WINNERS {
        if payout_bps[index] == 0 {
            continue;
        }
        rewards[index] = distributable_lamports.saturating_mul(payout_bps[index] as u64) / 10_000;
        remainder = remainder.saturating_sub(rewards[index]);
    }
    rewards[0] = rewards[0].saturating_add(remainder);
    rewards
}

fn sort_active_indices(room: &RoomState, active_indices: &mut [u8; MAX_PLAYERS], active_count: usize, histogram: [u8; 5]) {
    for left in 0..active_count {
        for right in (left + 1)..active_count {
            let lhs = active_indices[left] as usize;
            let rhs = active_indices[right] as usize;
            if player_should_rank_after(room, lhs, rhs, histogram) {
                active_indices.swap(left, right);
            }
        }
    }
}

fn player_should_rank_after(room: &RoomState, lhs: usize, rhs: usize, histogram: [u8; 5]) -> bool {
    if room.player_scores_bps[lhs] != room.player_scores_bps[rhs] {
        return room.player_scores_bps[lhs] < room.player_scores_bps[rhs];
    }
    if room.player_errors[lhs] != room.player_errors[rhs] {
        return room.player_errors[lhs] > room.player_errors[rhs];
    }

    let lhs_occupancy = histogram[room.player_zone[lhs] as usize];
    let rhs_occupancy = histogram[room.player_zone[rhs] as usize];
    if lhs_occupancy != rhs_occupancy {
        return lhs_occupancy > rhs_occupancy;
    }
    if room.player_risk[lhs] != room.player_risk[rhs] {
        return room.player_risk[lhs] < room.player_risk[rhs];
    }
    room.player_keys[lhs] > room.player_keys[rhs]
}

fn take_u8(input: &mut &[u8]) -> Result<u8, ProgramError> {
    let (&value, rest) = input.split_first().ok_or(FaultlineError::InvalidInstruction)?;
    *input = rest;
    Ok(value)
}

fn take_u64(input: &mut &[u8]) -> Result<u64, ProgramError> {
    let bytes = take_n::<8>(input)?;
    Ok(u64::from_le_bytes(bytes))
}

fn read_u8(input: &[u8], offset: &mut usize) -> Result<u8, ProgramError> {
    let bytes = read_slice(input, offset, 1)?;
    Ok(bytes[0])
}

fn read_bool(input: &[u8], offset: &mut usize) -> Result<bool, ProgramError> {
    Ok(read_u8(input, offset)? != 0)
}

fn read_u16(input: &[u8], offset: &mut usize) -> Result<u16, ProgramError> {
    let bytes = read_slice(input, offset, 2)?;
    Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
}

fn read_u32(input: &[u8], offset: &mut usize) -> Result<u32, ProgramError> {
    let bytes = read_slice(input, offset, 4)?;
    Ok(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
}

fn read_u64(input: &[u8], offset: &mut usize) -> Result<u64, ProgramError> {
    let bytes = read_slice(input, offset, 8)?;
    Ok(u64::from_le_bytes([
        bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
    ]))
}

fn read_slice<'a>(input: &'a [u8], offset: &mut usize, length: usize) -> Result<&'a [u8], ProgramError> {
    let end = offset
        .checked_add(length)
        .ok_or(FaultlineError::ArithmeticOverflow)?;
    if end > input.len() {
        return Err(FaultlineError::InvalidRoomState.into());
    }
    let slice = &input[*offset..end];
    *offset = end;
    Ok(slice)
}

fn read_array<const N: usize>(input: &[u8], offset: &mut usize) -> Result<[u8; N], ProgramError> {
    let slice = read_slice(input, offset, N)?;
    let mut output = [0u8; N];
    output.copy_from_slice(slice);
    Ok(output)
}

fn take_32(input: &mut &[u8]) -> Result<[u8; 32], ProgramError> {
    take_n::<32>(input)
}

fn take_5(input: &mut &[u8]) -> Result<[u8; 5], ProgramError> {
    take_n::<5>(input)
}

fn take_n<const N: usize>(input: &mut &[u8]) -> Result<[u8; N], ProgramError> {
    if input.len() < N {
        return Err(FaultlineError::InvalidInstruction.into());
    }
    let (head, rest) = input.split_at(N);
    let mut output = [0u8; N];
    output.copy_from_slice(head);
    *input = rest;
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn commit_hash_matches_reference_vector_shape() {
        let room = Pubkey::new_from_array([1u8; 32]);
        let player = Pubkey::new_from_array([2u8; 32]);
        let forecast = [3, 4, 5, 2, 6];
        let nonce = [7u8; 32];
        let hash = build_commit_hash(&room, &player, 2, 1, &forecast, &nonce);

        assert_eq!(hash.len(), 32);
        assert_ne!(hash, [0u8; 32]);
    }
}