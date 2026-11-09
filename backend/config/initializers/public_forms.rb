# Whether a Space admin may open a form to anyone holding its link, with no
# account (see TaskForm and docs/features/task_forms.md). Off unless the
# deployment sets PUBLIC_FORMS_ENABLED=true; while it is off every public form
# address answers 404 and the builder cannot turn the link on.
Rails.application.config.x.public_forms_enabled = ENV["PUBLIC_FORMS_ENABLED"] == "true"
