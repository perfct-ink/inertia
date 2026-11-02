# Gives a model an activity log (see Activity): an entry is written when a record
# is created and whenever one of its audited fields changes, attributed to
# Current.user (no user for background work).
#
#   audited :title, :status, :assignee, valueless: :description
#
# A field may name a belongs_to association, in which case the entry keeps the
# associated record's title or name instead of its id. `valueless` fields log
# that they changed but not the (long) values. Anything else, such as `position`,
# is not logged. Add the model to Activity::SUBJECT_TYPES.
module Auditable
  extend ActiveSupport::Concern

  # Longest text kept for a changed value.
  MAX_VALUE_LENGTH = 200

  included do
    class_attribute :audited_fields, instance_writer: false, default: []
    class_attribute :valueless_audited_fields, instance_writer: false, default: []

    has_many :activities, as: :subject, inverse_of: :subject, dependent: :delete_all

    after_create { Activity.log(subject: self, action: :created, actor: Current.user) }
    after_update :log_update_activity
  end

  class_methods do
    def audited(*fields, valueless: [])
      self.valueless_audited_fields = Array(valueless).map(&:to_s)
      self.audited_fields = fields.map(&:to_s) + valueless_audited_fields
    end
  end

  # The workspace the entries belong to; a model without a workspace_id overrides this.
  def activity_workspace_id
    workspace_id
  end

  private

  def log_update_activity
    field_changes = audited_changes
    Activity.log(subject: self, action: :updated, actor: Current.user, field_changes: field_changes) if field_changes.any?
  end

  # What the save just changed among the audited fields, for example
  # { "status" => ["todo", "done"], "assignee" => [nil, "Ada"], "description" => nil }.
  def audited_changes
    audited_fields.each_with_object({}) do |field, changes|
      reflection = self.class.reflect_on_association(field.to_sym)
      change = saved_change_to_attribute(reflection ? reflection.foreign_key : field)
      next unless change

      changes[field] =
        if valueless_audited_fields.include?(field) then nil
        elsif reflection then association_labels(reflection, change)
        else change.map { |value| value.is_a?(String) ? value.truncate(MAX_VALUE_LENGTH) : value }
        end
    end
  end

  # [from_id, to_id] -> [from_name, to_name]; a record that has since gone shows as #id.
  def association_labels(reflection, ids)
    records = reflection.klass.unscoped.where(id: ids.compact).index_by(&:id)
    ids.map do |id|
      next if id.nil?

      record = records[id]
      (record && (record.try(:title) || record.try(:name))) || "##{id}"
    end
  end
end
