# A link that lets anyone who holds the token read one thing without signing
# in: a document, a folder with the documents in it, or (shareable is the
# Space) the Space's roadmap. The token is the only credential; see
# docs/features/shared_links.md for what it reaches and how it is revoked.
class Share < ApplicationRecord
  belongs_to :shareable, polymorphic: true
  belongs_to :created_by, class_name: "User"

  # `edit` stays in the enum for links made before editing through a link was
  # ruled out. Every link opens read-only whatever its permission says, and a
  # new link can't be an edit link (links_are_view_only).
  enum :permission, { view: 0, edit: 1 }, validate: true

  # The document types a link can show. Spreadsheets, Collections and uploaded
  # files have no public read-only view yet.
  SHAREABLE_DOC_TYPES = %w[document].freeze
  # The longest a link may be set to live.
  MAX_EXPIRY_DAYS = 365

  before_create :generate_token

  validates :token, uniqueness: true
  validate :shareable_can_be_shared, on: :create
  validate :links_are_view_only, on: :create

  # Not yet past its expiry date (no date means it never expires).
  scope :live, -> { where("shares.expires_at IS NULL OR shares.expires_at > ?", Time.current) }

  # The share a public link opens. An unknown token, a revoked (deleted) or
  # expired link, and one whose document or folder has since been archived or
  # changed type all raise RecordNotFound, so a visitor can't tell them apart.
  def self.open!(token)
    share = live.find_by(token: token.to_s)
    raise ActiveRecord::RecordNotFound unless share&.reachable?
    share
  end

  def reachable?
    case shareable
    when Document then SHAREABLE_DOC_TYPES.include?(shareable.doc_type) && !shareable.folder.archived_in_tree?
    when Folder then !shareable.archived_in_tree?
    when Workspace then true
    else false
    end
  end

  # Whether a folder link reaches this document: it is a shareable type and
  # sits in the shared folder or below it, with no archived folder on the way.
  def covers?(document)
    return false unless shareable.is_a?(Folder) && SHAREABLE_DOC_TYPES.include?(document.doc_type)

    folder = document.folder
    seen = Set.new
    while folder && seen.add?(folder.id)
      return false if folder.archived?
      return true if folder.id == shareable_id
      folder = folder.parent
    end
    false
  end

  private

  # 128 bits from the system's secure random source, URL-safe (22 characters).
  def generate_token
    self.token = SecureRandom.urlsafe_base64(16)
  end

  def shareable_can_be_shared
    case shareable
    when Document
      errors.add(:base, "Only documents can be shared by link for now, not spreadsheets, Collections or files") unless SHAREABLE_DOC_TYPES.include?(shareable.doc_type)
    when Folder
      errors.add(:base, "A Space's root folder can't be shared") if shareable.root?
    end
  end

  def links_are_view_only
    errors.add(:base, "Editing through a link isn't available yet; share it as view only") if edit?
  end
end
