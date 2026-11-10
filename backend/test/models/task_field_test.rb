require "test_helper"

class TaskFieldTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ada-task-field@example.com", password: "password123")
    @workspace = @user.workspace
    @task = @workspace.tasks.create!(title: "Ship it")
  end

  test "each of the five kinds can be created" do
    TaskFieldType::KINDS.each do |type|
      options = type == "dropdown" ? [ "High", "Low" ] : []
      field = @workspace.task_fields.create!(name: "Field #{type}", field_type: type, options: options)
      assert field.public_send(:"#{type}?")
    end
  end

  test "names are unique per Space ignoring case, and trimmed" do
    @workspace.task_fields.create!(name: "  Priority ", field_type: "rating")
    assert_equal "Priority", @workspace.task_fields.first.name

    duplicate = @workspace.task_fields.build(name: "priority", field_type: "checkbox")
    assert_not duplicate.valid?

    other = User.create!(name: "Bo", email: "bo-task-field@example.com", password: "password123").workspace
    assert other.task_fields.build(name: "Priority", field_type: "rating").valid?
  end

  test "an unknown kind is rejected and the kind cannot change later" do
    assert_not @workspace.task_fields.build(name: "Odd", field_type: "emoji").valid?

    field = @workspace.task_fields.create!(name: "Done?", field_type: "checkbox")
    field.field_type = "rating"
    assert_not field.valid?
    assert_includes field.errors[:field_type], "cannot be changed once the field exists"
  end

  test "dropdown needs choices, other kinds take none, and choices are tidied" do
    assert_not @workspace.task_fields.build(name: "Stage", field_type: "dropdown").valid?
    assert_not @workspace.task_fields.build(name: "Stars", field_type: "rating", options: [ "x" ]).valid?
    assert_not @workspace.task_fields.build(name: "Long", field_type: "dropdown", options: [ "x" * 41 ]).valid?

    field = @workspace.task_fields.create!(name: "Stage", field_type: "dropdown", options: [ " Draft ", "draft", "", "Final" ])
    assert_equal [ "Draft", "Final" ], field.options
  end

  test "removing a dropdown choice clears the values that used it" do
    field = @workspace.task_fields.create!(name: "Stage", field_type: "dropdown", options: [ "Draft", "Final" ])
    other_task = @workspace.tasks.create!(title: "Other")
    TaskFieldValue.write(@task, field, "Draft")
    TaskFieldValue.write(other_task, field, "Final")

    field.update!(options: [ "Final", "Shipped" ])

    assert_nil @task.field_values.find_by(task_field: field)
    assert_equal "Final", other_task.field_values.find_by(task_field: field).value
  end

  test "deleting a field or a task deletes the values" do
    field = @workspace.task_fields.create!(name: "Labels", field_type: "tags")
    TaskFieldValue.write(@task, field, [ "ui" ])
    assert_difference("TaskFieldValue.count", -1) { field.destroy }

    field = @workspace.task_fields.create!(name: "Stars", field_type: "rating")
    TaskFieldValue.write(@task, field, 4)
    assert_difference("TaskFieldValue.count", -1) { @task.destroy }
  end

  test "tag values are tidied and limited" do
    field = @workspace.task_fields.create!(name: "Labels", field_type: "tags")
    value = TaskFieldValue.write(@task, field, [ " api ", "API", "ui", "" ])
    assert_empty value.errors
    assert_equal [ "api", "ui" ], value.value

    assert_predicate TaskFieldValue.write(@task, field, (1..21).map { |n| "tag#{n}" }).errors, :any?
    assert_predicate TaskFieldValue.write(@task, field, [ "x" * 41 ]).errors, :any?
    assert_predicate TaskFieldValue.write(@task, field, "api").errors, :any?
    assert_equal [ "api", "ui" ], @task.field_values.find_by(task_field: field).value
  end

  test "dropdown values must be one of the choices" do
    field = @workspace.task_fields.create!(name: "Stage", field_type: "dropdown", options: [ "Draft", "Final" ])
    assert_empty TaskFieldValue.write(@task, field, "Draft").errors
    assert_predicate TaskFieldValue.write(@task, field, "Nope").errors, :any?
    assert_equal "Draft", @task.field_values.find_by(task_field: field).value
  end

  test "checkbox stores only true and rating only 1 to 5" do
    box = @workspace.task_fields.create!(name: "Reviewed", field_type: "checkbox")
    assert_empty TaskFieldValue.write(@task, box, true).errors
    assert_predicate TaskFieldValue.write(@task, box, "yes").errors, :any?

    stars = @workspace.task_fields.create!(name: "Stars", field_type: "rating")
    [ 1, 5 ].each { |n| assert_empty TaskFieldValue.write(@task, stars, n).errors }
    [ 0, 6, 2.5, "3" ].each { |n| assert_predicate TaskFieldValue.write(@task, stars, n).errors, :any?, n.inspect }
    assert_equal 5, @task.field_values.find_by(task_field: stars).value
  end

  test "an empty value removes the stored one" do
    box = @workspace.task_fields.create!(name: "Reviewed", field_type: "checkbox")
    tags = @workspace.task_fields.create!(name: "Labels", field_type: "tags")
    stars = @workspace.task_fields.create!(name: "Stars", field_type: "rating")
    TaskFieldValue.write(@task, box, true)
    TaskFieldValue.write(@task, tags, [ "a" ])
    TaskFieldValue.write(@task, stars, 3)
    assert_equal 3, @task.field_values.count

    assert_difference("TaskFieldValue.count", -3) do
      TaskFieldValue.write(@task, box, false)
      TaskFieldValue.write(@task, tags, [ " " ])
      TaskFieldValue.write(@task, stars, nil)
    end
  end

  test "a value for a field from another Space is rejected" do
    other = User.create!(name: "Bo", email: "bo-task-field-2@example.com", password: "password123").workspace
    foreign = other.task_fields.create!(name: "Stars", field_type: "rating")
    value = TaskFieldValue.write(@task, foreign, 3)
    assert_includes value.errors[:task_field], "must belong to the task's Space"
  end

  # ── Collection field types (custom-fields-on-tasks) ─────────────────────

  test "a task field can be any Collection type that holds a value, a person or a formula" do
    assert_includes TaskFieldType::TYPES, "money"
    assert_includes TaskFieldType::TYPES, "person"
    assert_includes TaskFieldType::TYPES, "formula"
    assert_not_includes TaskFieldType::TYPES, "relation"
    assert_not_includes TaskFieldType::TYPES, "auto_number"
    assert_equal 1, TaskFieldType::TYPES.count("rating")
  end

  test "values are read and checked with the Collection rules, and stored plain" do
    cost = @workspace.task_fields.create!(name: "Cost", field_type: "money", display_format: "eur")
    record = TaskFieldValue.write(@task, cost, "$1,250.50")
    assert record.persisted?
    assert_equal 1250.5, record.reload.value
    assert_not TaskFieldValue.write(@task, cost, "a lot").errors.empty?

    email = @workspace.task_fields.create!(name: "Contact", field_type: "email")
    assert_not TaskFieldValue.write(@task, email, "not an email").errors.empty?
    assert TaskFieldValue.write(@task, email, " pat@example.com ").persisted?

    due = @workspace.task_fields.create!(name: "Review on", field_type: "date")
    assert TaskFieldValue.write(@task, due, "2026-12-01").persisted?
    TaskFieldValue.write(@task, due, "")
    assert_nil @task.field_values.find_by(task_field: due)
  end

  test "a format must be one of the type's, and a blank one means the default" do
    assert_not @workspace.task_fields.build(name: "Cost", field_type: "money", display_format: "stars").valid?
    field = @workspace.task_fields.create!(name: "Cost", field_type: "money", display_format: "")
    assert_nil field.display_format
    assert field.update(display_format: "gbp")
  end

  test "single and multi selects need choices, and removed choices leave the tasks" do
    assert_not @workspace.task_fields.build(name: "Stage", field_type: "single_select", options: []).valid?
    labels = @workspace.task_fields.create!(name: "Labels", field_type: "multi_select", options: %w[Bug Feature Docs])
    TaskFieldValue.write(@task, labels, "Bug, Docs")
    labels.update!(options: %w[Bug Feature])
    assert_equal %w[Bug], @task.field_values.find_by(task_field: labels).value
    labels.update!(options: %w[Feature])
    assert_nil @task.field_values.find_by(task_field: labels)
  end

  test "a person must be able to open the Space" do
    owner = @workspace.task_fields.create!(name: "Reviewer", field_type: "person")
    assert TaskFieldValue.write(@task, owner, @user.id).persisted?
    stranger = User.create!(name: "Cy", email: "cy-task-field@example.com", password: "password123")
    assert_not TaskFieldValue.write(@task, owner, stranger.id).errors.empty?
  end

  test "a formula needs its formula, never stores values, and follows renames" do
    assert_not @workspace.task_fields.build(name: "Late", field_type: "formula").valid?
    assert_not @workspace.task_fields.build(name: "Late", field_type: "formula", formula: "{Late} + 1").valid?
    estimate = @workspace.task_fields.create!(name: "Estimate", field_type: "number")
    double = @workspace.task_fields.create!(name: "Double", field_type: "formula", formula: "{Estimate} * 2")
    assert_not TaskFieldValue.write(@task, double, 4).errors.empty?
    estimate.update!(name: "Hours")
    assert_equal "{Hours} * 2", double.reload.formula
    assert_nil @workspace.task_fields.create!(name: "Plain", field_type: "text", formula: "{Hours}").formula
  end
end
