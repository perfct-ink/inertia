# Assignees and watchers on a task (`assignee_ids=`, `watcher_ids=`).
# Changes are held until the task saves, so a bad id leaves nothing half
# written. Everyone must be a member of the task's workspace. The first
# assignee is mirrored in `assignee_id` for clients that only know one.
module HasParticipants
  extend ActiveSupport::Concern

  included do
    has_many :participants, class_name: "TaskParticipant", dependent: :destroy, inverse_of: :task
    validate :participants_are_workspace_members
    after_save :save_pending_participants
  end

  def assignee_ids = participant_ids_for(:assignee)

  def watcher_ids = participant_ids_for(:watcher)

  def assignee_ids=(ids)
    pending_participants[:assignee] = clean_ids(ids)
    self.assignee_id = pending_participants[:assignee].first
  end

  def watcher_ids=(ids)
    pending_participants[:watcher] = clean_ids(ids)
  end

  private

  def pending_participants = (@pending_participants ||= {})

  def participant_ids_for(role)
    return pending_participants[role] if pending_participants.key?(role)
    return [] unless persisted?

    participants.select { |p| p.role == role.to_s }.sort_by(&:id).map(&:user_id)
  end

  def clean_ids(ids) = Array(ids).reject(&:blank?).map(&:to_i).uniq

  def participants_are_workspace_members
    ids = pending_participants.values.flatten.uniq
    return if ids.empty? || workspace.nil?

    missing = ids - workspace.members.where(id: ids).pluck(:id)
    errors.add(:base, "Assignees and watchers must be members of the Space") if missing.any?
  end

  def save_pending_participants
    # Take the single-assignee column too, so older clients keep working.
    if saved_change_to_assignee_id? && !pending_participants.key?(:assignee)
      pending_participants[:assignee] = (assignee_ids - [ assignee_id_before_last_save ].compact + [ assignee_id ]).compact.uniq
    end
    pending_participants.each do |role, ids|
      participants.where(role: role).where.not(user_id: ids).destroy_all
      (ids - participants.where(role: role).pluck(:user_id)).each { |id| participants.create!(role: role, user_id: id) }
    end
    participants.reset
    @pending_participants = nil
  end
end
