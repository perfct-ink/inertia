# A credential for an outside agent (Claude, Claude Code, ...). It reaches one
# Space, or one folder in it, with read-only or read-write rights, until revoked.
#
# Security rules (docs/features/agent_access.md):
# - Only a SHA-256 digest is stored. The token itself is shown once, when it is
#   made, and is never logged. (It has 256 bits of randomness, so a fast digest
#   is enough; there is nothing to brute-force.)
# - Only a Space owner makes one, and it works only while that owner is still an
#   owner of the Space and any folder it is limited to is still in the Space.
# - Revoking takes effect on the next request: every request looks the token up.
class AgentToken < ApplicationRecord
  PREFIX = "inertia_agent_".freeze
  # Longer strings cannot be one of ours; skip the lookup.
  MAX_LENGTH = PREFIX.size + 64
  MAX_ACTIVE_PER_SPACE = 25
  # last_used_at is a hint for owners, not an audit log: write it at most this often.
  LAST_USED_RESOLUTION = 1.minute

  belongs_to :workspace
  belongs_to :folder, optional: true
  belongs_to :created_by, class_name: "User", optional: true
  has_many :activities, class_name: "AgentActivity", dependent: :destroy

  enum :permission, { read: 0, write: 1 }, prefix: :permission, validate: true

  validates :name, presence: true, length: { maximum: 80 }
  validates :token_digest, :token_prefix, presence: true
  validate :folder_in_workspace
  validate :created_by_is_an_owner, :space_has_room, on: :create

  scope :active, -> { where(revoked_at: nil) }

  # Makes a token and returns [record, the plain token]. The plain token is not
  # recoverable afterwards.
  def self.issue!(workspace:, name:, created_by:, permission: :read, folder: nil)
    plain = PREFIX + SecureRandom.urlsafe_base64(32)
    record = create!(workspace: workspace, name: name.to_s.strip, permission: permission, folder: folder, created_by: created_by,
                     token_digest: digest(plain), token_prefix: plain.first(PREFIX.size + 4))
    [ record, plain ]
  end

  # The token for a plain token string, or nil when it is unknown, revoked or no
  # longer usable. Callers must answer all of these the same way.
  def self.authenticate(plain)
    plain = plain.to_s
    return nil unless plain.start_with?(PREFIX) && plain.size <= MAX_LENGTH
    token = active.includes(:workspace, :folder).find_by(token_digest: digest(plain))
    token if token&.usable?
  end

  def self.digest(plain)
    OpenSSL::Digest::SHA256.hexdigest(plain)
  end

  def revoke!
    update!(revoked_at: Time.current) unless revoked?
  end

  def revoked? = revoked_at.present?

  def writable? = permission_write?

  # Whether the token may be used right now (the checks `authenticate` runs after
  # finding it): not revoked, still scoped inside its Space, made by someone who
  # is still an owner of that Space.
  def usable?
    !revoked? && scope_intact? && created_by_owns_space?
  end

  # A folder-limited token whose folder moved to another Space (folders can be
  # transferred) or is gone stops working; it never falls back to the whole Space.
  def scope_intact?
    folder_id.nil? || (folder.present? && folder.workspace_id == workspace_id)
  end

  def touch_used!
    return if last_used_at && last_used_at > LAST_USED_RESOLUTION.ago
    update_column(:last_used_at, Time.current)
  end

  # The folders the token reaches: the Space's own, or the scoped folder and what
  # is under it. Always inside the token's Space, and empty when the scope is broken.
  def folder_ids
    @folder_ids ||= begin
      folders = workspace.folders
      folders = folders.where(id: folder.self_and_descendant_ids) if folder
      scope_intact? ? folders.pluck(:id) : []
    end
  end

  def covers_folder?(folder_id)
    folder_ids.include?(folder_id)
  end

  def covers_document?(document)
    covers_folder?(document.folder_id)
  end

  # The Space tasks the token reaches: all of them, or (for a folder token) those
  # in the folder, below it, or on a document in it.
  def tasks
    return workspace.tasks unless folder
    ids = folder_ids
    workspace.tasks.where("tasks.folder_id IN (?) OR tasks.document_id IN (?)", ids, Document.where(folder_id: ids).select(:id))
  end

  # The documents and Collections the token reaches (spreadsheets and uploaded files are not included).
  def documents
    Document.where(folder_id: folder_ids, doc_type: %w[document table])
  end

  private

  def folder_in_workspace
    errors.add(:folder, "must be in the same space") if folder && folder.workspace_id != workspace_id
  end

  def created_by_owns_space?
    created_by_id.present? && workspace.memberships.owner.exists?(user_id: created_by_id)
  end

  def created_by_is_an_owner
    errors.add(:created_by, "must be an owner of the space") unless created_by_owns_space?
  end

  def space_has_room
    errors.add(:base, "A space can have at most #{MAX_ACTIVE_PER_SPACE} active agent tokens; revoke one first") if workspace && workspace.agent_tokens.active.count >= MAX_ACTIVE_PER_SPACE
  end
end
