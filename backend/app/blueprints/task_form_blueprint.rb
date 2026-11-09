class TaskFormBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :questions, :enabled, :public_access, :default_status,
    :epic_id, :folder_id, :assignee_id, :created_at, :updated_at

  # The public link's token, only while the form is public (otherwise there is
  # no link to build and nothing to leak to a viewer).
  field :token do |form|
    form.public_access? ? form.token : nil
  end

  # Whether the server allows public links at all (PUBLIC_FORMS_ENABLED).
  field :public_links_available do
    TaskForm.public_forms_enabled?
  end

  # List requests pass `counts: { form_id => n }` from one grouped query;
  # a single form counts for itself.
  field :submissions_count do |form, options|
    (options[:counts] || {}).fetch(form.id) { form.submissions.count }
  end
end
