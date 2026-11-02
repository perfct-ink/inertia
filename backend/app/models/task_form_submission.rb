# One filled-in TaskForm: the task it made and the answers behind it (label
# and value pairs, so they still read right if the form is edited later).
# Deleting the task deletes this (foreign key cascade).
class TaskFormSubmission < ApplicationRecord
  belongs_to :task_form, inverse_of: :submissions
  belongs_to :task
  belongs_to :submitted_by, class_name: "User", optional: true
end
