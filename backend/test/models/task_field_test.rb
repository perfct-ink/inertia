require "test_helper"

class TaskFieldTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ada-task-field@example.com", password: "password123")
    @workspace = @user.workspace
    @task = @workspace.tasks.create!(title: "Ship it")
  end

  test "every kind can be created" do
    TaskFieldType::TYPES.each do |type|
      options = type == "dropdown" ? [ "High", "Low" ] : []
      field = @workspace.task_fields.create!(name: "Field #{type}", field_type: type, options: options)
      assert field.public_send(:"#{type}?")
    end
  end

  test "the scalar kinds are the Collection types without boolean, since a checkbox is a task's yes or no" do
    assert_equal %w[text integer number date datetime], TaskFieldType::SCALAR_TYPES
    assert TaskFieldType::SCALAR_TYPES.all? { |type| TableField::DATA_TYPES.include?(type) }
    assert_equal TaskFieldType::SCALAR_TYPES + %w[tags dropdown checkbox rating vote], TaskFieldType::TYPES
    assert_not @workspace.task_fields.build(name: "Flag", field_type: "boolean").valid?
  end

  test "every scalar kind stores its value, keeping zero, and refuses one of the wrong type" do
    examples = {
      "text" => [ "Ada", 3 ], "integer" => [ 0, 1.5 ], "number" => [ 1.5, "1.5" ],
      "date" => [ "2026-10-04", "2026-02-30" ], "datetime" => [ "2026-10-04T10:30:00Z", "yesterday" ]
    }
    examples.each do |type, (valid, invalid)|
      field = @workspace.task_fields.create!(name: type, field_type: type)
      assert_empty TaskFieldValue.write(@task, field, valid).errors, type
      assert_equal valid, @task.field_values.find_by(task_field: field).value, type

      assert_predicate TaskFieldValue.write(@task, field, invalid).errors, :any?, "accepted #{invalid.inspect} as #{type}"
      assert_equal valid, @task.field_values.find_by(task_field: field).value, "a rejected value leaves the old one"
    end
  end

  test "nil and an empty string clear a scalar value, but zero stays" do
    note = @workspace.task_fields.create!(name: "Note", field_type: "text")
    points = @workspace.task_fields.create!(name: "Points", field_type: "integer")
    TaskFieldValue.write(@task, note, "hello")
    TaskFieldValue.write(@task, points, 0)
    assert_equal 2, @task.field_values.count

    assert_difference("TaskFieldValue.count", -1) { TaskFieldValue.write(@task, note, "") }
    assert_no_difference("TaskFieldValue.count") { TaskFieldValue.write(@task, points, 0) }
    assert_difference("TaskFieldValue.count", -1) { TaskFieldValue.write(@task, points, nil) }
  end

  test "scalar kinds take no choices" do
    assert_not @workspace.task_fields.build(name: "Note", field_type: "text", options: [ "x" ]).valid?
    assert @workspace.task_fields.build(name: "Note", field_type: "text").valid?
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
end
