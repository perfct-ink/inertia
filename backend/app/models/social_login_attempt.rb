require "digest"

class SocialLoginAttempt < ApplicationRecord
  belongs_to :user, optional: true
  validates :provider, inclusion: { in: %w[apple google] }
  validates :state_digest, :nonce, :provider_verifier, :expires_at, presence: true
  validates :client_state, format: { with: /\A[A-Za-z0-9_-]{32,128}\z/ }
  validates :code_challenge, format: { with: /\A[A-Za-z0-9_-]{43}\z/ }

  def self.digest(value)
    Digest::SHA256.hexdigest(value.to_s)
  end

  def exchange!(verifier)
    with_lock do
      raise Auth::SocialSignIn::Error, "This sign-in has expired. Please try again." if expires_at <= Time.current || exchanged_at || user_id.nil?
      unless verifier.to_s.match?(/\A[A-Za-z0-9._~-]{43,128}\z/) && ActiveSupport::SecurityUtils.secure_compare(code_challenge, Auth::SocialSignIn.challenge(verifier))
        raise Auth::SocialSignIn::Error, "Unable to verify this sign-in. Please try again."
      end
      update!(exchanged_at: Time.current)
      user
    end
  end
end
