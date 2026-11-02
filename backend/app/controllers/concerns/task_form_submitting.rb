module TaskFormSubmitting
  extend ActiveSupport::Concern

  private

  # { question id => answer } from the request. Anything else sent is kept
  # out by TaskFormSchema.parse, which only reads the form's own questions.
  def answers_param
    answers = params[:answers]
    answers.respond_to?(:to_unsafe_h) ? answers.to_unsafe_h : {}
  end
end
