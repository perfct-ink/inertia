class CreateSocialSignIn < ActiveRecord::Migration[7.2]
  def change
    create_table :social_identities do |t|
      t.references :user, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :subject, null: false
      t.timestamps
    end
    add_index :social_identities, [ :provider, :subject ], unique: true

    create_table :social_login_attempts do |t|
      t.string :provider, null: false
      t.string :state_digest, null: false
      t.string :client_state, null: false
      t.string :code_challenge, null: false
      t.string :nonce, null: false
      t.string :provider_verifier, null: false
      t.references :user, foreign_key: true
      t.string :exchange_digest
      t.datetime :expires_at, null: false
      t.datetime :callback_at
      t.datetime :exchanged_at
      t.timestamps
    end
    add_index :social_login_attempts, :state_digest, unique: true
    add_index :social_login_attempts, :exchange_digest, unique: true
    add_index :social_login_attempts, :expires_at
  end
end
