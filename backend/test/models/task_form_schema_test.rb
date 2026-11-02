require "test_helper"

# TaskFormSchema is plain Ruby on hashes, so these tests touch no records.
class TaskFormSchemaTest < ActiveSupport::TestCase
  def questions(*extra)
    TaskFormSchema.normalize([
      { "id" => "summary", "label" => " Summary ", "kind" => "short_text", "target" => "title" },
      { "id" => "what", "label" => "What happened", "kind" => "long_text", "target" => "description" },
      { "id" => "severity", "label" => "Severity", "kind" => "choice", "target" => "details", "options" => [ "High", " Low ", "", "High" ] },
      { "id" => "needed", "label" => "Needed by", "kind" => "date", "target" => "due_date" }
    ] + extra)
  end

  test "normalize trims, keeps only known keys, dedupes choices and always requires the title" do
    normalized = questions
    assert_equal "Summary", normalized[0]["label"]
    assert normalized[0]["required"]
    assert_not normalized[1]["required"]
    assert_equal %w[High Low], normalized[2]["options"]
    assert_equal [], normalized[3]["options"]
    assert_equal %w[id kind label options required target], normalized[0].keys.sort
  end

  test "normalize leaves anything that isn't a list of hashes for problems to report" do
    assert_equal "nope", TaskFormSchema.normalize("nope")
    assert_equal [ 1 ], TaskFormSchema.normalize([ 1 ])
    assert_equal [ "Questions must be a list" ], TaskFormSchema.problems("nope")
  end

  test "the starter questions are valid" do
    assert_empty TaskFormSchema.problems(TaskFormSchema::STARTER_QUESTIONS)
  end

  test "problems: a title question is needed, once, and each part of the task is asked for once" do
    no_title = TaskFormSchema.normalize([ { "id" => "a", "label" => "A", "kind" => "short_text", "target" => "details" } ])
    assert_includes TaskFormSchema.problems(no_title), "A form needs a question for the task's title"
    assert_equal [ "A form needs at least one question" ], TaskFormSchema.problems([])

    twice = questions({ "id" => "needed2", "label" => "Also by", "kind" => "date", "target" => "due_date" })
    assert_includes TaskFormSchema.problems(twice), "Only one question can fill in the task's due date"
  end

  test "problems: ids, labels, types, targets and choices are checked" do
    bad = TaskFormSchema.normalize([
      { "id" => "a b", "label" => "", "kind" => "nope", "target" => "title" },
      { "id" => "a b", "label" => "Starts", "kind" => "date", "target" => "title" },
      { "id" => "c", "label" => "Pick", "kind" => "choice", "target" => "details", "options" => [ "only one" ] },
      { "id" => "d", "label" => "Due", "kind" => "short_text", "target" => "due_date" }
    ])
    problems = TaskFormSchema.problems(bad)
    assert_includes problems, "Question ids must be unique"
    assert_includes problems, "Question 1 needs an id (letters, numbers or underscores)"
    assert_includes problems, "Question 1 needs a label"
    assert_includes problems, "Question 1 has an unknown type"
    assert_includes problems, "Question 2 can't fill in the task's title as a date question"
    assert_includes problems, "Question 3 needs at least two choices"
    assert_includes problems, "Question 4 can't fill in the task's due date as a short text question"
  end

  test "problems: at most twenty questions" do
    many = TaskFormSchema.normalize((1..21).map { |i| { "id" => "q#{i}", "label" => "Q", "kind" => "short_text", "target" => i == 1 ? "title" : "details" } })
    assert_includes TaskFormSchema.problems(many), "A form can have at most 20 questions"
  end

  test "parse turns answers into task attributes and keeps label/value pairs" do
    parsed = TaskFormSchema.parse(questions, { "summary" => "Login is broken", "what" => "It returns 500", "severity" => "High", "needed" => "2026-12-01", "ignored" => "x" })
    assert_empty parsed.errors
    assert_equal({ title: "Login is broken", description: "It returns 500\n\nSeverity: High", due_date: "2026-12-01" }, parsed.attributes)
    assert_equal [ "Summary", "What happened", "Severity", "Needed by" ], parsed.answers.map { |a| a["label"] }
  end

  test "parse skips blank optional answers and reads symbol keys" do
    parsed = TaskFormSchema.parse(questions, { summary: "Just a title" })
    assert_empty parsed.errors
    assert_equal({ title: "Just a title", description: nil }, parsed.attributes)
    assert_equal 1, parsed.answers.size
  end

  test "parse reports blank required answers, bad dates, unoffered choices, long text and non-text" do
    parsed = TaskFormSchema.parse(questions, { "summary" => "  ", "severity" => "Medium", "needed" => "2026-02-30", "what" => [ "a" ] })
    assert_equal [ "Summary can't be blank", "What happened must be text", "Severity must be one of the choices", "Needed by must be a date" ], parsed.errors

    long = TaskFormSchema.parse(questions, { "summary" => "x" * 256 })
    assert_equal [ "Summary is too long (at most 255 characters)" ], long.errors
  end
end
