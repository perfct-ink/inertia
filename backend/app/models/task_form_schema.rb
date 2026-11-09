# The questions on a task form, and how a filled-in form becomes a task.
# Pure Ruby on plain hashes (no database), so TaskForm only has to store the
# questions and TaskFormSchemaTest can exercise every rule directly.
#
# A question is { "id", "label", "kind", "target", "required", "options" }.
# `target` says what the answer fills in on the new task; "details" answers
# have no field of their own, so they are written into the description as
# "Label: answer" lines.
module TaskFormSchema
  KINDS = %w[short_text long_text date choice].freeze

  # Which kinds of question can fill in each part of the task.
  TARGET_KINDS = {
    "title" => %w[short_text],
    "description" => %w[short_text long_text],
    "start_date" => %w[date],
    "due_date" => %w[date],
    "details" => KINDS
  }.freeze

  # A task has one of each of these, so a form may ask for each only once.
  SINGLE_TARGETS = %w[title description start_date due_date].freeze

  MAX_QUESTIONS = 20
  MAX_OPTIONS = 20
  MAX_LABEL = 120
  MAX_OPTION = 100
  MAX_ANSWER = { "short_text" => 255, "long_text" => 5_000, "choice" => MAX_OPTION, "date" => 10 }.freeze
  ID_FORMAT = /\A[a-z0-9_]{1,40}\z/

  # What a new form asks until its owner changes it: a title and some details.
  STARTER_QUESTIONS = [
    { "id" => "title", "label" => "Title", "kind" => "short_text", "target" => "title", "required" => true, "options" => [] },
    { "id" => "details", "label" => "Details", "kind" => "long_text", "target" => "description", "required" => false, "options" => [] }
  ].freeze

  # What reading a filled-in form gives: the task attributes, the answers to
  # keep on the submission (label and value, in question order) and any
  # problems with what was filled in.
  Parsed = Struct.new(:attributes, :answers, :errors)

  module_function

  # Clean up what a client sent: only the known keys, text trimmed, options
  # only on choice questions, and the title question always required. Anything
  # that isn't a list of hashes is returned as is for `problems` to report.
  def normalize(questions)
    return questions unless questions.is_a?(Array) && questions.all?(Hash)

    questions.map do |question|
      question = question.transform_keys(&:to_s)
      kind = question["kind"].to_s
      target = question["target"].to_s
      {
        "id" => question["id"].to_s.strip,
        "label" => question["label"].to_s.strip,
        "kind" => kind,
        "target" => target,
        "required" => target == "title" || question["required"] == true || question["required"] == "true",
        "options" => kind == "choice" ? Array(question["options"]).map { |option| option.to_s.strip }.reject(&:empty?).uniq : []
      }
    end
  end

  # Why a list of (normalized) questions can't be saved as a form; empty when fine.
  def problems(questions)
    return [ "Questions must be a list" ] unless questions.is_a?(Array) && questions.all?(Hash)
    return [ "A form needs at least one question" ] if questions.empty?

    problems = []
    problems << "A form can have at most #{MAX_QUESTIONS} questions" if questions.size > MAX_QUESTIONS
    problems << "Question ids must be unique" if questions.map { |q| q["id"] }.uniq.size != questions.size
    questions.each_with_index { |question, index| problems.concat(question_problems(question, index + 1)) }
    problems.concat(target_problems(questions))
    problems
  end

  # Turn answers (question id => text) into a task's attributes. Blank
  # optional answers are skipped; blank required ones, text that is too long,
  # a date that isn't one or a choice that isn't offered are reported.
  def parse(questions, answers)
    answers = (answers || {}).to_h.transform_keys(&:to_s)
    attributes = {}
    kept = []
    details = []
    errors = []

    questions.each do |question|
      value, problem = read_answer(question, answers[question["id"]])
      errors << problem if problem
      next if value.nil?

      kept << { "label" => question["label"], "value" => value }
      case question["target"]
      when "details" then details << "#{question['label']}: #{value}"
      else attributes[question["target"].to_sym] = value
      end
    end

    description = [ attributes[:description], details.join("\n") ].reject { |part| part.nil? || part.empty? }.join("\n\n")
    attributes[:description] = description.empty? ? nil : description
    Parsed.new(attributes, kept, errors)
  end

  def question_problems(question, number)
    name = "Question #{number}"
    problems = []
    problems << "#{name} needs an id (letters, numbers or underscores)" unless question["id"].to_s.match?(ID_FORMAT)
    problems << "#{name} needs a label" if question["label"].to_s.empty?
    problems << "#{name}'s label is too long (at most #{MAX_LABEL} characters)" if question["label"].to_s.length > MAX_LABEL
    problems << "#{name} has an unknown type" unless KINDS.include?(question["kind"])
    problems << "#{name} fills in an unknown part of the task" unless TARGET_KINDS.key?(question["target"])
    if KINDS.include?(question["kind"]) && TARGET_KINDS.key?(question["target"]) && !TARGET_KINDS[question["target"]].include?(question["kind"])
      problems << "#{name} can't fill in the task's #{question['target'].tr('_', ' ')} as a #{question['kind'].tr('_', ' ')} question"
    end
    problems.concat(option_problems(question, name))
    problems
  end

  def option_problems(question, name)
    options = question["options"]
    return [] unless question["kind"] == "choice"
    return [ "#{name} needs a list of choices" ] unless options.is_a?(Array)
    return [ "#{name} needs at least two choices" ] if options.size < 2
    return [ "#{name} can have at most #{MAX_OPTIONS} choices" ] if options.size > MAX_OPTIONS
    return [ "#{name}'s choices are too long (at most #{MAX_OPTION} characters)" ] if options.any? { |option| option.to_s.length > MAX_OPTION }
    []
  end

  def target_problems(questions)
    problems = []
    problems << "A form needs a question for the task's title" unless questions.any? { |q| q["target"] == "title" }
    SINGLE_TARGETS.each do |target|
      problems << "Only one question can fill in the task's #{target.tr('_', ' ')}" if questions.count { |q| q["target"] == target } > 1
    end
    problems
  end

  # [value, problem]: the cleaned answer (nil when left blank) or what is
  # wrong with it.
  def read_answer(question, raw)
    label = question["label"]
    return [ nil, "#{label} must be text" ] unless raw.nil? || raw.is_a?(String) || raw.is_a?(Numeric)

    value = raw.to_s.strip
    return [ nil, (question["required"] ? "#{label} can't be blank" : nil) ] if value.empty?

    case question["kind"]
    when "date"
      begin
        [ Date.iso8601(value).iso8601, nil ]
      rescue ArgumentError
        [ nil, "#{label} must be a date" ]
      end
    when "choice"
      question["options"].include?(value) ? [ value, nil ] : [ nil, "#{label} must be one of the choices" ]
    else
      max = MAX_ANSWER.fetch(question["kind"], MAX_ANSWER["short_text"])
      value.length > max ? [ nil, "#{label} is too long (at most #{max} characters)" ] : [ value, nil ]
    end
  end
  private_class_method :question_problems, :option_problems, :target_problems, :read_answer
end
