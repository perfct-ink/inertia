require "test_helper"

class TaskFieldTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ada-task-field@example.com", password: "password123")
    @workspace = @user.workspace
    @task = @workspace.tasks.create!(title: "Ship it")
  end

  test "each kind can be created" do
    TaskFieldType::TYPES.each do |type|
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

  test "text, integer, number and date fields store plain values and reject the rest" do
    cases = {
      "text" => { ok: [ "Needs a design", "0" ], bad: [ 5, true, [ "a" ], "x" * 501 ] },
      "integer" => { ok: [ 0, -3, 42, 1_000_000_000_000 ], bad: [ 1.5, "4", true, 1_000_000_000_001 ] },
      "number" => { ok: [ 0, -3.5, 12.25 ], bad: [ "4", true, 1.0e13 ] },
      "date" => { ok: [ "2026-11-07", "2028-02-29" ], bad: [ "2026-02-30", "11/07/2026", 20_261_107 ] }
    }
    cases.each do |type, values|
      field = @workspace.task_fields.create!(name: "Field #{type}", field_type: type)
      values[:ok].each { |value| assert_empty TaskFieldValue.write(@task, field, value).errors, "#{type} rejected #{value.inspect}" }
      stored = @task.field_values.find_by(task_field: field).value
      values[:bad].each do |value|
        assert_predicate TaskFieldValue.write(@task, field, value).errors, :any?, "#{type} accepted #{value.inspect}"
        assert_equal stored, @task.field_values.find_by(task_field: field).value
      end
    end
  end

  test "zero is a value but an empty or blank text is not" do
    count = @workspace.task_fields.create!(name: "Count", field_type: "integer")
    note = @workspace.task_fields.create!(name: "Note", field_type: "text")
    day = @workspace.task_fields.create!(name: "Review on", field_type: "date")
    TaskFieldValue.write(@task, count, 0)
    TaskFieldValue.write(@task, note, "Ship it")
    TaskFieldValue.write(@task, day, "2026-11-07")
    assert_equal 0, @task.field_values.find_by(task_field: count).value

    assert_difference("TaskFieldValue.count", -3) do
      TaskFieldValue.write(@task, count, nil)
      TaskFieldValue.write(@task, note, "   ")
      TaskFieldValue.write(@task, day, "")
    end
  end

  test "the scalar kinds are Collection types, so both use the same rules" do
    assert_empty TaskFieldType::SCALAR_TYPES - FieldValue::TYPES
    assert_not TaskFieldType.valid_value?("date", "2026-02-30")
    assert_not TaskFieldType.valid_value?("integer", 1.5)
    assert TaskFieldType.valid_value?("number", 1.5)
  end

  test "a person field names someone who can open the Space" do
    teammate = User.create!(name: "Tess", email: "tess-task-field@example.com", password: "password123")
    outsider = User.create!(name: "Out", email: "out-task-field@example.com", password: "password123")
    @workspace.memberships.create!(user: teammate, role: :member)
    reviewer = @workspace.task_fields.create!(name: "Reviewer", field_type: "person")

    assert_empty TaskFieldValue.write(@task, reviewer, teammate.id).errors
    assert_empty TaskFieldValue.write(@task, reviewer, @user.id).errors
    assert_predicate TaskFieldValue.write(@task, reviewer, outsider.id).errors, :any?
    assert_predicate TaskFieldValue.write(@task, reviewer, "Tess").errors, :any?
    assert_predicate TaskFieldValue.write(@task, reviewer, 0).errors, :any?
    assert_equal @user.id, @task.field_values.find_by(task_field: reviewer).value
  end

  test "only integer and number fields have a display format, and it must be one of theirs" do
    assert_equal %w[plain commas], TaskFieldType.formats("integer")
    assert_equal %w[plain commas], TaskFieldType.formats("number")
    assert_empty TaskFieldType.formats("date")

    assert @workspace.task_fields.build(name: "Cost", field_type: "number", display_format: "commas").valid?
    assert @workspace.task_fields.build(name: "Count", field_type: "integer", display_format: "").valid?
    assert_not @workspace.task_fields.build(name: "Cost 2", field_type: "number", display_format: "roman").valid?
    assert_not @workspace.task_fields.build(name: "Day", field_type: "date", display_format: "commas").valid?

    field = @workspace.task_fields.create!(name: "Cost 3", field_type: "number", display_format: "commas")
    field.update!(display_format: "")
    assert_nil field.display_format
  end
end
