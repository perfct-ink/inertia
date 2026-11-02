# What someone filling in a form on a public link gets to see: the questions,
# nothing about where the tasks go or who owns the form.
class PublicTaskFormBlueprint < Blueprinter::Base
  fields :title, :description
  field :questions do |form|
    form.questions.map { |question| question.slice("id", "label", "kind", "required", "options") }
  end
end
