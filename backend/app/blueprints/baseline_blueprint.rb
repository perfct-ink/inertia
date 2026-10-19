class BaselineBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :folder_id, :created_at

  field(:tasks) do |baseline|
    baseline.baseline_tasks.map { |bt| { task_id: bt.task_id, start_date: bt.start_date, due_date: bt.due_date } }
  end
end
