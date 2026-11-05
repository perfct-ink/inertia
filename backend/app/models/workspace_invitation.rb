# An invitation to join a Space by email. Pending until the invited person,
# signed in with that email, accepts it with the token from the invite link.
class WorkspaceInvitation < ApplicationRecord
  belongs_to :workspace
  belongs_to :invited_by, class_name: "User", optional: true

  has_secure_token :token

  enum :role, WorkspaceMembership.roles, scopes: false, validate: true

  normalizes :email, with: ->(email) { email.strip.downcase }

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :email, uniqueness: { scope: :workspace_id, message: "has already been invited" }
  validate :not_already_a_member, on: :create
  validate :workspace_is_shareable, on: :create

  scope :pending, -> { where(accepted_at: nil) }

  def pending? = accepted_at.nil?

  # Adds the user to the Space with the invited role. The signed-in email has
  # to be the invited one, so a forwarded link alone doesn't grant access.
  def accept!(user)
    raise ActiveRecord::RecordNotFound unless pending? && user.email.to_s.downcase == email

    transaction do
      membership = workspace.memberships.find_or_create_by!(user: user) { |m| m.role = role }
      update!(accepted_at: Time.current)
      membership
    end
  end

  private

  def not_already_a_member
    errors.add(:email, "is already a member") if workspace&.members&.exists?(email: email)
  end

  def workspace_is_shareable
    errors.add(:base, "A personal Space can't be shared") if workspace&.personal?
  end
end
