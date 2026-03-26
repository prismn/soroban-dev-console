#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
pub enum DataKey {
    Admin,
    Balance(Address),
}

#[contract]
pub struct TokenFixture;

#[contractimpl]
impl TokenFixture {
    pub fn init(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(account))
            .unwrap_or(0)
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("admin must be initialized");
        admin.require_auth();

        let next_balance = Self::balance(env.clone(), to.clone()) + amount;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &next_balance);
        env.events()
            .publish((Symbol::new(&env, "mint"), to), amount);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let from_balance = Self::balance(env.clone(), from.clone());
        let to_balance = Self::balance(env.clone(), to.clone());

        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(to_balance + amount));
        env.events()
            .publish((Symbol::new(&env, "transfer"), from, to), amount);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn token_fixture_can_init_and_mint() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TokenFixture);
        let client = TokenFixtureClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let recipient = Address::generate(&env);

        client.init(&admin);
        client.mint(&recipient, &150);

        assert_eq!(client.balance(&recipient), 150);
    }

    #[test]
    fn token_fixture_can_transfer_balances() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TokenFixture);
        let client = TokenFixtureClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);

        client.init(&admin);
        client.mint(&sender, &200);
        client.transfer(&sender, &recipient, &75);

        assert_eq!(client.balance(&sender), 125);
        assert_eq!(client.balance(&recipient), 75);
    }
}
