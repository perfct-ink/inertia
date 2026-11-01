require "test_helper"

class TaskFieldTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "task-field-ada@example.com", password: "password123")
    @workspace = @user.workspace
    @task = @workspace.tasks.create!(title: "Ship it")
  end

  test "a field has a trimmed name, a scalar type and is unique per Space regardless of case" do
    field = @workspace.task_fields.create!(name: "  Estimate ", data_type: "integer")
    assert_equal "Estimate", field.name

    assert_not @workspace.task_fields.build(name: "estimate", data_type: "text").valid?
    assert_not @workspace.task_fields.build(name: "", data_type: "text").valid?
    assert_not @workspace.task_fields.build(name: "Link", data_type: "relation").valid?, "relation fields are not supported on tasks"
    assert_not @workspace.task_fields.build(name: "Odd", data_type: "money").valid?

    other = User.create!(name: "Bo", email: "task-field-bo@example.com", password: "password123").workspace
    assert other.task_fields.build(name: "Estimate", data_type: "text").valid?
  end

  test "its types are the scalar types Collection fields use" do
    assert_equal FieldValue::TYPES, TaskField::DATA_TYPES
    assert TaskField::DATA_TYPES.all? { |type| TableField::DATA_TYPES.include?(type) }
  end

  test "a Space can have a limited number of fields" do
    TaskField::MAX_PER_WORKSPACE.times { |i| @workspace.task_fields.create!(name: "Field #{i}", data_type: "text") }
    extra = @workspace.task_fields.build(name: "One too many", data_type: "text")
    assert_not extra.valid?
    assert_includes extra.errors.full_messages.join, "at most #{TaskField::MAX_PER_WORKSPACE}"
  end

  test "the type cannot change while tasks have values, but the name can" do
    field = @workspace.task_fields.create!(name: "Estimate", data_type: "integer")
    @task.update!(custom_fields: { field.id.to_s => 3 })

    assert_not field.update(data_type: "text")
    assert field.update(name: "Points")

    @task.update!(custom_fields: { field.id.to_s => nil })
    assert field.update(data_type: "text")
  end

  test "every scalar type stores its value, keeping false and zero" do
    examples = {
      "text" => [ "Ada", 3 ], "integer" => [ 0, 1.5 ], "number" => [ 1.5, "1.5" ],
      "boolean" => [ false, "false" ], "date" => [ "2026-10-04", "2026-02-30" ],
      "datetime" => [ "2026-10-04T10:30:00Z", "yesterday" ]
    }
    examples.each do |type, (valid, invalid)|
      field = @workspace.task_fields.create!(name: type, data_type: type)
      @task.custom_fields = { field.id.to_s => valid }
      assert @task.save, @task.errors.full_messages.join(", ")
      assert_equal valid, @task.reload.custom_fields[field.id.to_s], type

      @task.custom_fields = { field.id.to_s => invalid }
      assert_not @task.save, "accepted #{invalid.inspect} as #{type}"
      assert_equal valid, @task.reload.custom_fields[field.id.to_s], "a rejected save leaves the old value"
    end
  end

  test "the error names the field and what it expects" do
    field = @workspace.task_fields.create!(name: "Estimate", data_type: "integer")
    @task.custom_fields = { field.id.to_s => "lots" }
    assert_not @task.save
    assert_equal [ "Estimate must be a whole number" ], @task.errors.full_messages
  end

  test "nil and an empty string clear a value" do
    field = @workspace.task_fields.create!(name: "Note", data_type: "text")
    @task.update!(custom_fields: { field.id.to_s => "hello" })
    assert_equal({ field.id.to_s => "hello" }, @task.reload.custom_fields)

    @task.update!(custom_fields: { field.id.to_s => "" })
    assert_equal({}, @task.reload.custom_fields)
    assert_equal 0, TaskFieldValue.count
  end

  test "values can be set when the task is created, and one bad value rejects the whole task" do
    field = @workspace.task_fields.create!(name: "Estimate", data_type: "integer")
    task = @workspace.tasks.build(title: "New", custom_fields: { field.id => 5 })
    assert task.save
    assert_equal({ field.id.to_s => 5 }, task.reload.custom_fields)

    bad = @workspace.tasks.build(title: "Bad", custom_fields: { field.id => "x" })
    assert_no_difference -> { Task.count } do
      assert_not bad.save
    end
  end

  test "a task only accepts fields from its own Space" do
    other = User.create!(name: "Bo", email: "task-field-other@example.com", password: "password123").workspace
    foreign = other.task_fields.create!(name: "Foreign", data_type: "text")
    @task.custom_fields = { foreign.id.to_s => "x", "999999" => "y" }
    assert_not @task.save
    assert_equal [ "Unknown custom field #{foreign.id}", "Unknown custom field 999999" ], @task.errors.full_messages

    value = TaskFieldValue.new(task: @task, task_field: foreign, value: "x")
    assert_not value.valid?
    assert_includes value.errors[:task_field], "must belong to the task's Space"
  end

  test "a task has one value per field" do
    field = @workspace.task_fields.create!(name: "Note", data_type: "text")
    @task.task_field_values.create!(task_field: field, value: "a")
    assert_not @task.task_field_values.build(task_field: field, value: "b").valid?
  end

  test "deleting a field deletes its values and deleting a task deletes its values" do
    a = @workspace.task_fields.create!(name: "A", data_type: "text")
    b = @workspace.task_fields.create!(name: "B", data_type: "text")
    other_task = @workspace.tasks.create!(title: "Other")
    @task.update!(custom_fields: { a.id.to_s => "1", b.id.to_s => "2" })
    other_task.update!(custom_fields: { a.id.to_s => "3" })

    a.destroy!
    assert_equal({ b.id.to_s => "2" }, @task.reload.custom_fields)
    assert_equal({}, other_task.reload.custom_fields)

    @task.destroy!
    assert_equal 0, TaskFieldValue.count
  end

  test "deleting a Space deletes its fields" do
    team = Workspace.create!(name: "Team", user: @user)
    field = team.task_fields.create!(name: "Note", data_type: "text")
    team.tasks.create!(title: "T", custom_fields: { field.id.to_s => "x" })
    assert_difference({ -> { TaskField.count } => -1, -> { TaskFieldValue.count } => -1 }) do
      team.destroy!
    end
  end
end
