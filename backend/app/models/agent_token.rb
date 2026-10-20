# A credential for an outside agent (Claude, Claude Code, ...). It reaches one
# Space, or one folder in it, with read-only or read-write rights, until revoked.
# Only a digest is stored: the token itself is shown once, when it is made.
class AgentToken < ApplicationRecord
  PREFIX = "inertia_agent_".freeze

  belongs_to :workspace
  belongs_to :folder, optional: true
  belongs_to :created_by, class_name: "User", optional: true
  has_many :activities, class_name: "AgentActivity", dependent: :destroy

  enum :permission, { read: 0, write: 1 }, prefix: :can

  validates :name, presence: true
  validates :token_digest, :token_prefix, presence: true
  validate :folder_in_workspace

  scope :active, -> { where(revoked_at: nil) }

  # Makes a token and returns [record, the plain token]. The plain token is not
  # recoverable afterwards.
  def self.issue!(workspace:, name:, permission: :read, folder: nil, created_by: nil)
    plain = PREFIX + SecureRandom.urlsafe_base64(32)
    record = create!(workspace: workspace, name: name, permission: permission, folder: folder, created_by: created_by,
                     token_digest: digest(plain), token_prefix: plain.first(PREFIX.size + 6))
    [ record, plain ]
  end

  # The active token for a plain token string, or nil.
  def self.authenticate(plain)
    return nil unless plain.to_s.start_with?(PREFIX)
    active.find_by(token_digest: digest(plain))
  end

  def self.digest(plain)
    OpenSSL::Digest::SHA256.hexdigest(plain)
  end

  def revoke!
    update!(revoked_at: Time.current)
  end

  def revoked? = revoked_at.present?

  def touch_used!
    update_column(:last_used_at, Time.current)
  end

  def writable? = can_write?

  # Folders the token may reach: all of the Space's, or the scoped folder and what is under it.
  def folder_ids
    folder ? folder.self_and_descendant_ids : workspace.folders.pluck(:id)
  end

  def covers_folder?(folder_id)
    folder.nil? ? workspace.folders.exists?(id: folder_id) : folder_ids.include?(folder_id)
  end

  def covers_document?(document)
    document.folder.workspace_id == workspace_id && (folder.nil? || folder_ids.include?(document.folder_id))
  end

  private

  def folder_in_workspace
    errors.add(:folder, "must be in the same space") if folder && folder.workspace_id != workspace_id
  end
end
